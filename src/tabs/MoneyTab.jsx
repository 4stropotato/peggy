import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { moneyTracker } from '../data'
import { calculateTax } from '../taxCalc'
import { APP_ICONS, UiIcon } from '../uiIcons'
import WorkFinancePanel from '../components/WorkFinancePanel'

const YEN = '\u00A5'
const TAX_STEPS = [
  { id: 'income', label: '1. Income' },
  { id: 'deductions', label: '2. Deductions' },
  { id: 'result', label: '3. Result' },
]

const MEDICAL_PRESETS = [0, 50000, 100000, 200000, 300000]
const SOCIAL_PRESETS = [0, 300000, 500000, 700000]
const PERSON_LABELS = {
  naomi: 'Naomi',
  husband: 'Shinji',
}
const EXPENSE_CATEGORIES = [
  { id: 'bills', label: 'Bills' },
  { id: 'loan', label: 'Loan' },
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'grocery', label: 'Groceries' },
  { id: 'transport', label: 'Transport' },
  { id: 'medical', label: 'Medical' },
  { id: 'childcare', label: 'Childcare' },
  { id: 'extra', label: 'Extra' },
  { id: 'other', label: 'Other' },
]

function formatYen(value) {
  return `${YEN}${Number(value || 0).toLocaleString()}`
}

function normalizeBasis(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'hourly' || raw === 'daily' || raw === 'monthly') return raw
  return 'monthly'
}

function normalizePerson(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'shinji' || raw === 'husband' || raw === 'partner') return 'husband'
  if (raw === 'naomi' || raw === 'wife') return 'naomi'
  return raw || 'naomi'
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
  const target = normalizePerson(person)
  const nowStamp = now.getTime()
  const all = (Array.isArray(payRates) ? payRates : [])
    .filter(item => normalizePerson(item?.person) === target)
    .map(item => ({ ...item, __stamp: toDateStamp(item?.effectiveFrom) }))
    .sort((a, b) => b.__stamp - a.__stamp)
  if (!all.length) return null

  const active = all.find(item => item.__stamp <= nowStamp)
  return active || all[0]
}

function getRateForDate(payRates, person, dateISO) {
  const target = normalizePerson(person)
  const dayStamp = Date.parse(`${String(dateISO || '').trim()}T23:59:59`)
  const all = (Array.isArray(payRates) ? payRates : [])
    .filter(item => normalizePerson(item?.person) === target)
    .map(item => ({ ...item, __stamp: toDateStamp(item?.effectiveFrom) }))
    .sort((a, b) => b.__stamp - a.__stamp)
  if (!all.length) return null
  if (!Number.isFinite(dayStamp)) return all[0]
  const active = all.find(item => item.__stamp <= dayStamp)
  return active || all[0]
}

function getMonthKeyFromISO(dateISO) {
  const raw = String(dateISO || '').trim()
  if (!raw || raw.length < 7) return ''
  return raw.slice(0, 7)
}

function buildMonthlyIncomeMap(attendanceMap, payRates, person) {
  const monthly = {}
  const monthlyFixed = {}
  for (const [dateISO, record] of Object.entries(attendanceMap || {})) {
    if (!record?.worked) continue
    const monthKey = getMonthKeyFromISO(dateISO)
    if (!monthKey) continue
    const rate = getRateForDate(payRates, person, dateISO)
    if (!rate) continue
    const basis = normalizeBasis(rate.basis)
    const amount = Math.max(0, Number(rate.rate) || 0)

    if (basis === 'hourly') {
      const hours = Math.max(0, Number(record.hours) || 0)
      monthly[monthKey] = (monthly[monthKey] || 0) + (hours * amount)
      continue
    }
    if (basis === 'daily') {
      monthly[monthKey] = (monthly[monthKey] || 0) + amount
      continue
    }

    const stamp = toDateStamp(rate.effectiveFrom)
    const prev = monthlyFixed[monthKey]
    if (!prev || stamp > prev.stamp) {
      monthlyFixed[monthKey] = { value: amount, stamp }
    }
  }

  for (const [monthKey, meta] of Object.entries(monthlyFixed)) {
    monthly[monthKey] = (monthly[monthKey] || 0) + (Number(meta.value) || 0)
  }
  return monthly
}

