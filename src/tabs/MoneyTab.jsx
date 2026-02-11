import { useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { moneyTracker } from '../data'
import { calculateTax } from '../taxCalc'
import { APP_ICONS, UiIcon } from '../uiIcons'

const YEN = '\u00A5'
const TAX_STEPS = [
  { id: 'income', label: '1. Income' },
  { id: 'deductions', label: '2. Deductions' },
  { id: 'result', label: '3. Result' },
]

const MEDICAL_PRESETS = [0, 50000, 100000, 200000, 300000]
const SOCIAL_PRESETS = [0, 300000, 500000, 700000]

function formatYen(value) {
  return `${YEN}${Number(value || 0).toLocaleString()}`
}

function normalizeBasis(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'hourly' || raw === 'daily' || raw === 'monthly') return raw
  return 'monthly'
}

function estimateAnnualFromRate(rateEntry) {
  if (!rateEntry || typeof rateEntry !== 'object') return 0
  const basis = normalizeBasis(rateEntry.basis)
  const rate = Math.max(0, Number(rateEntry.rate) || 0)
  const daysPerMonth = Math.max(1, Number(rateEntry.workDaysPerMonth) || 20)
  const hoursPerDay = Math.max(1, Number(rateEntry.hoursPerDay) || 8)
  if (basis === 'hourly') return Math.round(rate * hoursPerDay * daysPerMonth * 12)
  if (basis === 'daily') return Math.round(rate * daysPerMonth * 12)
  return Math.round(rate * 12)
}

function toDateStamp(value) {
  const raw = String(value || '').trim()
  if (!raw) return -1
  const stamp = Date.parse(`${raw}T00:00:00`)
  return Number.isFinite(stamp) ? stamp : -1
}

function getCurrentRateForPerson(payRates, person, now = new Date()) {
  const target = String(person || '').trim().toLowerCase()
  const nowStamp = now.getTime()
  const all = (Array.isArray(payRates) ? payRates : [])
    .filter(item => String(item?.person || '').trim().toLowerCase() === target)
    .map(item => ({ ...item, __stamp: toDateStamp(item?.effectiveFrom) }))
    .sort((a, b) => b.__stamp - a.__stamp)
  if (!all.length) return null

  const active = all.find(item => item.__stamp <= nowStamp)
  return active || all[0]
}

function getBasisLabel(basis) {
  if (basis === 'hourly') return 'Hourly'
  if (basis === 'daily') return 'Daily'
  return 'Monthly'
}

function formatRateLabel(item) {
  const basis = normalizeBasis(item?.basis)
  const rate = Math.max(0, Number(item?.rate) || 0)
  if (basis === 'hourly') return `${formatYen(rate)} / hour`
  if (basis === 'daily') return `${formatYen(rate)} / day`
  return `${formatYen(rate)} / month`
}

function formatAssumption(item) {
  const basis = normalizeBasis(item?.basis)
  const days = Math.max(1, Number(item?.workDaysPerMonth) || 20)
  const hours = Math.max(1, Number(item?.hoursPerDay) || 8)
  if (basis === 'hourly') return `${hours} hours/day x ${days} days/month`
  if (basis === 'daily') return `${days} days/month`
  return 'Fixed monthly rate'
}

function formatPerson(personKey) {
  if (String(personKey || '').toLowerCase() === 'naomi') return 'Naomi'
  if (String(personKey || '').toLowerCase() === 'shinji') return 'Shinji'
  return String(personKey || 'Other')
}

function toIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function MoneyTab() {
  const {
    moneyClaimed,
    toggleMoney,
    payRates,
    addPayRate,
    removePayRate,
    taxInputs,
    setTaxInputs,
  } = useApp()

  const [subTab, setSubTab] = useState('benefits')
  const [expandedItem, setExpandedItem] = useState(null)
  const [taxStepIndex, setTaxStepIndex] = useState(0)
  const [rateForm, setRateForm] = useState(() => ({
    person: 'naomi',
    basis: 'hourly',
    rate: '',
    effectiveFrom: toIsoDate(),
    hoursPerDay: '7.5',
    workDaysPerMonth: '20',
    note: '',
  }))

  const totalMoney = moneyTracker.reduce((acc, item) => acc + item.amount, 0)
  const claimedMoney = moneyTracker
    .filter(item => moneyClaimed[item.id])
    .reduce((acc, item) => acc + item.amount, 0)

  const currentNaomiRate = useMemo(() => getCurrentRateForPerson(payRates, 'naomi'), [payRates])
  const currentShinjiRate = useMemo(() => getCurrentRateForPerson(payRates, 'shinji'), [payRates])
  const estimatedNaomiAnnual = useMemo(() => estimateAnnualFromRate(currentNaomiRate), [currentNaomiRate])
  const estimatedShinjiAnnual = useMemo(() => estimateAnnualFromRate(currentShinjiRate), [currentShinjiRate])

  const effectiveAnnualIncome = Number(taxInputs.annualIncome) || estimatedShinjiAnnual
  const effectiveSpouseIncome = Number(taxInputs.spouseIncome) || estimatedNaomiAnnual
  const taxResult = calculateTax({
    annualIncome: effectiveAnnualIncome,
    spouseIncome: effectiveSpouseIncome,
    medicalExpenses: Number(taxInputs.medicalExpenses) || 0,
    socialInsurance: Number(taxInputs.socialInsurance) || 0,
  })

  const sortedRates = useMemo(
    () => [...(Array.isArray(payRates) ? payRates : [])]
      .sort((a, b) => toDateStamp(b?.effectiveFrom) - toDateStamp(a?.effectiveFrom)),
    [payRates]
  )

  const updateTax = (field, val) => setTaxInputs(prev => ({ ...prev, [field]: val }))
  const toggleExpand = (id, event) => {
    event.stopPropagation()
    setExpandedItem(prev => (prev === id ? null : id))
  }

  const canMoveToNextTaxStep = (() => {
    if (taxStepIndex === 0) return effectiveAnnualIncome > 0
    return true
  })()

  const updateRateForm = (field, value) => {
    setRateForm(prev => ({ ...prev, [field]: value }))
  }

  const applyTaxIncomeFromRates = () => {
    if (estimatedShinjiAnnual > 0) updateTax('annualIncome', String(estimatedShinjiAnnual))
    if (estimatedNaomiAnnual > 0) updateTax('spouseIncome', String(estimatedNaomiAnnual))
  }

  const handleAddPayRate = (event) => {
    event.preventDefault()
    const rate = Math.max(0, Number(rateForm.rate) || 0)
    if (rate <= 0) return
    if (!String(rateForm.effectiveFrom || '').trim()) return

    addPayRate({
      person: rateForm.person,
      basis: normalizeBasis(rateForm.basis),
      rate,
      effectiveFrom: rateForm.effectiveFrom,
      hoursPerDay: rateForm.basis === 'hourly' ? Math.max(1, Number(rateForm.hoursPerDay) || 8) : '',
      workDaysPerMonth: (rateForm.basis === 'hourly' || rateForm.basis === 'daily')
        ? Math.max(1, Number(rateForm.workDaysPerMonth) || 20)
        : '',
      note: String(rateForm.note || '').trim(),
    })

    setRateForm(prev => ({
      ...prev,
      rate: '',
      note: '',
    }))
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['benefits', 'salary', 'tax'].map(tabId => (
          <button
            key={tabId}
            className={`glass-tab ${subTab === tabId ? 'active' : ''}`}
            onClick={() => setSubTab(tabId)}
          >
            <span className="tab-icon-label">
              <UiIcon icon={tabId === 'benefits' ? APP_ICONS.benefits : tabId === 'salary' ? APP_ICONS.salary : APP_ICONS.tax} />
              <span>{tabId === 'benefits' ? 'Benefits' : tabId === 'salary' ? 'Salary' : 'Tax Calc'}</span>
            </span>
          </button>
        ))}
      </div>

      {subTab === 'benefits' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.benefits} /></span>
              <div>
                <h2>Finance Tracker</h2>
                <span className="section-count">{formatYen(claimedMoney)} / {formatYen(totalMoney)}</span>
              </div>
            </div>
            <p className="section-note">
              Tap checkbox to mark as claimed. Tap info for how to claim.
            </p>
            <ul>
              {moneyTracker.map(item => (
                <li key={item.id} className={`glass-card money-card ${moneyClaimed[item.id] ? 'done' : ''}`}>
                  <div className="money-card-top">
                    <span className="checkbox glass-inner" onClick={() => toggleMoney(item.id)}>
                      {moneyClaimed[item.id] ? '✓' : ''}
                    </span>
                    <span className={`item-text ${moneyClaimed[item.id] ? 'claimed' : ''}`}>{item.label}</span>
                    <span className="money-amount">{formatYen(item.amount)}</span>
                    <button className="info-btn glass-inner" onClick={(event) => toggleExpand(item.id, event)}>
                      {expandedItem === item.id ? 'Hide' : 'i'}
                    </button>
                  </div>

                  {expandedItem === item.id && item.howTo && (
                    <div className="money-detail">
                      <div className="detail-section">
                        <div className="detail-label">How to claim:</div>
                        <div className="detail-text">{item.howTo}</div>
                      </div>
                      {item.where && (
                        <div className="detail-section">
                          <div className="detail-label">Where:</div>
                          <div className="detail-text" style={{ whiteSpace: 'pre-line' }}>{item.where}</div>
                        </div>
                      )}
                      {item.bring && (
                        <div className="detail-section">
                          <div className="detail-label">What to bring:</div>
                          <div className="detail-text">{item.bring}</div>
                        </div>
                      )}
                      {item.deadline && (
                        <div className="detail-section">
                          <div className="detail-label">Deadline:</div>
                          <div className="detail-text deadline-text">{item.deadline}</div>
                        </div>
                      )}
                      {Array.isArray(item.phones) && item.phones.length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">Phone Numbers:</div>
                          <div className="task-phones">
                            {item.phones.map((phone, index) => (
                              <a key={index} href={`tel:${phone.number.replace(/-/g, '')}`} className="task-phone-link">
                                <span className="phone-icon"><UiIcon icon={APP_ICONS.phone} /></span>
                                <span className="phone-info">
                                  <span className="phone-label">{phone.label}</span>
                                  <span className="phone-number">{phone.number}</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.tax} /></span>
              <div><h2>18-Year Support Ceiling</h2></div>
            </div>
            <div className="ceiling-table">
              <div className="ceil-row glass-inner"><span>Direct cash at birth</span><span>{YEN}610K - 1.04M</span></div>
              <div className="ceil-row glass-inner"><span>Child allowance (2 kids, 18 years)</span><span>{YEN}3.54M - 4.68M</span></div>
              <div className="ceil-row glass-inner"><span>Cost savings (medical, education)</span><span>{YEN}3M - 5M+</span></div>
              <div className="ceil-row glass-inner"><span>Tax benefits over time</span><span>{YEN}500K - 1.5M</span></div>
              <div className="ceil-row total glass-inner"><span>Total Ceiling</span><span>{YEN}7.6M - 15.7M</span></div>
            </div>
          </section>
        </>
      )}

      {subTab === 'salary' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.salary} /></span>
              <div>
                <h2>Salary Tracker</h2>
                <span className="section-count">Hourly, Daily, Monthly + Rate Changes</span>
              </div>
            </div>
            <p className="section-note">
              Set effective rates per person. The latest active rate auto-feeds Tax Calc.
            </p>

            <form className="salary-rate-form glass-card" onSubmit={handleAddPayRate}>
              <div className="salary-rate-grid">
                <div className="form-row">
                  <label>Person</label>
                  <select value={rateForm.person} onChange={e => updateRateForm('person', e.target.value)}>
                    <option value="naomi">Naomi</option>
                    <option value="shinji">Shinji</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Basis</label>
                  <select value={rateForm.basis} onChange={e => updateRateForm('basis', e.target.value)}>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Rate ({YEN})</label>
                  <input
                    type="number"
                    value={rateForm.rate}
                    onChange={e => updateRateForm('rate', e.target.value)}
                    placeholder={rateForm.basis === 'hourly' ? 'e.g. 1350' : rateForm.basis === 'daily' ? 'e.g. 16000' : 'e.g. 350000'}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Effective From</label>
                  <input
                    type="date"
                    value={rateForm.effectiveFrom}
                    onChange={e => updateRateForm('effectiveFrom', e.target.value)}
                    required
                  />
                </div>
                {rateForm.basis === 'hourly' && (
                  <div className="form-row">
                    <label>Hours per Day</label>
                    <input
                      type="number"
                      step="0.25"
                      min="1"
                      max="24"
                      value={rateForm.hoursPerDay}
                      onChange={e => updateRateForm('hoursPerDay', e.target.value)}
                    />
                  </div>
                )}
                {(rateForm.basis === 'hourly' || rateForm.basis === 'daily') && (
                  <div className="form-row">
                    <label>Work Days per Month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={rateForm.workDaysPerMonth}
                      onChange={e => updateRateForm('workDaysPerMonth', e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="form-row">
                <label>Note (optional)</label>
                <input
                  type="text"
                  value={rateForm.note}
                  onChange={e => updateRateForm('note', e.target.value)}
                  placeholder="e.g. possible raise in April"
                />
              </div>
              <button type="submit" className="btn-glass-primary">Save Rate</button>
            </form>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
              <div>
                <h2>Current Annual Estimates</h2>
                <span className="section-count">Used by Tax Calc when fields are blank</span>
              </div>
            </div>
            <div className="salary-summary-grid">
              <div className="glass-inner salary-summary-card">
                <div className="salary-person">Naomi</div>
                {currentNaomiRate ? (
                  <>
                    <div className="salary-rate-main">{formatRateLabel(currentNaomiRate)}</div>
                    <div className="salary-assume">{formatAssumption(currentNaomiRate)}</div>
                    <div className="salary-annual">{formatYen(estimatedNaomiAnnual)} / year</div>
                  </>
                ) : (
                  <div className="salary-empty">No active rate yet</div>
                )}
              </div>
              <div className="glass-inner salary-summary-card">
                <div className="salary-person">Shinji</div>
                {currentShinjiRate ? (
                  <>
                    <div className="salary-rate-main">{formatRateLabel(currentShinjiRate)}</div>
                    <div className="salary-assume">{formatAssumption(currentShinjiRate)}</div>
                    <div className="salary-annual">{formatYen(estimatedShinjiAnnual)} / year</div>
                  </>
                ) : (
                  <div className="salary-empty">No active rate yet</div>
                )}
              </div>
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
              <div><h2>Rate History</h2></div>
            </div>
            {sortedRates.length > 0 ? (
              <ul className="salary-rate-list">
                {sortedRates.map((item) => {
                  const annual = estimateAnnualFromRate(item)
                  return (
                    <li key={item.id} className="glass-card salary-rate-item">
                      <div className="salary-rate-top">
                        <span className="salary-rate-person">{formatPerson(item.person)}</span>
                        <span className="salary-rate-basis">{getBasisLabel(normalizeBasis(item.basis))}</span>
                      </div>
                      <div className="salary-rate-main">{formatRateLabel(item)}</div>
                      <div className="salary-rate-meta">
                        <span>From {item.effectiveFrom}</span>
                        <span>{formatAssumption(item)}</span>
                      </div>
                      <div className="salary-rate-annual">Estimated annual: {formatYen(annual)}</div>
                      {item.note && <div className="salary-rate-note">{item.note}</div>}
                      <button type="button" className="btn-delete" onClick={() => removePayRate(item.id)}>Delete</button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="empty-state">No salary rates yet. Add one above.</p>
            )}
          </section>
        </>
      )}

      {subTab === 'tax' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.tax} /></span>
            <div>
              <h2>Japan Tax Calculator</h2>
              <span className="section-count">Guided flow (income -&gt; deductions -&gt; result)</span>
            </div>
          </div>
          <p className="section-note">
            Quick estimate only. Final filing values should come from official slips and receipts.
          </p>

          <div className="tax-tunnel-steps">
            {TAX_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`tax-step-chip glass-inner ${taxStepIndex === index ? 'active' : ''} ${taxStepIndex > index ? 'done' : ''}`}
                onClick={() => {
                  if (index <= taxStepIndex || effectiveAnnualIncome > 0) setTaxStepIndex(index)
                }}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="tax-step-card glass-card">
            {taxStepIndex === 0 && (
              <div className="tax-step-body">
                <h3>Income Inputs</h3>
                <div className="tax-form">
                  <div className="tax-field">
                    <label>Shinji annual income ({YEN})</label>
                    <input
                      type="number"
                      value={taxInputs.annualIncome}
                      onChange={e => updateTax('annualIncome', e.target.value)}
                      placeholder={estimatedShinjiAnnual > 0 ? `Auto available: ${formatYen(estimatedShinjiAnnual)}` : 'e.g. 5,000,000'}
                    />
                  </div>
                  <div className="tax-field">
                    <label>Naomi annual income ({YEN})</label>
                    <input
                      type="number"
                      value={taxInputs.spouseIncome}
                      onChange={e => updateTax('spouseIncome', e.target.value)}
                      placeholder={estimatedNaomiAnnual > 0 ? `Auto available: ${formatYen(estimatedNaomiAnnual)}` : 'e.g. 1,200,000'}
                    />
                  </div>
                </div>

                <div className="tax-input-actions">
                  <button type="button" className="btn-glass-secondary" onClick={applyTaxIncomeFromRates}>
                    Use Salary Tracker Estimates
                  </button>
                </div>

                <div className="glass-inner tax-feed-guide">
                  <div className="tax-feed-title">What to feed here</div>
                  <ul className="tax-feed-list">
                    <li>Gross annual income for Shinji and Naomi</li>
                    <li>Medical receipts total for the year</li>
                    <li>Social insurance paid (if known)</li>
                  </ul>
                </div>

                {effectiveAnnualIncome <= 0 && (
                  <p className="section-note">Required: set Shinji annual income (manual or from Salary Tracker) to continue.</p>
                )}
              </div>
            )}

            {taxStepIndex === 1 && (
              <div className="tax-step-body">
                <h3>Deductions Inputs</h3>
                <div className="tax-form">
                  <div className="tax-field">
                    <label>Medical expenses this year ({YEN})</label>
                    <input
                      type="number"
                      value={taxInputs.medicalExpenses}
                      onChange={e => updateTax('medicalExpenses', e.target.value)}
                      placeholder="e.g. 300,000"
                    />
                    <div className="tax-preset-row">
                      {MEDICAL_PRESETS.map(value => (
                        <button
                          key={`med-${value}`}
                          type="button"
                          className={`tax-preset-btn glass-inner ${Number(taxInputs.medicalExpenses) === value ? 'active' : ''}`}
                          onClick={() => updateTax('medicalExpenses', String(value))}
                        >
                          {value === 0 ? '0' : `${Math.round(value / 1000)}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tax-field">
                    <label>Social insurance paid ({YEN})</label>
                    <input
                      type="number"
                      value={taxInputs.socialInsurance}
                      onChange={e => updateTax('socialInsurance', e.target.value)}
                      placeholder="Leave blank for auto estimate"
                    />
                    <div className="tax-preset-row">
                      <button
                        type="button"
                        className={`tax-preset-btn glass-inner ${taxInputs.socialInsurance === '' ? 'active' : ''}`}
                        onClick={() => updateTax('socialInsurance', '')}
                      >
                        Auto
                      </button>
                      {SOCIAL_PRESETS.map(value => (
                        <button
                          key={`social-${value}`}
                          type="button"
                          className={`tax-preset-btn glass-inner ${Number(taxInputs.socialInsurance) === value ? 'active' : ''}`}
                          onClick={() => updateTax('socialInsurance', String(value))}
                        >
                          {value === 0 ? '0' : `${Math.round(value / 1000)}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {taxStepIndex === 2 && (
              <div className="tax-step-body">
                <h3>Estimated Result</h3>
                <div className="tax-summary-strip">
                  <span>Income: {formatYen(effectiveAnnualIncome)}</span>
                  <span>Spouse: {formatYen(effectiveSpouseIncome)}</span>
                  <span>Medical: {formatYen(Number(taxInputs.medicalExpenses) || 0)}</span>
                </div>
                <div className="tax-results">
                  <div className="tax-row"><span>Employment Income</span><span>{formatYen(taxResult.employmentIncome)}</span></div>
                  <div className="tax-row sub"><span>Deductions</span><span></span></div>
                  <div className="tax-row detail"><span>Basic deduction (kiso koujo)</span><span>-{formatYen(taxResult.deductions.basic)}</span></div>
                  <div className="tax-row detail"><span>Social insurance (shakai hoken)</span><span>-{formatYen(taxResult.deductions.socialInsurance)}</span></div>
                  {taxResult.deductions.spouse > 0 && (
                    <div className="tax-row detail"><span>Spouse deduction (haiguusha koujo)</span><span>-{formatYen(taxResult.deductions.spouse)}</span></div>
                  )}
                  {taxResult.deductions.medical > 0 && (
                    <div className="tax-row detail"><span>Medical deduction (iryouhi koujo)</span><span>-{formatYen(taxResult.deductions.medical)}</span></div>
                  )}
                  <div className="tax-row"><span>Taxable Income (kazei shotoku)</span><span>{formatYen(taxResult.taxableIncome)}</span></div>
                  <div className="tax-row"><span>Income Tax (shotokuzei)</span><span className="tax-amount">{formatYen(taxResult.incomeTax)}</span></div>
                  <div className="tax-row"><span>Resident Tax (juuminzei)</span><span className="tax-amount">{formatYen(taxResult.residentTax)}</span></div>
                  <div className="tax-row total"><span>Total Tax</span><span>{formatYen(taxResult.totalTax)}</span></div>
                  <div className="tax-row"><span>Effective Rate</span><span>{taxResult.effectiveRate}%</span></div>
                  <div className="tax-row highlight"><span>Monthly Take-Home</span><span>{formatYen(taxResult.monthlyTakeHome)}</span></div>
                  {taxResult.estimatedRefund > 0 && (
                    <div className="tax-row refund"><span>Estimated Medical Refund</span><span>{formatYen(taxResult.estimatedRefund)}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="tax-step-actions">
            <button
              type="button"
              className="btn-glass-secondary"
              onClick={() => setTaxStepIndex(prev => Math.max(0, prev - 1))}
              disabled={taxStepIndex === 0}
            >
              Back
            </button>
            {taxStepIndex < TAX_STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-glass-primary"
                onClick={() => {
                  if (!canMoveToNextTaxStep) return
                  setTaxStepIndex(prev => Math.min(TAX_STEPS.length - 1, prev + 1))
                }}
                disabled={!canMoveToNextTaxStep}
              >
                Next
              </button>
            ) : (
              <button type="button" className="btn-glass-primary" onClick={() => setTaxStepIndex(0)}>
                Start Over
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
