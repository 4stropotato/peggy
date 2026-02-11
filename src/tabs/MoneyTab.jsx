import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { moneyTracker, phases } from '../data'
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

const BENEFIT_SOURCE_BY_ID = {
  m1: 'kawasaki',
  m2: 'kawasaki',
  m3: 'national',
  m4: 'national',
  m5: 'kawasaki',
  m6: 'national',
  m7: 'employer',
  m8: 'national',
  m9: 'national',
  m10: 'kawasaki',
  m11: 'employer',
  m12: 'employer',
  m13: 'employer',
  m14: 'kawasaki',
  m15: 'kawasaki',
  m16: 'kawasaki',
}

const BENEFIT_TIMING_HINT_BY_ID = {
  m1: 'Pregnancy registration day (ward office)',
  m2: 'As early as possible in pregnancy',
  m3: 'Before due month window',
  m4: 'Before delivery (hospital paperwork)',
  m5: 'Right after birth registration',
  m6: 'After delivery invoice is finalized',
  m7: 'During pregnancy and right after birth',
  m8: 'Within 15 days after birth',
  m9: 'Feb-March tax filing period',
  m10: 'During ward visits and annual check-ins',
  m11: 'Before maternity leave starts',
  m12: 'Before childcare leave starts',
  m13: 'Before first childcare leave payroll month',
  m14: "After baby's insurance card is issued",
  m15: 'When Kawasaki announces yearly campaign window',
  m16: 'During pregnancy/postpartum insurance consultation',
}

const BENEFIT_BATCH_HINT_BY_ID = {
  m1: 'Do together with Boshi Techo visit and voucher pickup.',
  m2: 'Do together with pregnancy registration and support consultation.',
  m5: 'Bundle with birth registration + child allowance + baby insurance.',
  m8: 'Bundle with birth registration visit to avoid lost months.',
  m10: 'Ask this at every ward office visit so no missed campaigns.',
  m11: 'Ask HR at same time as maternity leave paperwork.',
  m12: 'Ask HR at same time as childcare leave paperwork.',
  m13: 'Confirm together with childcare leave setup in payroll.',
  m14: "Apply right after baby's insurance card processing.",
  m15: 'Check together with municipal baby gift and annual program checks.',
  m16: 'Ask at insurance counter while handling other kokuho procedures.',
}

function formatYen(value) {
  return `${YEN}${Number(value || 0).toLocaleString()}`
}