function toMonthKey(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sumLastMonths(monthlyMap, months = 12, now = new Date()) {
  let total = 0
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = toMonthKey(d)
    total += Number(monthlyMap?.[key] || 0)
  }
  return Math.round(total)
}

function getRecentMonthKeys(count = 6, now = new Date()) {
  const out = []
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(toMonthKey(d))
  }
  return out
}

function shiftMonthKey(monthKey, deltaMonths = 0) {
  const raw = String(monthKey || '').trim()
  if (!raw || raw.length < 7) return ''
  const [y, m] = raw.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ''
  const d = new Date(y, (m - 1) + Number(deltaMonths || 0), 1)
  return toMonthKey(d)
}

function normalizePayrollProfile(profile, fallback = {}) {
  const source = profile && typeof profile === 'object' ? profile : {}
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {}
  const payModeRaw = String(source.payMode || fallbackSource.payMode || 'fixed_day').trim().toLowerCase()
  const payMode = payModeRaw === 'month_end' ? 'month_end' : 'fixed_day'
  const payDay = Math.min(31, Math.max(1, Number(source.payDay ?? fallbackSource.payDay ?? 15) || 15))
  const delayMonths = Math.min(3, Math.max(0, Number(source.delayMonths ?? fallbackSource.delayMonths ?? 0) || 0))
  const monthlyAdjustment = Number(source.monthlyAdjustment ?? fallbackSource.monthlyAdjustment ?? 0) || 0
  return { payMode, payDay, delayMonths, monthlyAdjustment }
}

function applyPayrollProfileToMonthlyMap(monthlyMap, profile, recentMonthKeys = []) {
  const normalized = normalizePayrollProfile(profile)
  const out = {}
  for (const [monthKey, value] of Object.entries(monthlyMap || {})) {
    const shiftedKey = shiftMonthKey(monthKey, normalized.delayMonths)
    if (!shiftedKey) continue
    out[shiftedKey] = (out[shiftedKey] || 0) + (Number(value) || 0)
  }

  if ((Number(normalized.monthlyAdjustment) || 0) !== 0) {
    const targets = Array.isArray(recentMonthKeys) ? recentMonthKeys : []
    for (const monthKey of targets) {
      out[monthKey] = (out[monthKey] || 0) + Number(normalized.monthlyAdjustment || 0)
    }
  }
  return out
}

function sumExpensesForMonths(expenseList, monthKeys) {
  if (!Array.isArray(expenseList) || !Array.isArray(monthKeys) || !monthKeys.length) return 0
  const target = new Set(monthKeys)
  return Math.round(expenseList.reduce((acc, item) => {
    const monthKey = getMonthKeyFromISO(item?.date)
    if (!target.has(monthKey)) return acc
    return acc + Math.max(0, Number(item?.amount) || 0)
  }, 0))
}

