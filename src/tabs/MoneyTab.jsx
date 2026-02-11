import { useState } from 'react'
import { useApp } from '../AppContext'
import { moneyTracker } from '../data'
import { calculateTax } from '../taxCalc'
import { APP_ICONS, UiIcon } from '../uiIcons'

const TAX_STEPS = [
  { id: 'income', label: '1. Income' },
  { id: 'deductions', label: '2. Deductions' },
  { id: 'result', label: '3. Result' },
]

const MEDICAL_PRESETS = [0, 50000, 100000, 200000, 300000]
const SOCIAL_PRESETS = [0, 300000, 500000, 700000]

function formatYen(value) {
  return `¥${Number(value || 0).toLocaleString()}`
}

export default function MoneyTab() {
  const { moneyClaimed, toggleMoney, salary, taxInputs, setTaxInputs } = useApp()
  const [subTab, setSubTab] = useState('benefits')
  const [expandedItem, setExpandedItem] = useState(null)
  const [taxStepIndex, setTaxStepIndex] = useState(0)

  const totalMoney = moneyTracker.reduce((acc, item) => acc + item.amount, 0)
  const claimedMoney = moneyTracker
    .filter(item => moneyClaimed[item.id])
    .reduce((acc, item) => acc + item.amount, 0)
  const salaryTotal = salary.reduce((acc, entry) => acc + (Number(entry.amount) || 0), 0)

  const effectiveSpouseIncome = Number(taxInputs.spouseIncome) || salaryTotal
  const taxResult = calculateTax({
    annualIncome: Number(taxInputs.annualIncome) || 0,
    spouseIncome: effectiveSpouseIncome,
    medicalExpenses: Number(taxInputs.medicalExpenses) || 0,
    socialInsurance: Number(taxInputs.socialInsurance) || 0,
  })

  const updateTax = (field, val) => setTaxInputs(prev => ({ ...prev, [field]: val }))

  const toggleExpand = (id, event) => {
    event.stopPropagation()
    setExpandedItem(prev => (prev === id ? null : id))
  }

  const canMoveToNextTaxStep = (() => {
    if (taxStepIndex === 0) return Number(taxInputs.annualIncome) > 0
    return true
  })()

  const goToPrevTaxStep = () => {
    setTaxStepIndex(prev => Math.max(0, prev - 1))
  }

  const goToNextTaxStep = () => {
    if (!canMoveToNextTaxStep) return
    setTaxStepIndex(prev => Math.min(TAX_STEPS.length - 1, prev + 1))
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['benefits', 'tax'].map(tabId => (
          <button
            key={tabId}
            className={`glass-tab ${subTab === tabId ? 'active' : ''}`}
            onClick={() => setSubTab(tabId)}
          >
            <span className="tab-icon-label">
              <UiIcon icon={tabId === 'benefits' ? APP_ICONS.benefits : APP_ICONS.tax} />
              <span>{tabId === 'benefits' ? 'Benefits' : 'Tax Calc'}</span>
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
                <span className="section-count">
                  {formatYen(claimedMoney)} / {formatYen(totalMoney)}
                </span>
              </div>
            </div>
            <p className="section-note">
              Tap checkbox to mark as claimed. Tap info for HOW to claim. Amounts are estimates only.
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
                      {expandedItem === item.id ? '▲' : 'i'}
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

                      {item.tip && (
                        <div className="detail-section detail-tip">
                          <div className="detail-label">Tip:</div>
                          <div className="detail-text">{item.tip}</div>
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
              <div className="ceil-row glass-inner"><span>Direct cash at birth</span><span>¥610K - 1.04M</span></div>
              <div className="ceil-row glass-inner"><span>Child allowance (2 kids, 18 years)</span><span>¥3.54M - 4.68M</span></div>
              <div className="ceil-row glass-inner"><span>Cost savings (medical, education)</span><span>¥3M - 5M+</span></div>
              <div className="ceil-row glass-inner"><span>Tax benefits over time</span><span>¥500K - 1.5M</span></div>
              <div className="ceil-row total glass-inner"><span>TOTAL CEILING</span><span>¥7.6M - 15.7M</span></div>
            </div>
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
            Step-by-step estimate for income tax + resident tax + medical deduction effects. This is guidance, not official filing output.
          </p>

          <div className="tax-tunnel-steps">
            {TAX_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`tax-step-chip glass-inner ${taxStepIndex === index ? 'active' : ''} ${taxStepIndex > index ? 'done' : ''}`}
                onClick={() => {
                  if (index <= taxStepIndex || Number(taxInputs.annualIncome) > 0) {
                    setTaxStepIndex(index)
                  }
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
                    <label>Shinji annual income (¥)</label>
                    <input
                      type="number"
                      value={taxInputs.annualIncome}
                      onChange={e => updateTax('annualIncome', e.target.value)}
                      placeholder="e.g. 5,000,000"
                    />
                  </div>
                  <div className="tax-field">
                    <label>Naomi annual income (¥)</label>
                    <input
                      type="number"
                      value={taxInputs.spouseIncome || salaryTotal || ''}
                      onChange={e => updateTax('spouseIncome', e.target.value)}
                      placeholder={salaryTotal ? `Auto: ${formatYen(salaryTotal)}` : 'e.g. 1,200,000'}
                    />
                    {salaryTotal > 0 && !taxInputs.spouseIncome && (
                      <span className="tax-auto">Auto-filled from Work salary tracker</span>
                    )}
                  </div>
                </div>
                {Number(taxInputs.annualIncome) <= 0 && (
                  <p className="section-note">Required: set Shinji annual income first to continue.</p>
                )}
              </div>
            )}

            {taxStepIndex === 1 && (
              <div className="tax-step-body">
                <h3>Deductions Inputs</h3>
                <div className="tax-form">
                  <div className="tax-field">
                    <label>Medical expenses this year (¥)</label>
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
                    <label>Social insurance paid (¥)</label>
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
                  <span>Income: {formatYen(Number(taxInputs.annualIncome) || 0)}</span>
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
              onClick={goToPrevTaxStep}
              disabled={taxStepIndex === 0}
            >
              Back
            </button>
            {taxStepIndex < TAX_STEPS.length - 1 ? (
              <button
                type="button"
                className="btn-glass-primary"
                onClick={goToNextTaxStep}
                disabled={!canMoveToNextTaxStep}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn-glass-primary"
                onClick={() => setTaxStepIndex(0)}
              >
                Start Over
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