function formatHoursAndMinutes(value) {
  const safe = Math.max(0, Number(value) || 0)
  const hours = Math.floor(safe)
  const minutes = Math.round((safe - hours) * 60)
  if (minutes <= 0) return `${hours}h`
  if (minutes >= 60) return `${hours + 1}h`
  return `${hours}h ${minutes}m`
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

function toDateStamp(value) {
  const raw = String(value || '').trim()
  if (!raw) return -1
  const stamp = Date.parse(`${raw}T00:00:00`)
  return Number.isFinite(stamp) ? stamp : -1
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

function buildMonthlyIncomeDetails(attendanceMap, payRates, person) {
  const monthly = {}
  const monthlyFixed = {}
  const missingRateDates = []
  const countedWorkedDates = []
  for (const [dateISO, record] of Object.entries(attendanceMap || {})) {
    if (!record?.worked) continue
    const monthKey = getMonthKeyFromISO(dateISO)
    if (!monthKey) continue
    const rate = getRateForDate(payRates, person, dateISO)
    if (!rate) {
      missingRateDates.push(dateISO)
      continue
    }
    const basis = normalizeBasis(rate.basis)
    const amount = Math.max(0, Number(rate.rate) || 0)
    if (amount <= 0) {
      missingRateDates.push(dateISO)
      continue
    }
    countedWorkedDates.push(dateISO)

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
  return {
    monthly,
    missingRateDates,
    missingRateDays: missingRateDates.length,
    countedWorkedDays: countedWorkedDates.length,
  }
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
  const delayMonths = Math.min(3, Math.max(0, Number(source.delayMonths ?? fallbackSource.delayMonths ?? 0) || 0))
  const monthlyAdjustment = Number(source.monthlyAdjustment ?? fallbackSource.monthlyAdjustment ?? 0) || 0
  return { delayMonths, monthlyAdjustment }
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
      if (!Object.prototype.hasOwnProperty.call(out, monthKey)) continue
      out[monthKey] = (out[monthKey] || 0) + Number(normalized.monthlyAdjustment || 0)
    }
  }
  return out
}

function summarizeAttendanceForMonths(attendanceMap, monthKeys) {
  const targets = new Set(Array.isArray(monthKeys) ? monthKeys : [])
  let daysWorked = 0
  let hoursWorked = 0
  for (const [dateISO, record] of Object.entries(attendanceMap || {})) {
    if (!record?.worked) continue
    const monthKey = getMonthKeyFromISO(dateISO)
    if (!targets.has(monthKey)) continue
    daysWorked += 1
    hoursWorked += Math.max(0, Number(record?.hours) || 0)
  }
  return {
    daysWorked,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
  }
}

function countDatesInMonths(dateList, monthKeys) {
  const targets = new Set(Array.isArray(monthKeys) ? monthKeys : [])
  return (Array.isArray(dateList) ? dateList : []).reduce((acc, dateISO) => {
    const monthKey = getMonthKeyFromISO(dateISO)
    if (!targets.has(monthKey)) return acc
    return acc + 1
  }, 0)
}

function buildMonthCountMap(dateList) {
  const out = {}
  for (const dateISO of Array.isArray(dateList) ? dateList : []) {
    const monthKey = getMonthKeyFromISO(dateISO)
    if (!monthKey) continue
    out[monthKey] = (out[monthKey] || 0) + 1
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
  if (basis === 'hourly') return 'Attendance-based (logged hours x hourly rate)'
  if (basis === 'daily') return 'Attendance-based (worked day x daily rate)'
  return 'Monthly payout when month has at least one worked day log'
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
    addPlan,
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
  const safePayRates = useMemo(
    () => (Array.isArray(payRates) ? payRates.filter(item => item && typeof item === 'object') : []),
    [payRates]
  )
  const safeExpenses = useMemo(
    () => (Array.isArray(expenses) ? expenses.filter(item => item && typeof item === 'object') : []),
    [expenses]
  )

  const [subTab, setSubTab] = useState('benefits')
  const [benefitSourceFilter, setBenefitSourceFilter] = useState('all')
  const [workView, setWorkView] = useState('wife')
  const [summaryPeriod, setSummaryPeriod] = useState('annual')
  const [summaryMonthKey, setSummaryMonthKey] = useState(() => toMonthKey(new Date()))
  const [expandedItem, setExpandedItem] = useState(null)
  const [taxStepIndex, setTaxStepIndex] = useState(0)
  const [salarySetupOpen, setSalarySetupOpen] = useState(false)
  const [salarySetupTab, setSalarySetupTab] = useState('rates')
  const [recentIncomeMode, setRecentIncomeMode] = useState('work')
  const [rateForm, setRateForm] = useState(() => ({
    person: 'naomi',
    basis: 'hourly',
    rate: '',
    effectiveFrom: toIsoDate(),
    note: '',
  }))
  const [expenseForm, setExpenseForm] = useState(() => ({
    date: toIsoDate(),
    category: 'bills',
    amount: '',
    note: '',
    addToCalendar: true,
    planTime: '',
  }))

  const totalMoney = moneyTracker.reduce((acc, item) => acc + item.amount, 0)
  const claimedMoney = moneyTracker
    .filter(item => moneyClaimed[item.id])
    .reduce((acc, item) => acc + item.amount, 0)
  const benefitTasksById = useMemo(() => {
    const map = {}
    phases.forEach((phase) => {
      phase.items.forEach((task) => {
        const moneyIds = Array.isArray(task.moneyIds) ? task.moneyIds : []
        moneyIds.forEach((moneyId) => {
          if (!map[moneyId]) map[moneyId] = []
          map[moneyId].push({
            id: task.id,
            text: task.text,
            phaseTitle: phase.title,
          })
        })
      })
    })
    return map
  }, [])
  const filteredMoneyTracker = useMemo(() => {
    if (benefitSourceFilter === 'all') return moneyTracker
    return moneyTracker.filter((item) => (BENEFIT_SOURCE_BY_ID[item.id] || 'kawasaki') === benefitSourceFilter)
  }, [benefitSourceFilter])
  const visibleMoneyTotal = useMemo(
    () => filteredMoneyTracker.reduce((acc, item) => acc + item.amount, 0),
    [filteredMoneyTracker]
  )
  const visibleClaimedMoney = useMemo(
    () => filteredMoneyTracker.filter((item) => moneyClaimed[item.id]).reduce((acc, item) => acc + item.amount, 0),
    [filteredMoneyTracker, moneyClaimed]
  )

  useEffect(() => {
    if (!includeHusband && workView === 'husband') setWorkView('wife')
  }, [includeHusband, workView])

  const recentMonthKeys = useMemo(() => getRecentMonthKeys(6), [])
  const recentYearMonthKeys = useMemo(() => getRecentMonthKeys(12), [])
  const naomiPayrollProfile = useMemo(
    () => normalizePayrollProfile(financeConfig?.payrollProfiles?.naomi, { delayMonths: 1, monthlyAdjustment: 0 }),
    [financeConfig]
  )
  const husbandPayrollProfile = useMemo(
    () => normalizePayrollProfile(financeConfig?.payrollProfiles?.husband, { delayMonths: 1, monthlyAdjustment: 0 }),
    [financeConfig]
  )

  const naomiIncomeDetails = useMemo(
    () => buildMonthlyIncomeDetails(attendance, safePayRates, 'naomi'),
    [attendance, safePayRates]
  )
  const husbandIncomeDetails = useMemo(
    () => buildMonthlyIncomeDetails(husbandAttendance, safePayRates, 'husband'),
    [husbandAttendance, safePayRates]
  )
  const naomiWorkMonthlyIncomeMap = naomiIncomeDetails.monthly
  const husbandWorkMonthlyIncomeMap = husbandIncomeDetails.monthly
  const naomiMonthlyIncomeMap = useMemo(
    () => applyPayrollProfileToMonthlyMap(naomiWorkMonthlyIncomeMap, naomiPayrollProfile, recentYearMonthKeys),
    [naomiWorkMonthlyIncomeMap, naomiPayrollProfile, recentYearMonthKeys]
  )
  const husbandMonthlyIncomeMap = useMemo(
    () => applyPayrollProfileToMonthlyMap(husbandWorkMonthlyIncomeMap, husbandPayrollProfile, recentYearMonthKeys),
    [husbandWorkMonthlyIncomeMap, husbandPayrollProfile, recentYearMonthKeys]
  )
  const naomiAnnualFromWork = useMemo(() => sumLastMonths(naomiWorkMonthlyIncomeMap, 12), [naomiWorkMonthlyIncomeMap])
  const husbandAnnualFromWork = useMemo(() => sumLastMonths(husbandWorkMonthlyIncomeMap, 12), [husbandWorkMonthlyIncomeMap])
  const selectedMonth = String(summaryMonthKey || '').trim() || toMonthKey(new Date())
  const selectedPeriodMonthKeys = summaryPeriod === 'monthly' ? [selectedMonth] : recentYearMonthKeys
  const selectedNaomiIncome = summaryPeriod === 'monthly'
    ? Math.round(Number(naomiWorkMonthlyIncomeMap[selectedMonth] || 0))
    : naomiAnnualFromWork
  const selectedHusbandIncome = summaryPeriod === 'monthly'
    ? Math.round(Number(husbandWorkMonthlyIncomeMap[selectedMonth] || 0))
    : husbandAnnualFromWork
  const selectedFamilyIncome = selectedNaomiIncome + (includeHusband ? selectedHusbandIncome : 0)
  const selectedNaomiAttendanceSummary = useMemo(
    () => summarizeAttendanceForMonths(attendance, selectedPeriodMonthKeys),
    [attendance, selectedPeriodMonthKeys]
  )
  const selectedHusbandAttendanceSummary = useMemo(
    () => summarizeAttendanceForMonths(husbandAttendance, selectedPeriodMonthKeys),
    [husbandAttendance, selectedPeriodMonthKeys]
  )
  const selectedNaomiMissingRateDays = useMemo(
    () => countDatesInMonths(naomiIncomeDetails.missingRateDates, selectedPeriodMonthKeys),
    [naomiIncomeDetails.missingRateDates, selectedPeriodMonthKeys]
  )
  const selectedHusbandMissingRateDays = useMemo(
    () => countDatesInMonths(husbandIncomeDetails.missingRateDates, selectedPeriodMonthKeys),
    [husbandIncomeDetails.missingRateDates, selectedPeriodMonthKeys]
  )
  const selectedExpensesTotal = useMemo(
    () => sumExpensesForMonths(safeExpenses, selectedPeriodMonthKeys),
    [safeExpenses, selectedPeriodMonthKeys]
  )
  const selectedFamilyNet = selectedFamilyIncome - selectedExpensesTotal
  const naomiMissingRateByMonth = useMemo(
    () => buildMonthCountMap(naomiIncomeDetails.missingRateDates),
    [naomiIncomeDetails.missingRateDates]
  )
  const husbandMissingRateByMonth = useMemo(
    () => buildMonthCountMap(husbandIncomeDetails.missingRateDates),
    [husbandIncomeDetails.missingRateDates]
  )
  const expenseItemsSorted = useMemo(
    () => [...safeExpenses]
      .sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || ''))),
    [safeExpenses]
  )

  const effectiveAnnualIncome = includeHusband
    ? (Number(taxInputs.annualIncome) || husbandAnnualFromWork)
    : (Number(taxInputs.annualIncome) || naomiAnnualFromWork)
  const effectiveSpouseIncome = includeHusband
    ? (Number(taxInputs.spouseIncome) || naomiAnnualFromWork)
    : 0
  const taxResult = calculateTax({
    annualIncome: effectiveAnnualIncome,
    spouseIncome: effectiveSpouseIncome,
    medicalExpenses: Number(taxInputs.medicalExpenses) || 0,
    socialInsurance: Number(taxInputs.socialInsurance) || 0,
  })

  const sortedRates = useMemo(
    () => [...safePayRates]
      .sort((a, b) => toDateStamp(b?.effectiveFrom) - toDateStamp(a?.effectiveFrom)),
    [safePayRates]
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
      const current = normalizePayrollProfile(payrollProfiles[target], { delayMonths: 1, monthlyAdjustment: 0 })
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
      if (husbandAnnualFromWork > 0) updateTax('annualIncome', String(husbandAnnualFromWork))
      if (naomiAnnualFromWork > 0) updateTax('spouseIncome', String(naomiAnnualFromWork))
      return
    }
    if (naomiAnnualFromWork > 0) updateTax('annualIncome', String(naomiAnnualFromWork))
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
    if (expenseForm.addToCalendar) {
      const categoryLabel = getExpenseCategoryLabel(expenseForm.category)
      const cleanNote = String(expenseForm.note || '').trim()
      addPlan(date, {
        time: String(expenseForm.planTime || '').trim(),
        title: `Expense: ${categoryLabel}`,
        location: '',
        notes: cleanNote
          ? `${cleanNote} (${formatYen(amount)})`
          : `${categoryLabel} budget ${formatYen(amount)}`,
        done: false,
      })
    }
    setExpenseForm(prev => ({
      ...prev,
      amount: '',
      note: '',
      planTime: '',
    }))
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['benefits', 'work', 'salary', 'tax', 'expenses'].map(tabId => (
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
                      : tabId === 'tax'
                        ? APP_ICONS.tax
                        : APP_ICONS.benefits
              } />
              <span>
                {tabId === 'benefits'
                  ? 'Benefits'
                  : tabId === 'work'
                    ? 'Work'
                    : tabId === 'salary'
                      ? 'Salary'
                      : tabId === 'tax'
                        ? 'Tax Calc'
                        : 'Expenses'}
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
                <span className="section-count">
                  {formatYen(benefitSourceFilter === 'all' ? claimedMoney : visibleClaimedMoney)} / {formatYen(benefitSourceFilter === 'all' ? totalMoney : visibleMoneyTotal)}
                </span>
              </div>
            </div>
            <p className="section-note">
              Tap checkbox to mark as claimed. Tap info for claim flow, related tasks, and what to batch together.
            </p>
            <div className="glass-tabs salary-mini-tabs">
              {[
                { id: 'all', label: 'All' },
                { id: 'national', label: 'National' },
                { id: 'kawasaki', label: 'Kawasaki' },
                { id: 'employer', label: 'Employer' },
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`glass-tab ${benefitSourceFilter === option.id ? 'active' : ''}`}
                  onClick={() => setBenefitSourceFilter(option.id)}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <ul>
              {filteredMoneyTracker.map(item => (
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
                      {BENEFIT_TIMING_HINT_BY_ID[item.id] && (
                        <div className="detail-section">
                          <div className="detail-label">Recommended timing:</div>
                          <div className="detail-text">{BENEFIT_TIMING_HINT_BY_ID[item.id]}</div>
                        </div>
                      )}
                      {BENEFIT_BATCH_HINT_BY_ID[item.id] && (
                        <div className="detail-section">
                          <div className="detail-label">Batch this with:</div>
                          <div className="detail-text">{BENEFIT_BATCH_HINT_BY_ID[item.id]}</div>
                        </div>
                      )}
                      {Array.isArray(benefitTasksById[item.id]) && benefitTasksById[item.id].length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">Related tasks in checklist:</div>
                          <div className="detail-text">
                            {benefitTasksById[item.id].map((task) => (
                              <div key={`${item.id}-task-${task.id}`}>
                                <strong>{task.id.toUpperCase()}</strong> - {task.text} ({task.phaseTitle})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.verifiedAt && (
                        <div className="detail-section">
                          <div className="detail-label">Last verified:</div>
                          <div className="detail-text">{item.verifiedAt}</div>
                        </div>
                      )}
                      {Array.isArray(item.sourceLinks) && item.sourceLinks.length > 0 && (
                        <div className="detail-section">
                          <div className="detail-label">Official sources:</div>
                          <div className="detail-text">
                            {item.sourceLinks.map((source, index) => (
                              <div key={`${item.id}-source-${index}`}>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {source.label}
                                </a>
                              </div>
                            ))}
                          </div>
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
              allowGeoTracker={true}
            />
          )}
        </>
      )}

      {subTab === 'salary' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
              <div>
                <h2>Family Income Summary</h2>
                <span className="section-count">
                  {summaryPeriod === 'monthly' ? `Work month: ${selectedMonth}` : 'Last 12 work months'}
                </span>
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
                  Monthly
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
            <div className="salary-summary-grid">
              <div className="glass-inner salary-summary-card">
                <div className="salary-person">{PERSON_LABELS.naomi}</div>
                <div className="salary-annual">
                  {formatYen(selectedNaomiIncome)} / {summaryPeriod === 'monthly' ? 'month' : 'year'}
                </div>
                <div className="salary-assume">
                  {summaryPeriod === 'monthly'
                    ? 'Computed from worked days/hours in selected month'
                    : 'Last 12 months from attendance logs'}
                </div>
                <div className="salary-assume">
                  Worked: {selectedNaomiAttendanceSummary.daysWorked} day(s), {formatHoursAndMinutes(selectedNaomiAttendanceSummary.hoursWorked)}
                </div>
                {selectedNaomiMissingRateDays > 0 && (
                  <div className="salary-assume">
                    Not counted yet: {selectedNaomiMissingRateDays} day(s) without pay rate.
                  </div>
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
                      ? 'Computed from worked days/hours in selected month'
                      : 'Last 12 months from attendance logs'}
                  </div>
                  <div className="salary-assume">
                    Worked: {selectedHusbandAttendanceSummary.daysWorked} day(s), {formatHoursAndMinutes(selectedHusbandAttendanceSummary.hoursWorked)}
                  </div>
                  {selectedHusbandMissingRateDays > 0 && (
                    <div className="salary-assume">
                      Not counted yet: {selectedHusbandMissingRateDays} day(s) without pay rate.
                    </div>
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
              <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
              <div>
                <h2>Recent Monthly Income</h2>
                <span className="section-count">
                  {recentIncomeMode === 'work'
                    ? 'Work-month view (direct from attendance logs)'
                    : 'Payout-month view (with payroll delay/adjustments)'}
                </span>
              </div>
            </div>
            <div className="glass-inner summary-period-row">
              <div className="household-toggle-title">Monthly View</div>
              <div className="summary-period-controls">
                <button
                  type="button"
                  className={`tax-preset-btn glass-inner ${recentIncomeMode === 'work' ? 'active' : ''}`}
                  onClick={() => setRecentIncomeMode('work')}
                >
                  Work Month
                </button>
                <button
                  type="button"
                  className={`tax-preset-btn glass-inner ${recentIncomeMode === 'payout' ? 'active' : ''}`}
                  onClick={() => setRecentIncomeMode('payout')}
                >
                  Payout Month
                </button>
              </div>
            </div>
            <div className="salary-month-table">
              {recentMonthKeys.map((monthKey) => {
                const wife = Math.round(Number((recentIncomeMode === 'work' ? naomiWorkMonthlyIncomeMap : naomiMonthlyIncomeMap)[monthKey] || 0))
                const husband = Math.round(Number((recentIncomeMode === 'work' ? husbandWorkMonthlyIncomeMap : husbandMonthlyIncomeMap)[monthKey] || 0))
                const total = wife + (includeHusband ? husband : 0)
                const wifeMissing = Number(naomiMissingRateByMonth[monthKey] || 0)
                const husbandMissing = Number(husbandMissingRateByMonth[monthKey] || 0)
                const monthMissing = wifeMissing + (includeHusband ? husbandMissing : 0)
                return (
                  <div key={monthKey} className="glass-inner salary-month-row">
                    <span>{monthKey}</span>
                    <span>{PERSON_LABELS.naomi}: {formatYen(wife)}</span>
                    {includeHusband && <span>{PERSON_LABELS.husband}: {formatYen(husband)}</span>}
                    <span>Total: {formatYen(total)}</span>
                    {recentIncomeMode === 'work' && monthMissing > 0 && (
                      <span>Missing rate days: {monthMissing}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.salary} /></span>
              <div>
                <h2>Salary Setup</h2>
                <span className="section-count">Tap to manage payout rules and rates</span>
              </div>
              <button
                type="button"
                className="cal-collapse-btn"
                onClick={() => setSalarySetupOpen(prev => !prev)}
                aria-expanded={salarySetupOpen}
              >
                {salarySetupOpen ? 'Hide setup' : 'Show setup'}
              </button>
            </div>
            {salarySetupOpen && (
              <>
                <div className="glass-tabs salary-mini-tabs">
                  {[
                    { id: 'rates', label: 'Pay Rate Profiles' },
                    { id: 'payroll', label: 'Payroll Rules' },
                    { id: 'history', label: 'Rate History' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`glass-tab ${salarySetupTab === tab.id ? 'active' : ''}`}
                      onClick={() => setSalarySetupTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {salarySetupTab === 'rates' && (
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
                )}

                {salarySetupTab === 'payroll' && (
                  <div className="salary-rate-list">
                    {includeHusband && (
                      <div className="glass-card payroll-card husband-summary">
                        <h3>{PERSON_LABELS.husband} Payroll</h3>
                        <div className="salary-rate-grid">
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
                        <p className="section-note">Separate profile and logs from {PERSON_LABELS.naomi}.</p>
                      </div>
                    )}

                    <div className="glass-card payroll-card">
                      <h3>{PERSON_LABELS.naomi} Payroll</h3>
                      <div className="salary-rate-grid">
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
                      <p className="section-note">Income remains attendance-based. Delay just shifts payout month.</p>
                    </div>
                  </div>
                )}

                {salarySetupTab === 'history' && (
                  <>
                    {sortedRates.length > 0 ? (
                      <ul className="salary-rate-list">
                        {sortedRates.map((item) => (
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
                            {item.note && <div className="salary-rate-note">{item.note}</div>}
                            <button type="button" className="btn-delete" onClick={() => removePayRate(item.id)}>Delete</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-state">No salary rates yet. Add one above.</p>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </>
      )}

      {subTab === 'expenses' && (
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
            <div className="attendance-toggle">
              <button
                type="button"
                className={`att-btn ${expenseForm.addToCalendar ? 'active worked' : ''}`}
                onClick={() => updateExpenseForm('addToCalendar', true)}
              >
                Add to Calendar
              </button>
              <button
                type="button"
                className={`att-btn ${!expenseForm.addToCalendar ? 'active absent' : ''}`}
                onClick={() => updateExpenseForm('addToCalendar', false)}
              >
                Expense Only
              </button>
            </div>
            {expenseForm.addToCalendar && (
              <div className="form-row">
                <label>Planner time (optional)</label>
                <input
                  type="time"
                  value={expenseForm.planTime}
                  onChange={e => updateExpenseForm('planTime', e.target.value)}
                />
              </div>
            )}
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
                        placeholder={naomiAnnualFromWork > 0 ? `Auto available: ${formatYen(naomiAnnualFromWork)}` : 'e.g. 1,200,000'}
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