function getExpenseCategoryLabel(categoryId) {
  const id = String(categoryId || 'other').trim().toLowerCase()
  const found = EXPENSE_CATEGORIES.find(item => item.id === id)
  return found ? found.label : 'Other'
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
  const normalized = normalizePerson(personKey)
  if (normalized === 'naomi') return PERSON_LABELS.naomi
  if (normalized === 'husband') return PERSON_LABELS.husband
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
    attendance,
    husbandAttendance,
    familyConfig,
    financeConfig,
    setFinanceConfig,
    expenses,
    addExpense,
    removeExpense,
  } = useApp()
  const includeHusband = familyConfig?.includeHusband !== false

  const [subTab, setSubTab] = useState('benefits')
  const [workView, setWorkView] = useState('wife')
  const [summaryPeriod, setSummaryPeriod] = useState('annual')
  const [summaryMonthKey, setSummaryMonthKey] = useState(() => toMonthKey(new Date()))
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
  const [expenseForm, setExpenseForm] = useState(() => ({
    date: toIsoDate(),
    category: 'bills',
    amount: '',
    note: '',
  }))

  const totalMoney = moneyTracker.reduce((acc, item) => acc + item.amount, 0)
  const claimedMoney = moneyTracker
    .filter(item => moneyClaimed[item.id])
    .reduce((acc, item) => acc + item.amount, 0)

  useEffect(() => {
    if (!includeHusband && workView === 'husband') setWorkView('wife')
  }, [includeHusband, workView])

  const recentMonthKeys = useMemo(() => getRecentMonthKeys(6), [])
  const recentYearMonthKeys = useMemo(() => getRecentMonthKeys(12), [])
  const naomiPayrollProfile = useMemo(
    () => normalizePayrollProfile(financeConfig?.payrollProfiles?.naomi, { payMode: 'fixed_day', payDay: 15, delayMonths: 1, monthlyAdjustment: 0 }),
    [financeConfig]
  )
  const husbandPayrollProfile = useMemo(
    () => normalizePayrollProfile(financeConfig?.payrollProfiles?.husband, { payMode: 'month_end', payDay: 30, delayMonths: 1, monthlyAdjustment: 0 }),
    [financeConfig]
  )

  const currentNaomiRate = useMemo(() => getCurrentRateForPerson(payRates, 'naomi'), [payRates])
  const currentHusbandRate = useMemo(() => getCurrentRateForPerson(payRates, 'husband'), [payRates])
  const naomiWorkMonthlyIncomeMap = useMemo(
    () => buildMonthlyIncomeMap(attendance, payRates, 'naomi'),
    [attendance, payRates]
  )
  const husbandWorkMonthlyIncomeMap = useMemo(
    () => buildMonthlyIncomeMap(husbandAttendance, payRates, 'husband'),
    [husbandAttendance, payRates]
  )
  const naomiMonthlyIncomeMap = useMemo(
    () => applyPayrollProfileToMonthlyMap(naomiWorkMonthlyIncomeMap, naomiPayrollProfile, recentYearMonthKeys),
    [naomiWorkMonthlyIncomeMap, naomiPayrollProfile, recentYearMonthKeys]
  )
  const husbandMonthlyIncomeMap = useMemo(
    () => applyPayrollProfileToMonthlyMap(husbandWorkMonthlyIncomeMap, husbandPayrollProfile, recentYearMonthKeys),
    [husbandWorkMonthlyIncomeMap, husbandPayrollProfile, recentYearMonthKeys]
  )
  const naomiAnnualFromWork = useMemo(() => sumLastMonths(naomiMonthlyIncomeMap, 12), [naomiMonthlyIncomeMap])
  const husbandAnnualFromWork = useMemo(() => sumLastMonths(husbandMonthlyIncomeMap, 12), [husbandMonthlyIncomeMap])
  const naomiAnnualFallback = useMemo(
    () => Math.round(Math.max(0, estimateAnnualFromRate(currentNaomiRate) + (Number(naomiPayrollProfile.monthlyAdjustment || 0) * 12))),
    [currentNaomiRate, naomiPayrollProfile.monthlyAdjustment]
  )
  const husbandAnnualFallback = useMemo(
    () => Math.round(Math.max(0, estimateAnnualFromRate(currentHusbandRate) + (Number(husbandPayrollProfile.monthlyAdjustment || 0) * 12))),
    [currentHusbandRate, husbandPayrollProfile.monthlyAdjustment]
  )
  const estimatedNaomiAnnual = naomiAnnualFromWork > 0 ? naomiAnnualFromWork : naomiAnnualFallback
  const estimatedHusbandAnnual = husbandAnnualFromWork > 0 ? husbandAnnualFromWork : husbandAnnualFallback
  const selectedMonth = String(summaryMonthKey || '').trim() || toMonthKey(new Date())
  const selectedPeriodMonthKeys = summaryPeriod === 'monthly' ? [selectedMonth] : recentYearMonthKeys
  const selectedNaomiIncome = summaryPeriod === 'monthly'
    ? Math.round(Number(naomiMonthlyIncomeMap[selectedMonth] || 0))
    : estimatedNaomiAnnual
  const selectedHusbandIncome = summaryPeriod === 'monthly'
    ? Math.round(Number(husbandMonthlyIncomeMap[selectedMonth] || 0))
    : estimatedHusbandAnnual
  const selectedFamilyIncome = selectedNaomiIncome + (includeHusband ? selectedHusbandIncome : 0)
  const selectedExpensesTotal = useMemo(
    () => sumExpensesForMonths(expenses, selectedPeriodMonthKeys),
    [expenses, selectedPeriodMonthKeys]
  )
  const selectedFamilyNet = selectedFamilyIncome - selectedExpensesTotal
  const expenseItemsSorted = useMemo(
    () => [...(Array.isArray(expenses) ? expenses : [])]
      .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || ''))),
    [expenses]
  )

  const effectiveAnnualIncome = includeHusband
    ? (Number(taxInputs.annualIncome) || estimatedHusbandAnnual)
    : (Number(taxInputs.annualIncome) || estimatedNaomiAnnual)
  const effectiveSpouseIncome = includeHusband
    ? (Number(taxInputs.spouseIncome) || estimatedNaomiAnnual)
    : 0
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

  const updatePayrollProfile = (person, patch) => {
    const target = normalizePerson(person)
    setFinanceConfig(prev => {
      const safe = prev && typeof prev === 'object' ? prev : {}
      const payrollProfiles = safe.payrollProfiles && typeof safe.payrollProfiles === 'object'
        ? safe.payrollProfiles
        : {}
      const current = normalizePayrollProfile(payrollProfiles[target], target === 'husband'
        ? { payMode: 'month_end', payDay: 30, delayMonths: 1, monthlyAdjustment: 0 }
        : { payMode: 'fixed_day', payDay: 15, delayMonths: 1, monthlyAdjustment: 0 })
      return {
        ...safe,
        payrollProfiles: {
          ...payrollProfiles,
          [target]: {
            ...current,
            ...patch,
          },
        },
      }
    })
  }

  const updateExpenseForm = (field, value) => {
    setExpenseForm(prev => ({ ...prev, [field]: value }))
  }

  const applyTaxIncomeFromRates = () => {
    if (includeHusband) {
      if (estimatedHusbandAnnual > 0) updateTax('annualIncome', String(estimatedHusbandAnnual))
      if (estimatedNaomiAnnual > 0) updateTax('spouseIncome', String(estimatedNaomiAnnual))
      return
    }
    if (estimatedNaomiAnnual > 0) updateTax('annualIncome', String(estimatedNaomiAnnual))
    updateTax('spouseIncome', '')
  }

  const handleAddPayRate = (event) => {
    event.preventDefault()
    const rate = Math.max(0, Number(rateForm.rate) || 0)
    if (rate <= 0) return
    if (!String(rateForm.effectiveFrom || '').trim()) return

    addPayRate({
      person: normalizePerson(rateForm.person),
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

  const handleAddExpense = (event) => {
    event.preventDefault()
    const date = String(expenseForm.date || '').trim()
    const amount = Math.max(0, Number(expenseForm.amount) || 0)
    if (!date || amount <= 0) return
    addExpense({
      date,
      category: expenseForm.category,
      amount,
      note: expenseForm.note,
    })
    setExpenseForm(prev => ({
      ...prev,
      amount: '',
      note: '',
    }))
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['benefits', 'work', 'salary', 'tax'].map(tabId => (
          <button
            key={tabId}
            className={`glass-tab ${subTab === tabId ? 'active' : ''}`}
            onClick={() => setSubTab(tabId)}
          >
            <span className="tab-icon-label">
              <UiIcon icon={
                tabId === 'benefits'
                  ? APP_ICONS.benefits
                  : tabId === 'work'
                    ? APP_ICONS.work
                    : tabId === 'salary'
                      ? APP_ICONS.salary
                      : APP_ICONS.tax
              } />
              <span>
                {tabId === 'benefits'
                  ? 'Benefits'
                  : tabId === 'work'
                    ? 'Work'
                    : tabId === 'salary'
                      ? 'Salary'
                      : 'Tax Calc'}
              </span>
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
                      {moneyClaimed[item.id] ? '\u2713' : ''}
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

      {subTab === 'work' && (
        <>
          <div className="glass-tabs salary-mini-tabs">
            {['wife', includeHusband ? 'husband' : null].filter(Boolean).map(view => (
              <button
                key={view}
                className={`glass-tab ${workView === view ? 'active' : ''} ${view === 'husband' ? 'husband-tab' : ''}`}
                onClick={() => setWorkView(view)}
              >
                <span>{view === 'wife' ? `${PERSON_LABELS.naomi} Work` : `${PERSON_LABELS.husband} Work`}</span>
              </button>
            ))}
          </div>

          {workView === 'wife' && (
            <WorkFinancePanel
              personKey="naomi"
              title={`${PERSON_LABELS.naomi} Work`}
              accent="wife"
              allowGeoTracker={true}
            />
          )}

          {workView === 'husband' && includeHusband && (
            <WorkFinancePanel
              personKey="husband"
              title={`${PERSON_LABELS.husband} Work`}
              accent="husband"
              allowGeoTracker={false}
            />
          )}
        </>
      )}

      {subTab === 'salary' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.salary} /></span>
              <div>
                <h2>Salary Tracker</h2>
                <span className="section-count">Rates + family totals, separate from work logging</span>
              </div>
            </div>
            <div className="glass-inner summary-period-row">
              <div className="household-toggle-title">Summary Period</div>
              <div className="summary-period-controls">
                <button
                  type="button"
                  className={`tax-preset-btn glass-inner ${summaryPeriod === 'annual' ? 'active' : ''}`}
                  onClick={() => setSummaryPeriod('annual')}
                >
                  Annual
                </button>
                <button
                  type="button"
                  className={`tax-preset-btn glass-inner ${summaryPeriod === 'monthly' ? 'active' : ''}`}
                  onClick={() => setSummaryPeriod('monthly')}
                >
                  This Month
                </button>
              </div>
              {summaryPeriod === 'monthly' && (
                <div className="form-row summary-month-select">
                  <label>Month</label>
                  <select value={selectedMonth} onChange={e => setSummaryMonthKey(e.target.value)}>
                    {recentYearMonthKeys.map(monthKey => (
                      <option key={monthKey} value={monthKey}>{monthKey}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
              <div>
                <h2>Payroll Timing & Adjustments</h2>
                <span className="section-count">Shift work-month income into real payout months</span>
              </div>
            </div>

            <div className="salary-summary-grid">
              <div className="glass-card payroll-card">
                <h3>{PERSON_LABELS.naomi} Payroll</h3>
                <div className="salary-rate-grid">
                  <div className="form-row">
                    <label>Payday Type</label>
                    <select
                      value={naomiPayrollProfile.payMode}
                      onChange={e => updatePayrollProfile('naomi', { payMode: e.target.value === 'month_end' ? 'month_end' : 'fixed_day' })}
                    >
                      <option value="fixed_day">Fixed Day</option>
                      <option value="month_end">Month End</option>
                    </select>
                  </div>
                  {naomiPayrollProfile.payMode === 'fixed_day' && (
                    <div className="form-row">
                      <label>Payday (1-31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={naomiPayrollProfile.payDay}
                        onChange={e => updatePayrollProfile('naomi', { payDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                      />
                    </div>
                  )}
                  <div className="form-row">
                    <label>Work Month Delay</label>
                    <input
                      type="number"
                      min="0"
                      max="3"
                      value={naomiPayrollProfile.delayMonths}
                      onChange={e => updatePayrollProfile('naomi', { delayMonths: Math.min(3, Math.max(0, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Monthly Adjustment ({YEN})</label>
                    <input
                      type="number"
                      value={naomiPayrollProfile.monthlyAdjustment}
                      onChange={e => updatePayrollProfile('naomi', { monthlyAdjustment: Number(e.target.value) || 0 })}
                      placeholder="Use negative for advances/bale deductions"
                    />
                  </div>
                </div>
              </div>

              {includeHusband && (
                <div className="glass-card payroll-card husband-summary">
                  <h3>{PERSON_LABELS.husband} Payroll</h3>
                  <div className="salary-rate-grid">
                    <div className="form-row">
                      <label>Payday Type</label>
                      <select
                        value={husbandPayrollProfile.payMode}
                        onChange={e => updatePayrollProfile('husband', { payMode: e.target.value === 'month_end' ? 'month_end' : 'fixed_day' })}
                      >
                        <option value="fixed_day">Fixed Day</option>
                        <option value="month_end">Month End</option>
                      </select>
                    </div>
                    {husbandPayrollProfile.payMode === 'fixed_day' && (
                      <div className="form-row">
                        <label>Payday (1-31)</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={husbandPayrollProfile.payDay}
                          onChange={e => updatePayrollProfile('husband', { payDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                        />
                      </div>
                    )}
                    <div className="form-row">
                      <label>Work Month Delay</label>
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={husbandPayrollProfile.delayMonths}
                        onChange={e => updatePayrollProfile('husband', { delayMonths: Math.min(3, Math.max(0, Number(e.target.value) || 0)) })}
                      />
                    </div>
                    <div className="form-row">
                      <label>Monthly Adjustment ({YEN})</label>
                      <input
                        type="number"
                        value={husbandPayrollProfile.monthlyAdjustment}
                        onChange={e => updatePayrollProfile('husband', { monthlyAdjustment: Number(e.target.value) || 0 })}
                        placeholder="Use negative for deductions"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.salary} /></span>
              <div>
                <h2>Pay Rate Profiles</h2>
                <span className="section-count">Hourly / Daily / Monthly with effectivity</span>
              </div>
            </div>

            <form className="salary-rate-form glass-card" onSubmit={handleAddPayRate}>
              <div className="salary-rate-grid">
                <div className="form-row">
                  <label>Side</label>
                  <select value={rateForm.person} onChange={e => updateRateForm('person', e.target.value)}>
                    <option value="naomi">{PERSON_LABELS.naomi}</option>
                    <option value="husband">{PERSON_LABELS.husband}</option>
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
                  placeholder="e.g. rate increase in April"
                />
              </div>
              <button type="submit" className="btn-glass-primary">Save Rate</button>
            </form>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
              <div>
                <h2>Family Income Summary</h2>
                <span className="section-count">
                  {summaryPeriod === 'monthly' ? `Payout month: ${selectedMonth}` : 'Last 12 months'}
                </span>
              </div>
            </div>
            <div className="salary-summary-grid">
              <div className="glass-inner salary-summary-card">
                <div className="salary-person">{PERSON_LABELS.naomi}</div>
                <div className="salary-annual">
                  {formatYen(selectedNaomiIncome)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}
                </div>
                <div className="salary-assume">
                  {summaryPeriod === 'monthly'
                    ? 'Received amount in selected payout month'
                    : 'Last 12 months from attendance logs'}
                </div>
                {naomiAnnualFromWork <= 0 && currentNaomiRate && (
                  <div className="salary-assume">Fallback: {formatRateLabel(currentNaomiRate)}</div>
                )}
              </div>
              {includeHusband && (
                <div className="glass-inner salary-summary-card husband-summary">
                  <div className="salary-person">{PERSON_LABELS.husband}</div>
                  <div className="salary-annual">
                    {formatYen(selectedHusbandIncome)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}
                  </div>
                  <div className="salary-assume">
                    {summaryPeriod === 'monthly'
                      ? 'Received amount in selected payout month'
                      : 'Last 12 months from attendance logs'}
                  </div>
                  {husbandAnnualFromWork <= 0 && currentHusbandRate && (
                    <div className="salary-assume">Fallback: {formatRateLabel(currentHusbandRate)}</div>
                  )}
                </div>
              )}
            </div>
            <div className="glass-inner family-total-card">
              <span>Gross Family Total</span>
              <strong>{formatYen(selectedFamilyIncome)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}</strong>
            </div>
            <div className="glass-inner family-total-card finance-expense-total">
              <span>Tracked Expenses</span>
              <strong>- {formatYen(selectedExpensesTotal)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}</strong>
            </div>
            <div className="glass-inner family-total-card finance-net-total">
              <span>Net Family Total</span>
              <strong>{formatYen(selectedFamilyNet)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}</strong>
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.benefits} /></span>
              <div>
                <h2>Expense Tracker</h2>
                <span className="section-count">Bills, loans, groceries, credit card, extras</span>
              </div>
            </div>
            <form className="salary-rate-form glass-card" onSubmit={handleAddExpense}>
              <div className="salary-rate-grid">
                <div className="form-row">
                  <label>Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={e => updateExpenseForm('date', e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Category</label>
                  <select value={expenseForm.category} onChange={e => updateExpenseForm('category', e.target.value)}>
                    {EXPENSE_CATEGORIES.map(item => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>Amount ({YEN})</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={e => updateExpenseForm('amount', e.target.value)}
                    placeholder="e.g. 58000"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <label>Note (optional)</label>
                <input
                  type="text"
                  value={expenseForm.note}
                  onChange={e => updateExpenseForm('note', e.target.value)}
                  placeholder="e.g. rent, electric, grocery run"
                />
              </div>
              <button type="submit" className="btn-glass-primary">Add Expense</button>
            </form>

            {expenseItemsSorted.length > 0 ? (
              <ul className="salary-rate-list">
                {expenseItemsSorted.slice(0, 20).map(item => (
                  <li key={item.id} className="glass-card salary-rate-item expense-item">
                    <div className="salary-rate-top">
                      <span className="salary-rate-person">{item.date}</span>
                      <span className="salary-rate-basis">{getExpenseCategoryLabel(item.category)}</span>
                    </div>
                    <div className="salary-rate-main">- {formatYen(item.amount)}</div>
                    {item.note && <div className="salary-rate-note">{item.note}</div>}
                    <button type="button" className="btn-delete" onClick={() => removeExpense(item.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No expenses yet. Add your first bill or grocery expense above.</p>
            )}
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
              <div>
                <h2>Recent Monthly Income</h2>
                <span className="section-count">Payout-month view (with payroll delay/adjustments)</span>
              </div>
            </div>
            <div className="salary-month-table">
              {recentMonthKeys.map((monthKey) => {
                const wife = Math.round(Number(naomiMonthlyIncomeMap[monthKey] || 0))
                const husband = Math.round(Number(husbandMonthlyIncomeMap[monthKey] || 0))
                const total = wife + (includeHusband ? husband : 0)
                return (
                  <div key={monthKey} className="glass-inner salary-month-row">
                    <span>{monthKey}</span>
                    <span>{PERSON_LABELS.naomi}: {formatYen(wife)}</span>
                    {includeHusband && <span>{PERSON_LABELS.husband}: {formatYen(husband)}</span>}
                    <span>Total: {formatYen(total)}</span>
                  </div>
                )
              })}
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
                      <div className="salary-rate-annual">Rate-model annual: {formatYen(annual)}</div>
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
                    <label>{includeHusband ? `${PERSON_LABELS.husband} annual income (${YEN})` : `Primary annual income (${YEN})`}</label>
                    <input
                      type="number"
                      value={taxInputs.annualIncome}
                      onChange={e => updateTax('annualIncome', e.target.value)}
                      placeholder={effectiveAnnualIncome > 0 ? `Auto available: ${formatYen(effectiveAnnualIncome)}` : 'e.g. 5,000,000'}
                    />
                  </div>
                  {includeHusband && (
                    <div className="tax-field">
                      <label>{PERSON_LABELS.naomi} annual income ({YEN})</label>
                      <input
                        type="number"
                        value={taxInputs.spouseIncome}
                        onChange={e => updateTax('spouseIncome', e.target.value)}
                        placeholder={estimatedNaomiAnnual > 0 ? `Auto available: ${formatYen(estimatedNaomiAnnual)}` : 'e.g. 1,200,000'}
                      />
                    </div>
                  )}
                </div>

                <div className="tax-input-actions">
                  <button type="button" className="btn-glass-secondary" onClick={applyTaxIncomeFromRates}>
                    Use Work-Based Salary Estimates
                  </button>
                </div>

                <div className="glass-inner tax-feed-guide">
                  <div className="tax-feed-title">What to feed here</div>
                  <ul className="tax-feed-list">
                    <li>Annual income from work logs/rates or official salary slips</li>
                    <li>Medical receipts total for the year</li>
                    <li>Social insurance paid (if known)</li>
                  </ul>
                </div>

                {effectiveAnnualIncome <= 0 && (
                  <p className="section-note">Required: set primary annual income to continue.</p>
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
                  <span>{includeHusband ? PERSON_LABELS.husband : 'Primary'}: {formatYen(effectiveAnnualIncome)}</span>
                  {includeHusband && <span>{PERSON_LABELS.naomi}: {formatYen(effectiveSpouseIncome)}</span>}
                  <span>Family: {formatYen(effectiveAnnualIncome + effectiveSpouseIncome)}</span>
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


