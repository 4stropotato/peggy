import { useState } from 'react'
import { useApp } from '../AppContext'
import { moneyTracker } from '../data'
import { calculateTax } from '../taxCalc'
import { APP_ICONS, UiIcon } from '../uiIcons'

export default function MoneyTab() {
  const { moneyClaimed, toggleMoney, salary, addSalary, removeSalary, taxInputs, setTaxInputs } = useApp()
  const [subTab, setSubTab] = useState('benefits')
  const [salaryMonth, setSalaryMonth] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [salaryMemo, setSalaryMemo] = useState('')
  const [expandedItem, setExpandedItem] = useState(null)

  const totalMoney = moneyTracker.reduce((acc, m) => acc + m.amount, 0)
  const claimedMoney = moneyTracker.filter(m => moneyClaimed[m.id]).reduce((acc, m) => acc + m.amount, 0)
  const salaryTotal = salary.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)

  const handleAddSalary = (e) => {
    e.preventDefault()
    if (!salaryMonth || !salaryAmount) return
    addSalary({ month: salaryMonth, amount: Number(salaryAmount), memo: salaryMemo })
    setSalaryMonth('')
    setSalaryAmount('')
    setSalaryMemo('')
  }

  const taxResult = calculateTax({
    annualIncome: Number(taxInputs.annualIncome) || 0,
    spouseIncome: Number(taxInputs.spouseIncome) || salaryTotal,
    medicalExpenses: Number(taxInputs.medicalExpenses) || 0,
    socialInsurance: Number(taxInputs.socialInsurance) || 0
  })

  const updateTax = (field, val) => setTaxInputs(prev => ({ ...prev, [field]: val }))

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedItem(prev => prev === id ? null : id)
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['benefits', 'salary', 'tax'].map(t => (
          <button key={t} className={`glass-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>
            <span className="tab-icon-label">
              <UiIcon icon={t === 'benefits' ? APP_ICONS.benefits : t === 'salary' ? APP_ICONS.salary : APP_ICONS.tax} />
              <span>{t === 'benefits' ? 'Benefits' : t === 'salary' ? 'Salary' : 'Tax Calc'}</span>
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
                <h2>Money Tracker</h2>
                <span className="section-count">
                  ¥{claimedMoney.toLocaleString()} / ¥{totalMoney.toLocaleString()}
                </span>
              </div>
            </div>
            <p className="section-note">
              Tap checkbox to mark as claimed. Tap info button for HOW to claim. All amounts are estimates - actual may vary.
            </p>
            <ul>
              {moneyTracker.map(m => (
                <li key={m.id} className={`glass-card money-card ${moneyClaimed[m.id] ? 'done' : ''}`}>
                  <div className="money-card-top">
                    <span className="checkbox glass-inner" onClick={() => toggleMoney(m.id)}>
                      {moneyClaimed[m.id] ? '✓' : ''}
                    </span>
                    <span className={`item-text ${moneyClaimed[m.id] ? 'claimed' : ''}`}>{m.label}</span>
                    <span className="money-amount">¥{m.amount.toLocaleString()}</span>
                    <button className="info-btn glass-inner" onClick={(e) => toggleExpand(m.id, e)}>
                      {expandedItem === m.id ? '▲' : 'i'}
                    </button>
                  </div>

                  {expandedItem === m.id && m.howTo && (
                    <div className="money-detail">
                      <div className="detail-section">
                        <div className="detail-label">How to claim:</div>
                        <div className="detail-text">{m.howTo}</div>
                      </div>
                      {m.where && (
                        <div className="detail-section">
                          <div className="detail-label">Where:</div>
                          <div className="detail-text" style={{whiteSpace:'pre-line'}}>{m.where}</div>
                        </div>
                      )}
                      {m.bring && (
                        <div className="detail-section">
                          <div className="detail-label">What to bring:</div>
                          <div className="detail-text">{m.bring}</div>
                        </div>
                      )}
                      {m.deadline && (
                        <div className="detail-section">
                          <div className="detail-label">Deadline:</div>
                          <div className="detail-text deadline-text">{m.deadline}</div>
                        </div>
                      )}

                      {m.phones && m.phones.length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">Phone Numbers:</div>
                          <div className="task-phones">
                            {m.phones.map((p, i) => (
                              <a key={i} href={`tel:${p.number.replace(/-/g, '')}`} className="task-phone-link">
                                <span className="phone-icon"><UiIcon icon={APP_ICONS.phone} /></span>
                                <span className="phone-info">
                                  <span className="phone-label">{p.label}</span>
                                  <span className="phone-number">{p.number}</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {m.tip && (
                        <div className="detail-section detail-tip">
                          <div className="detail-label">Tip:</div>
                          <div className="detail-text">{m.tip}</div>
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
              <div className="ceil-row glass-inner"><span>Child Allowance (2 kids, 18 yrs)</span><span>¥3.54M - 4.68M</span></div>
              <div className="ceil-row glass-inner"><span>Cost savings (medical, education)</span><span>¥3M - 5M+</span></div>
              <div className="ceil-row glass-inner"><span>Tax benefits over time</span><span>¥500K - 1.5M</span></div>
              <div className="ceil-row total glass-inner"><span>TOTAL CEILING</span><span>¥7.6M - 15.7M</span></div>
            </div>
          </section>
        </>
      )}

      {subTab === 'salary' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.salary} /></span>
            <div>
              <h2>Naomi's Salary Tracker</h2>
              <span className="section-count">Total: ¥{salaryTotal.toLocaleString()}</span>
            </div>
          </div>
          <p className="section-note">Track monthly income. Auto-feeds into tax calculator as spouse income.</p>

          <form className="salary-form glass-card" onSubmit={handleAddSalary}>
            <input type="month" value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)} required />
            <input type="number" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="Amount (¥)" required />
            <input type="text" value={salaryMemo} onChange={e => setSalaryMemo(e.target.value)} placeholder="Memo (optional)" />
            <button type="submit" className="btn-glass-primary">Add</button>
          </form>

          {salary.length > 0 ? (
            <ul className="salary-list">
              {[...salary].sort((a, b) => b.month.localeCompare(a.month)).map(s => (
                <li key={s.id} className="glass-card salary-entry">
                  <div className="salary-info">
                    <span className="salary-month">{s.month}</span>
                    <span className="salary-amount">¥{Number(s.amount).toLocaleString()}</span>
                  </div>
                  {s.memo && <div className="salary-memo">{s.memo}</div>}
                  <button className="btn-delete" onClick={() => removeSalary(s.id)}>×</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No salary entries yet. Add one above!</p>
          )}
        </section>
      )}

      {subTab === 'tax' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.tax} /></span>
            <div>
              <h2>Japan Tax Calculator</h2>
              <span className="section-count">Estimate your tax & refund</span>
            </div>
          </div>
          <p className="section-note">
            Includes progressive income tax, juuminzei (住民税 / juuminzei) 10%, social insurance ~15%,
            iryouhi koujo (医療費控除 / iryouhi koujo), and haiguusha koujo (配偶者控除 / haiguusha koujo).
          </p>

          <div className="tax-form glass-card">
            <div className="tax-field">
              <label>Shinji's Annual Income (¥)</label>
              <input type="number" value={taxInputs.annualIncome} onChange={e => updateTax('annualIncome', e.target.value)} placeholder="e.g. 5000000" />
            </div>
            <div className="tax-field">
              <label>Naomi's Annual Income (¥)</label>
              <input type="number" value={taxInputs.spouseIncome || salaryTotal || ''} onChange={e => updateTax('spouseIncome', e.target.value)} placeholder={salaryTotal ? `Auto: ¥${salaryTotal.toLocaleString()}` : 'e.g. 1000000'} />
              {salaryTotal > 0 && !taxInputs.spouseIncome && <span className="tax-auto">Auto-filled from salary tracker</span>}
            </div>
            <div className="tax-field">
              <label>Medical Expenses This Year (¥)</label>
              <input type="number" value={taxInputs.medicalExpenses} onChange={e => updateTax('medicalExpenses', e.target.value)} placeholder="e.g. 300000" />
            </div>
            <div className="tax-field">
              <label>Social Insurance Paid (¥, leave blank for estimate)</label>
              <input type="number" value={taxInputs.socialInsurance} onChange={e => updateTax('socialInsurance', e.target.value)} placeholder="Auto-estimated at 15%" />
            </div>
          </div>

          {Number(taxInputs.annualIncome) > 0 && (
            <div className="tax-results glass-card">
              <h3>Results</h3>
              <div className="tax-row"><span>Employment Income</span><span>¥{taxResult.employmentIncome.toLocaleString()}</span></div>
              <div className="tax-row sub"><span>Deductions</span><span></span></div>
              <div className="tax-row detail"><span>Basic deduction (kiso koujo / 基礎控除)</span><span>-¥{taxResult.deductions.basic.toLocaleString()}</span></div>
              <div className="tax-row detail"><span>Social insurance (shakai hoken / 社会保険)</span><span>-¥{taxResult.deductions.socialInsurance.toLocaleString()}</span></div>
              {taxResult.deductions.spouse > 0 && (
                <div className="tax-row detail"><span>Spouse deduction (haiguusha koujo / 配偶者控除)</span><span>-¥{taxResult.deductions.spouse.toLocaleString()}</span></div>
              )}
              {taxResult.deductions.medical > 0 && (
                <div className="tax-row detail"><span>Medical deduction (iryouhi koujo / 医療費控除)</span><span>-¥{taxResult.deductions.medical.toLocaleString()}</span></div>
              )}
              <div className="tax-row"><span>Taxable Income (kazei shotoku / 課税所得)</span><span>¥{taxResult.taxableIncome.toLocaleString()}</span></div>
              <div className="tax-row"><span>Income Tax (shotokuzei / 所得税)</span><span className="tax-amount">¥{taxResult.incomeTax.toLocaleString()}</span></div>
              <div className="tax-row"><span>Resident Tax (juuminzei / 住民税)</span><span className="tax-amount">¥{taxResult.residentTax.toLocaleString()}</span></div>
              <div className="tax-row total"><span>Total Tax</span><span>¥{taxResult.totalTax.toLocaleString()}</span></div>
              <div className="tax-row"><span>Effective Rate</span><span>{taxResult.effectiveRate}%</span></div>
              <div className="tax-row highlight"><span>Monthly Take-Home</span><span>¥{taxResult.monthlyTakeHome.toLocaleString()}</span></div>
              {taxResult.estimatedRefund > 0 && (
                <div className="tax-row refund"><span>Estimated Medical Refund</span><span>¥{taxResult.estimatedRefund.toLocaleString()}</span></div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
