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

const BENEFIT_OWNER_BY_ID = {
  m1: 'naomi',
  m2: 'naomi',
  m3: 'naomi',
  m4: 'family',
  m5: 'family',
  m6: 'family',
  m7: 'family',
  m8: 'family',
  m9: 'family',
  m10: 'family',
  m11: 'naomi',
  m12: 'family',
  m13: 'family',
  m14: 'family',
  m15: 'family',
  m16: 'naomi',
}

const BENEFIT_OWNER_FILTERS = [
  { id: 'all', label: 'All Owners' },
  { id: 'naomi', label: 'Naomi' },
  { id: 'husband', label: 'Shinji' },
  { id: 'family', label: 'Family' },
]

const BENEFIT_STATUS_FILTERS = [
  { id: 'all', label: 'All Status' },
  { id: 'pending', label: 'Pending' },
  { id: 'ask', label: 'Ask Required' },
  { id: 'claimed', label: 'Claimed' },
]

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

const BENEFIT_ASK_REQUIRED_BY_ID = {
  m10: true,
  m11: true,
  m12: true,
  m13: true,
  m15: true,
  m16: true,
}

const FAMILY_BENEFITS_OPEN_KEY = 'baby-prep-family-benefits-open'
const FAMILY_BENEFITS_CLAIMED_KEY = 'baby-prep-family-benefits-claimed'
const BENEFIT_TOOLS_OPEN_KEY = 'baby-prep-benefit-tools-open'
const FAMILY_LANE_TOOLS_OPEN_KEY = 'baby-prep-family-lane-tools-open'
const SUPPORT_PROJECTION_SCENARIO_KEY = 'baby-prep-support-projection-scenario'
const SUPPORT_PROJECTION_CHILD_MODEL_KEY = 'baby-prep-support-projection-child-model'
const SUPPORT_PLAYBOOK_OPEN_KEY = 'baby-prep-support-playbook-open'

const CHILD_ALLOWANCE_18Y_ONE_CHILD = 2340000
const CHILD_ALLOWANCE_18Y_TWO_CHILD = 4680000
const SUPPORT_DIRECT_STRICT_IDS = ['m1', 'm4', 'm5']
const SUPPORT_DIRECT_STRETCH_ONLY_IDS = ['m6', 'm7', 'm10', 'm15']
const SUPPORT_INCOME_REPLACEMENT_IDS = ['m11', 'm12']
const SUPPORT_COST_SAVINGS_IDS = ['m2', 'm3', 'm13', 'm14', 'm16']
const SUPPORT_TAX_ID = 'm9'
const DAYTIME_TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']
const DAYTIME_DEFAULT_TIME = '10:00'

const FAMILY_BENEFIT_GROUP_FILTERS = [
  { id: 'all', label: 'All Tracks' },
  { id: 'employer', label: 'Employer / HR' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'household', label: 'Household' },
]

const FAMILY_BENEFIT_ITEMS = [
  {
    id: 'f1',
    label: 'Shinji childcare leave benefit setup (育児休業給付)',
    estimateLabel: 'Income replacement',
    owner: 'husband',
    group: 'employer',
    where: 'Employer HR + Hello Work',
    howTo: 'Confirm eligibility, leave window, and filing flow before leave starts. Ask payout timing and first payment month.',
    timing: 'Before childcare leave starts',
    askRequired: true,
    sourceLinks: [
      { label: 'MHLW: 育児休業給付', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html' },
    ],
  },
  {
    id: 'f2',
    label: 'Company birth bonus / dependent allowance update',
    estimateLabel: 'Varies by company',
    owner: 'husband',
    group: 'employer',
    where: 'Shinji employer HR / payroll',
    howTo: 'Ask if company offers childbirth bonus, family allowance increase, or dependent registration-linked payouts.',
    timing: 'During pregnancy or immediately after birth registration',
    askRequired: true,
    sourceLinks: [
      { label: 'CFA: 家計応援 (policy context)', url: 'https://www.cfa.go.jp/resources/strategy/kakei-oen' },
    ],
  },
  {
    id: 'f3',
    label: 'Health insurance extra payout (付加給付 / fuka kyuufu)',
    estimateLabel: 'Often ¥10K-¥90K',
    owner: 'family',
    group: 'insurance',
    where: 'Health insurance association (健保組合) + HR',
    howTo: 'Check if insurer adds money on top of childbirth lump-sum. Ask required form and filing deadline.',
    timing: 'Before delivery or right after invoice finalization',
    askRequired: true,
    sourceLinks: [
      { label: 'Kyokai Kenpo: 出産育児一時金', url: 'https://www.kyoukaikenpo.or.jp/g3/sb3280/' },
    ],
  },
  {
    id: 'f4',
    label: 'Confirm childbirth lump-sum payer path (if Naomi under Shinji insurance)',
    estimateLabel: 'Route check',
    owner: 'family',
    group: 'insurance',
    where: 'Insurance office + hospital billing desk',
    howTo: 'Confirm who files and which route applies (direct payment vs refund) to avoid delayed payout.',
    timing: 'Before delivery admission',
    askRequired: true,
    sourceLinks: [
      { label: 'MHLW: 出産育児一時金', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/shussan/index.html' },
    ],
  },
  {
    id: 'f5',
    label: 'Household claim packet check (tax receipts, child allowance docs, insurer forms)',
    estimateLabel: 'Savings protection',
    owner: 'family',
    group: 'household',
    where: 'At home prep + ward office + HR',
    howTo: 'Prepare one shared folder for receipts, transport logs, ID docs, and application copies so no support is missed.',
    timing: 'Start now and maintain monthly',
    askRequired: false,
    sourceLinks: [
      { label: 'NTA e-Tax', url: 'https://www.e-tax.nta.go.jp/' },
      { label: 'CFA: 児童手当概要', url: 'https://www.cfa.go.jp/policies/kokoseido/jidouteate/gaiyou/' },
    ],
  },
  {
    id: 'f6',
    label: 'Shinji birth-time leave benefit (出生時育児休業給付金)',
    estimateLabel: '~67% wage (eligible period)',
    owner: 'husband',
    group: 'employer',
    where: 'Employer HR + Hello Work',
    howTo: 'Confirm if Shinji will take birth-time childcare leave (産後パパ育休). File leave dates and benefit paperwork before leave starts.',
    timing: 'Before expected delivery month',
    askRequired: true,
    sourceLinks: [
      { label: 'MHLW: 育児休業給付', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html' },
    ],
  },
  {
    id: 'f7',
    label: 'Postpartum leave add-on support check (出生後休業支援給付金)',
    estimateLabel: 'Extra top-up (if eligible)',
    owner: 'husband',
    group: 'employer',
    where: 'Employer HR + Hello Work',
    howTo: 'Ask if your leave pattern qualifies for the new postpartum add-on support and what exact filing windows apply.',
    timing: 'Within first 8 weeks after birth',
    askRequired: true,
    sourceLinks: [
      { label: 'MHLW leaflet (R7): 育児休業給付', url: 'https://www.mhlw.go.jp/content/11600000/001421353.pdf' },
    ],
  },
  {
    id: 'f8',
    label: 'Reduced-hours childcare benefit check (育児時短就業給付金)',
    estimateLabel: 'Rate depends on setup',
    owner: 'family',
    group: 'employer',
    where: 'Employer HR + Hello Work',
    howTo: 'If either parent returns on reduced hours, ask whether childcare short-time work benefit can apply and from which payroll month.',
    timing: 'Before return-to-work schedule is finalized',
    askRequired: true,
    sourceLinks: [
      { label: 'MHLW: 育児休業給付', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html' },
    ],
  },
]

const STRETCH_PLAYBOOK_STEPS = [
  {
    id: 'sp1',
    title: 'Ward office maximize sweep (ask all optional programs)',
    daysFromNow: 2,
    time: '10:00',
    location: 'Kawasaki Ward Office',
    focus: 'Capture ask-required and campaign-style support in one visit.',
    target: 'Ask for municipal baby gift, cost-of-living support, and premium reduction windows.',
    benefitIds: ['m10', 'm15', 'm16'],
    taskIds: ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p13', 'p14', 'o7'],
  },
  {
    id: 'sp2',
    title: 'Hospital billing route + delivery refund check',
    daysFromNow: 4,
    time: '14:00',
    location: 'Delivery hospital billing desk',
    focus: 'Prevent losing refund due to wrong submission route.',
    target: 'Confirm direct payment setup and refund path if invoice is below childbirth lump-sum.',
    benefitIds: ['m4', 'm6'],
    taskIds: ['d1', 'b6'],
  },
  {
    id: 'sp3',
    title: 'HR benefits bundle (Naomi + Shinji side)',
    daysFromNow: 6,
    time: '11:00',
    location: 'Employer HR / payroll',
    focus: 'Lock in leave-related income replacement and employer add-ons.',
    target: 'Confirm maternity/childcare leave pay, social insurance exemption, and fuka kyuufu.',
    benefitIds: ['m7', 'm11', 'm12', 'm13'],
    taskIds: ['p10', 'd6', 'd7'],
  },
  {
    id: 'sp4',
    title: 'Birth registration bundle execution plan',
    daysFromNow: 10,
    time: '09:30',
    location: 'Kawasaki Ward Office',
    focus: 'Stack post-birth submissions in one process flow.',
    target: 'Sequence birth support payment, child allowance, and child medical subsidy with no deadline miss.',
    benefitIds: ['m5', 'm8', 'm14'],
    taskIds: ['b1', 'b2', 'b3', 'b4', 'b5'],
  },
  {
    id: 'sp5',
    title: 'Medical receipts + transport log system',
    daysFromNow: 1,
    time: '10:30',
    location: 'Home admin setup',
    focus: 'Sustain yearly tax refund quality.',
    target: 'Set monthly archive routine for receipts + transport records before tax season.',
    benefitIds: ['m2', 'm9'],
    taskIds: ['p11', 'o1', 'o2', 'o4'],
  },
  {
    id: 'sp6',
    title: 'Annual support re-check cadence',
    daysFromNow: 30,
    time: '10:30',
    location: 'Home calendar review',
    focus: 'Catch new city campaigns and rule updates every fiscal year.',
    target: 'Review Kawasaki and national pages, then add follow-ups for active windows.',
    benefitIds: ['m9', 'm10', 'm15'],
    taskIds: ['o7'],
  },
  {
    id: 'sp7',
    title: 'Prenatal voucher usage planning',
    daysFromNow: 3,
    time: '09:45',
    location: 'OB-GYN + ward office docs check',
    focus: 'Maximize voucher usage by sequencing visits early.',
    target: 'Set prenatal visit cadence so all vouchers are consumed within valid windows.',
    benefitIds: ['m2'],
    taskIds: ['p1', 'p2', 'p11'],
  },
  {
    id: 'sp8',
    title: 'Tax filing execution window lock',
    daysFromNow: 40,
    time: '10:30',
    location: 'Home e-Tax prep',
    focus: 'Avoid missing tax refund timing.',
    target: 'Prepare and submit Kakutei Shinkoku in filing season with complete medical/transport records.',
    benefitIds: ['m9'],
    taskIds: ['o4'],
  },
]

function readStorageBool(key, fallback = false) {
  if (typeof window === 'undefined') return Boolean(fallback)
  const raw = String(window.localStorage.getItem(key) || '').trim().toLowerCase()
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return Boolean(fallback)
}

function writeStorageBool(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value ? '1' : '0')
}

function readStorageMap(key) {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    return {}
  } catch {
    return {}
  }
}

function writeStorageMap(key, value) {
  if (typeof window === 'undefined') return
  const safe = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  window.localStorage.setItem(key, JSON.stringify(safe))
}

function readStorageChoice(key, fallback = '') {
  if (typeof window === 'undefined') return String(fallback || '')
  const raw = window.localStorage.getItem(key)
  if (!raw) return String(fallback || '')
  const normalized = String(raw).trim()
  return normalized || String(fallback || '')
}

function writeStorageChoice(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, String(value || ''))
}

function formatYen(value) {
  return `${YEN}${Number(value || 0).toLocaleString()}`
}

function formatYenCompact(value) {
  const safe = Math.max(0, Number(value) || 0)
  if (safe >= 1000000) {
    const millions = safe / 1000000
    const text = millions >= 10
      ? Math.round(millions).toString()
      : millions.toFixed(2).replace(/\.?0+$/, '')
    return `${YEN}${text}M`
  }
  if (safe >= 1000) {
    const thousands = safe / 1000
    const text = thousands >= 100
      ? Math.round(thousands).toString()
      : thousands.toFixed(1).replace(/\.?0+$/, '')
    return `${YEN}${text}K`
  }
  return `${YEN}${safe}`
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

function normalizeBenefitOwner(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'naomi' || raw === 'wife' || raw === 'mom') return 'naomi'
  if (raw === 'husband' || raw === 'shinji' || raw === 'dad' || raw === 'partner') return 'husband'
  return 'family'
}

function getBenefitOwnerLabel(owner) {
  const normalized = normalizeBenefitOwner(owner)
  if (normalized === 'naomi') return PERSON_LABELS.naomi
  if (normalized === 'husband') return PERSON_LABELS.husband
  return 'Family / Shared'
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

function toIsoDateWithOffset(daysFromNow = 0) {
  const date = new Date()
  date.setDate(date.getDate() + Number(daysFromNow || 0))
  return toIsoDate(date)
}

function toCompactTitle(text, maxLen = 96) {
  const raw = String(text || '').trim()
  if (raw.length <= maxLen) return raw
  return `${raw.slice(0, Math.max(0, maxLen - 3))}...`
}

function buildStretchMarker(stepId) {
  return `[stretch-step:${String(stepId || '').trim().toLowerCase()}]`
}

function parseIsoDate(dateISO) {
  const raw = String(dateISO || '').trim()
  if (!raw) return null
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function addDaysToISO(dateISO, days = 0) {
  const parsed = parseIsoDate(dateISO)
  if (!parsed) return ''
  parsed.setDate(parsed.getDate() + Number(days || 0))
  return toIsoDate(parsed)
}

function isWeekendISO(dateISO) {
  const parsed = parseIsoDate(dateISO)
  if (!parsed) return false
  const day = parsed.getDay()
  return day === 0 || day === 6
}

function toDaytimeTime(value) {
  const raw = String(value || '').trim()
  if (!/^\d{2}:\d{2}$/.test(raw)) return DAYTIME_DEFAULT_TIME
  if (DAYTIME_TIME_SLOTS.includes(raw)) return raw
  const [hoursText, minutesText] = raw.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return DAYTIME_DEFAULT_TIME
  if (hours < 9 || hours > 16) return DAYTIME_DEFAULT_TIME
  if (hours === 16 && minutes > 0) return DAYTIME_DEFAULT_TIME
  const roundedMinutes = minutes >= 30 ? 30 : 0
  const rounded = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`
  if (DAYTIME_TIME_SLOTS.includes(rounded)) return rounded
  return DAYTIME_DEFAULT_TIME
}

function isOfficeHourStep(step) {
  const text = `${String(step?.title || '')} ${String(step?.location || '')} ${String(step?.target || '')}`.toLowerCase()
  return /(ward|office|kuyakusho|city hall|hr|hospital|byoin|hello work|tax|clinic|ob-gyn|kawasaki)/.test(text)
}

export default function MoneyTab() {
  const {
    checked,
    moneyClaimed,
    toggleMoney,
    payRates,
    addPayRate,
    removePayRate,
    addPlan,
    removePlan,
    taxInputs,
    setTaxInputs,
    attendance,
    husbandAttendance,
    planner,
    dueDate,
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
  const [benefitOwnerFilter, setBenefitOwnerFilter] = useState('all')
  const [benefitStatusFilter, setBenefitStatusFilter] = useState('all')
  const [workView, setWorkView] = useState('wife')
  const [summaryPeriod, setSummaryPeriod] = useState('annual')
  const [summaryMonthKey, setSummaryMonthKey] = useState(() => toMonthKey(new Date()))
  const [expandedItem, setExpandedItem] = useState(null)
  const [taxStepIndex, setTaxStepIndex] = useState(0)
  const [salarySetupOpen, setSalarySetupOpen] = useState(false)
  const [salarySetupTab, setSalarySetupTab] = useState('rates')
  const [recentIncomeMode, setRecentIncomeMode] = useState('work')
  const [familyBenefitsOpen, setFamilyBenefitsOpen] = useState(() => readStorageBool(FAMILY_BENEFITS_OPEN_KEY, false))
  const [familyBenefitsClaimed, setFamilyBenefitsClaimed] = useState(() => readStorageMap(FAMILY_BENEFITS_CLAIMED_KEY))
  const [benefitToolsOpen, setBenefitToolsOpen] = useState(() => readStorageBool(BENEFIT_TOOLS_OPEN_KEY, false))
  const [familyLaneToolsOpen, setFamilyLaneToolsOpen] = useState(() => readStorageBool(FAMILY_LANE_TOOLS_OPEN_KEY, false))
  const [supportProjectionScenario, setSupportProjectionScenario] = useState(() => {
    const saved = readStorageChoice(SUPPORT_PROJECTION_SCENARIO_KEY, 'strict')
    return saved === 'stretch' ? 'stretch' : 'strict'
  })
  const [supportProjectionChildModel, setSupportProjectionChildModel] = useState(() => {
    const saved = readStorageChoice(SUPPORT_PROJECTION_CHILD_MODEL_KEY, 'one')
    return saved === 'two' ? 'two' : 'one'
  })
  const [supportPlaybookOpen, setSupportPlaybookOpen] = useState(() => readStorageBool(SUPPORT_PLAYBOOK_OPEN_KEY, false))
  const [familyBenefitGroupFilter, setFamilyBenefitGroupFilter] = useState('all')
  const [familyBenefitStatusFilter, setFamilyBenefitStatusFilter] = useState('all')
  const [benefitScheduleDraft, setBenefitScheduleDraft] = useState({})
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
  const unmappedBenefitIds = useMemo(
    () => moneyTracker.filter(item => !Array.isArray(benefitTasksById[item.id]) || benefitTasksById[item.id].length === 0).map(item => item.id),
    [benefitTasksById]
  )
  const filteredMoneyTracker = useMemo(() => {
    return moneyTracker.filter((item) => {
      const source = BENEFIT_SOURCE_BY_ID[item.id] || 'kawasaki'
      if (benefitSourceFilter !== 'all' && source !== benefitSourceFilter) return false

      const owner = normalizeBenefitOwner(BENEFIT_OWNER_BY_ID[item.id] || 'family')
      if (benefitOwnerFilter !== 'all' && owner !== benefitOwnerFilter) return false

      const claimed = Boolean(moneyClaimed[item.id])
      if (benefitStatusFilter === 'claimed' && !claimed) return false
      if (benefitStatusFilter === 'pending' && claimed) return false
      if (benefitStatusFilter === 'ask' && (!BENEFIT_ASK_REQUIRED_BY_ID[item.id] || claimed)) return false

      return true
    })
  }, [benefitSourceFilter, benefitOwnerFilter, benefitStatusFilter, moneyClaimed])
  const visibleMoneyTotal = useMemo(
    () => filteredMoneyTracker.reduce((acc, item) => acc + item.amount, 0),
    [filteredMoneyTracker]
  )
  const visibleClaimedMoney = useMemo(
    () => filteredMoneyTracker.filter((item) => moneyClaimed[item.id]).reduce((acc, item) => acc + item.amount, 0),
    [filteredMoneyTracker, moneyClaimed]
  )
  const familyBenefitsDoneCount = useMemo(
    () => FAMILY_BENEFIT_ITEMS.filter(item => familyBenefitsClaimed[item.id]).length,
    [familyBenefitsClaimed]
  )
  const filteredFamilyBenefits = useMemo(() => {
    return FAMILY_BENEFIT_ITEMS.filter((item) => {
      const group = String(item?.group || 'household').trim().toLowerCase()
      if (familyBenefitGroupFilter !== 'all' && familyBenefitGroupFilter !== group) return false

      const claimed = Boolean(familyBenefitsClaimed[item.id])
      if (familyBenefitStatusFilter === 'claimed' && !claimed) return false
      if (familyBenefitStatusFilter === 'pending' && claimed) return false
      if (familyBenefitStatusFilter === 'ask' && (!item.askRequired || claimed)) return false

      return true
    })
  }, [familyBenefitGroupFilter, familyBenefitStatusFilter, familyBenefitsClaimed])
  const visibleFamilyBenefitsDoneCount = useMemo(
    () => filteredFamilyBenefits.filter(item => familyBenefitsClaimed[item.id]).length,
    [filteredFamilyBenefits, familyBenefitsClaimed]
  )
  const benefitLabelById = useMemo(
    () => Object.fromEntries(moneyTracker.map(item => [item.id, item.label])),
    []
  )
  const taskById = useMemo(() => {
    const out = {}
    phases.forEach((phase) => {
      phase.items.forEach((item) => {
        out[item.id] = {
          id: item.id,
          text: item.text,
          phaseTitle: phase.title,
        }
      })
    })
    return out
  }, [])
  const pendingTaskSchedulesByTaskId = useMemo(() => {
    const out = {}
    const safePlanner = planner && typeof planner === 'object' ? planner : {}
    Object.entries(safePlanner).forEach(([dateISO, entries]) => {
      if (!Array.isArray(entries)) return
      entries.forEach((entry) => {
        if (!entry || entry.done) return
        const taskIds = Array.isArray(entry.taskIds) ? entry.taskIds : []
        if (!taskIds.length) return
        taskIds.forEach((taskIdRaw) => {
          const taskId = String(taskIdRaw || '').trim()
          if (!taskId) return
          if (!out[taskId]) out[taskId] = []
          out[taskId].push({
            dateISO,
            planId: entry.id,
            time: String(entry.time || '').trim(),
            title: String(entry.title || '').trim(),
          })
        })
      })
    })
    return out
  }, [planner])
  const pendingPlansByDate = useMemo(() => {
    const out = {}
    const safePlanner = planner && typeof planner === 'object' ? planner : {}
    Object.entries(safePlanner).forEach(([dateISO, entries]) => {
      if (!Array.isArray(entries)) return
      const pending = entries.filter(entry => entry && !entry.done)
      if (pending.length) out[dateISO] = pending
    })
    return out
  }, [planner])
  const stretchPlanEntriesByStep = useMemo(() => {
    const out = {}
    STRETCH_PLAYBOOK_STEPS.forEach((step) => {
      out[step.id] = []
    })
    const titleToStepId = {}
    STRETCH_PLAYBOOK_STEPS.forEach((step) => {
      titleToStepId[`stretch: ${String(step.title || '').trim().toLowerCase()}`] = step.id
    })
    const safePlanner = planner && typeof planner === 'object' ? planner : {}
    Object.entries(safePlanner).forEach(([dateISO, entries]) => {
      if (!Array.isArray(entries)) return
      entries.forEach((entry) => {
        if (!entry) return
        const title = String(entry.title || '').trim()
        const titleLower = title.toLowerCase()
        const notes = String(entry.notes || '')
        const markerMatch = notes.match(/\[stretch-step:([a-z0-9_-]+)\]/i)
        let stepId = markerMatch ? String(markerMatch[1] || '').trim().toLowerCase() : ''
        if (!stepId && titleToStepId[titleLower]) stepId = titleToStepId[titleLower]
        if (!stepId || !out[stepId]) return
        const kind = titleLower.startsWith('stretch:') ? 'step' : 'task'
        out[stepId].push({
          dateISO,
          planId: String(entry.id || '').trim(),
          kind,
        })
      })
    })
    return out
  }, [planner])
  const supportProjection = useMemo(() => {
    const byId = Object.fromEntries(moneyTracker.map(item => [item.id, Math.max(0, Number(item.amount) || 0)]))
    const sumByIds = (ids) => ids.reduce((acc, id) => acc + (byId[id] || 0), 0)
    const directCashStrict = sumByIds(SUPPORT_DIRECT_STRICT_IDS)
    const directCashStretchOnly = sumByIds(SUPPORT_DIRECT_STRETCH_ONLY_IDS)
    const directCashStretch = directCashStrict + directCashStretchOnly
    const incomeReplacementCash = sumByIds(SUPPORT_INCOME_REPLACEMENT_IDS)
    const costSavingsConfigured = sumByIds(SUPPORT_COST_SAVINGS_IDS)
    const taxAnnualEstimate = byId[SUPPORT_TAX_ID] || 0
    const taxOver18y = taxAnnualEstimate * 18
    const strictOneChild = directCashStrict + incomeReplacementCash + costSavingsConfigured + taxOver18y + CHILD_ALLOWANCE_18Y_ONE_CHILD
    const strictTwoChildren = directCashStrict + incomeReplacementCash + costSavingsConfigured + taxOver18y + CHILD_ALLOWANCE_18Y_TWO_CHILD
    const stretchOneChild = strictOneChild + directCashStretchOnly
    const stretchTwoChildren = strictTwoChildren + directCashStretchOnly
    const stretchOnlyRows = SUPPORT_DIRECT_STRETCH_ONLY_IDS
      .map(id => ({
        id,
        label: benefitLabelById[id] || id.toUpperCase(),
        amount: byId[id] || 0,
      }))
      .filter(row => row.amount > 0)

    return {
      directCashStrict,
      directCashStretchOnly,
      directCashStretch,
      incomeReplacementCash,
      costSavingsConfigured,
      taxAnnualEstimate,
      taxOver18y,
      strictOneChild,
      strictTwoChildren,
      stretchOneChild,
      stretchTwoChildren,
      stretchOnlyRows,
    }
  }, [benefitLabelById])
  const activeChildAllowance = supportProjectionChildModel === 'two'
    ? CHILD_ALLOWANCE_18Y_TWO_CHILD
    : CHILD_ALLOWANCE_18Y_ONE_CHILD
  const strictTotalByChildModel = supportProjectionChildModel === 'two'
    ? supportProjection.strictTwoChildren
    : supportProjection.strictOneChild
  const stretchTotalByChildModel = supportProjectionChildModel === 'two'
    ? supportProjection.stretchTwoChildren
    : supportProjection.stretchOneChild
  const activeProjectionTotal = supportProjectionScenario === 'stretch'
    ? stretchTotalByChildModel
    : strictTotalByChildModel
  const stretchUpside = Math.max(0, stretchTotalByChildModel - strictTotalByChildModel)

  useEffect(() => {
    if (!includeHusband && workView === 'husband') setWorkView('wife')
  }, [includeHusband, workView])

  useEffect(() => {
    writeStorageBool(FAMILY_BENEFITS_OPEN_KEY, familyBenefitsOpen)
  }, [familyBenefitsOpen])

  useEffect(() => {
    writeStorageBool(BENEFIT_TOOLS_OPEN_KEY, benefitToolsOpen)
  }, [benefitToolsOpen])

  useEffect(() => {
    writeStorageBool(FAMILY_LANE_TOOLS_OPEN_KEY, familyLaneToolsOpen)
  }, [familyLaneToolsOpen])

  useEffect(() => {
    writeStorageChoice(SUPPORT_PROJECTION_SCENARIO_KEY, supportProjectionScenario)
  }, [supportProjectionScenario])

  useEffect(() => {
    writeStorageChoice(SUPPORT_PROJECTION_CHILD_MODEL_KEY, supportProjectionChildModel)
  }, [supportProjectionChildModel])

  useEffect(() => {
    writeStorageBool(SUPPORT_PLAYBOOK_OPEN_KEY, supportPlaybookOpen)
  }, [supportPlaybookOpen])

  useEffect(() => {
    writeStorageMap(FAMILY_BENEFITS_CLAIMED_KEY, familyBenefitsClaimed)
  }, [familyBenefitsClaimed])

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

  const toggleFamilyBenefit = (id) => {
    setFamilyBenefitsClaimed(prev => ({
      ...(prev && typeof prev === 'object' ? prev : {}),
      [id]: !Boolean(prev?.[id]),
    }))
  }

  const addFamilyBenefitFollowUp = (item) => {
    const today = toIsoDate()
    const when = String(item?.timing || '').trim()
    const where = String(item?.where || '').trim()
    addPlan(today, {
      time: '',
      title: `Follow-up: ${item.label}`,
      location: where || '',
      notes: when ? `Timing: ${when}` : 'Follow-up action',
      done: false,
    })
  }

  const addVisibleFamilyFollowUps = () => {
    const pending = filteredFamilyBenefits.filter(item => !familyBenefitsClaimed[item.id]).slice(0, 8)
    pending.forEach((item) => addFamilyBenefitFollowUp(item))
  }

  const getStretchStepEntries = (step, kind = 'all') => {
    const stepId = String(step?.id || '').trim().toLowerCase()
    if (!stepId) return []
    const entries = Array.isArray(stretchPlanEntriesByStep?.[stepId]) ? stretchPlanEntriesByStep[stepId] : []
    if (kind === 'all') return entries
    return entries.filter(entry => entry.kind === kind)
  }

  const removePlanEntries = (entries) => {
    entries.forEach((entry) => {
      const dateISO = String(entry?.dateISO || '').trim()
      const planId = String(entry?.planId || '').trim()
      if (!dateISO || !planId) return
      removePlan(dateISO, planId)
    })
  }

  const resolveStepTaskIds = (step) => {
    const relatedIds = Array.isArray(step?.benefitIds) ? step.benefitIds : []
    const mappedTaskIds = relatedIds
      .flatMap((id) => (Array.isArray(benefitTasksById[id]) ? benefitTasksById[id].map(task => task.id) : []))
    const explicitTaskIds = Array.isArray(step?.taskIds) ? step.taskIds : []
    return Array.from(new Set(
      [...mappedTaskIds, ...explicitTaskIds]
        .map(taskId => String(taskId || '').trim())
        .filter(taskId => Boolean(taskById[taskId]))
    ))
  }

  const moveToValidDate = (dateISO, requireWeekday = false) => {
    let cursor = String(dateISO || '').trim() || toIsoDate()
    for (let i = 0; i < 20; i += 1) {
      if (!requireWeekday || !isWeekendISO(cursor)) return cursor
      cursor = addDaysToISO(cursor, 1) || cursor
    }
    return cursor
  }

  const getUsedDaytimeSlotsForDate = (dateISO, localReserved = null) => {
    const used = new Set()
    const entries = Array.isArray(pendingPlansByDate?.[dateISO]) ? pendingPlansByDate[dateISO] : []
    entries.forEach((entry) => {
      const raw = String(entry?.time || '').trim()
      if (!/^\d{2}:\d{2}$/.test(raw)) return
      used.add(toDaytimeTime(raw))
    })
    if (localReserved instanceof Set) {
      localReserved.forEach(time => used.add(String(time || '').trim()))
    }
    return used
  }

  const pickAvailableDaytimeTime = (dateISO, preferredTime, slotShift = 0, localReserved = null) => {
    const used = getUsedDaytimeSlotsForDate(dateISO, localReserved)
    const normalizedPreferred = toDaytimeTime(preferredTime)
    const preferredIndex = Math.max(0, DAYTIME_TIME_SLOTS.indexOf(normalizedPreferred))
    const shift = Math.max(0, Number(slotShift) || 0)
    for (let i = 0; i < DAYTIME_TIME_SLOTS.length; i += 1) {
      const idx = (preferredIndex + shift + i) % DAYTIME_TIME_SLOTS.length
      const candidate = DAYTIME_TIME_SLOTS[idx]
      if (!used.has(candidate)) return candidate
    }
    return normalizedPreferred
  }

  const getTaxSeasonAnchorISO = () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = month <= 3 ? now.getFullYear() : now.getFullYear() + 1
    return `${year}-02-10`
  }

  const getSmartBenefitBaseDateISO = (item) => {
    const id = String(item?.id || '').trim()
    const safeDue = parseIsoDate(dueDate) ? String(dueDate) : ''
    if (id === 'm4') {
      if (safeDue) return addDaysToISO(safeDue, -30) || toIsoDateWithOffset(3)
      return toIsoDateWithOffset(3)
    }
    if (id === 'm5' || id === 'm8' || id === 'm14') {
      if (safeDue) return addDaysToISO(safeDue, 10) || toIsoDateWithOffset(10)
      return toIsoDateWithOffset(10)
    }
    if (id === 'm6') {
      if (safeDue) return addDaysToISO(safeDue, 30) || toIsoDateWithOffset(30)
      return toIsoDateWithOffset(30)
    }
    if (id === 'm9') return getTaxSeasonAnchorISO()
    return toIsoDateWithOffset(4)
  }

  const getSmartBenefitPreferredTime = (item) => {
    const id = String(item?.id || '').trim()
    if (id === 'm4' || id === 'm6') return '13:30'
    if (id === 'm7' || id === 'm11' || id === 'm12' || id === 'm13') return '10:30'
    if (id === 'm9') return '10:00'
    return '10:00'
  }

  const getSmartBenefitSchedule = (item, slotShift = 0, localReserved = null) => {
    const baseDate = moveToValidDate(getSmartBenefitBaseDateISO(item), true)
    const time = pickAvailableDaytimeTime(baseDate, getSmartBenefitPreferredTime(item), slotShift, localReserved)
    return { dateISO: baseDate, time }
  }

  const getBestDateISOForStep = (step) => {
    const id = String(step?.id || '').trim()
    const safeDue = parseIsoDate(dueDate) ? String(dueDate) : ''
    let base = toIsoDateWithOffset(step?.daysFromNow)
    if (id === 'sp4' && safeDue) base = addDaysToISO(safeDue, 10) || base
    if (id === 'sp8') base = getTaxSeasonAnchorISO()
    const requireWeekday = isOfficeHourStep(step)
    return moveToValidDate(base, requireWeekday)
  }

  const getBestStepTime = (step, slotShift = 0, localReserved = null) => {
    const dateISO = getBestDateISOForStep(step)
    return pickAvailableDaytimeTime(dateISO, String(step?.time || DAYTIME_DEFAULT_TIME), slotShift, localReserved)
  }

  const hasStretchStepPlan = (step) => {
    return getStretchStepEntries(step, 'step').length > 0
  }

  const hasStretchTaskPlans = (step) => getStretchStepEntries(step, 'task').length > 0

  const getSchedulableMissingTaskCount = (step) => {
    const stepTaskIds = resolveStepTaskIds(step)
    return stepTaskIds.reduce((acc, taskId) => {
      if (checked?.[taskId]) return acc
      const hasPendingSchedule = Array.isArray(pendingTaskSchedulesByTaskId?.[taskId]) && pendingTaskSchedulesByTaskId[taskId].length > 0
      if (hasPendingSchedule) return acc
      return acc + 1
    }, 0)
  }

  const upsertBenefitScheduleDraft = (benefitId, patch) => {
    const id = String(benefitId || '').trim()
    if (!id) return
    setBenefitScheduleDraft(prev => ({
      ...(prev && typeof prev === 'object' ? prev : {}),
      [id]: {
        ...(prev?.[id] && typeof prev[id] === 'object' ? prev[id] : {}),
        ...patch,
      },
    }))
  }

  const addBenefitFollowUp = (item, options = {}) => {
    if (!item || typeof item !== 'object') return
    const relatedTasks = Array.isArray(benefitTasksById[item.id]) ? benefitTasksById[item.id] : []
    const taskIds = Array.from(new Set(relatedTasks.map(task => String(task?.id || '').trim()).filter(Boolean)))
    const smartSchedule = getSmartBenefitSchedule(item)
    const rawDate = String(options?.dateISO || '').trim() || smartSchedule.dateISO
    const dateISO = moveToValidDate(rawDate, true)
    const rawTime = String(options?.time || '').trim() || smartSchedule.time
    const time = pickAvailableDaytimeTime(dateISO, rawTime)
    const where = String(item?.where || '').trim()
    const timing = String(BENEFIT_TIMING_HINT_BY_ID[item?.id] || item?.deadline || '').trim()
    addPlan(dateISO, {
      time,
      title: toCompactTitle(`Claim: ${item.label}`, 94),
      location: where ? where.split('\n')[0] : '',
      notes: timing
        ? `Timing: ${timing}${where ? `\nWhere: ${where}` : ''}`
        : (where || 'Benefit follow-up'),
      done: false,
      taskIds,
    })
  }

  const autoScheduleBenefit = (item) => {
    const smart = getSmartBenefitSchedule(item)
    upsertBenefitScheduleDraft(item?.id, {
      dateISO: smart.dateISO,
      time: smart.time,
    })
    addBenefitFollowUp(item, smart)
  }

  const addStretchStepToCalendar = (step) => {
    if (!step || hasStretchStepPlan(step)) return
    const dateISO = getBestDateISOForStep(step)
    const time = getBestStepTime(step, 0)
    const relatedIds = Array.isArray(step.benefitIds) ? step.benefitIds : []
    const stepTaskIds = resolveStepTaskIds(step)
    const relatedBenefitText = relatedIds
      .map((id) => `${String(id || '').toUpperCase()} - ${benefitLabelById[id] || id}`)
      .join('\n')
    const marker = buildStretchMarker(step.id)
    const notes = [
      marker,
      `Focus: ${step.focus}`,
      `Target: ${step.target}`,
      relatedBenefitText ? `Related benefits:\n${relatedBenefitText}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    addPlan(dateISO, {
      time,
      title: `Stretch: ${step.title}`,
      location: String(step.location || '').trim(),
      notes,
      done: false,
      taskIds: stepTaskIds,
    })
  }

  const removeStretchStepFromCalendar = (step) => {
    removePlanEntries(getStretchStepEntries(step, 'step'))
  }

  const autoScheduleStretchTasksForStep = (step) => {
    if (!step) return
    const dateISO = getBestDateISOForStep(step)
    const stepTaskIds = resolveStepTaskIds(step)
    const localReserved = new Set()
    const marker = buildStretchMarker(step.id)
    stepTaskIds.forEach((taskId, index) => {
      if (checked?.[taskId]) return
      const hasPendingSchedule = Array.isArray(pendingTaskSchedulesByTaskId?.[taskId]) && pendingTaskSchedulesByTaskId[taskId].length > 0
      if (hasPendingSchedule) return
      const task = taskById[taskId]
      if (!task) return
      const time = pickAvailableDaytimeTime(dateISO, String(step.time || DAYTIME_DEFAULT_TIME), index, localReserved)
      localReserved.add(time)
      addPlan(dateISO, {
        time,
        title: toCompactTitle(task.text, 88),
        location: String(step.location || '').trim(),
        notes: `${marker}\nAuto-scheduled from Stretch Maximizer (${step.title}).`,
        done: false,
        taskIds: [taskId],
      })
    })
  }

  const removeStretchTaskSchedulesForStep = (step) => {
    removePlanEntries(getStretchStepEntries(step, 'task'))
  }

  const addStretchPlaybookBatch = () => {
    STRETCH_PLAYBOOK_STEPS.forEach((step) => addStretchStepToCalendar(step))
  }

  const autoScheduleStretchTaskBatch = () => {
    STRETCH_PLAYBOOK_STEPS.forEach((step) => autoScheduleStretchTasksForStep(step))
  }

  const removeAllStretchEntries = () => {
    const all = STRETCH_PLAYBOOK_STEPS.flatMap((step) => getStretchStepEntries(step, 'all'))
    const seen = new Set()
    const unique = all.filter((entry) => {
      const key = `${String(entry?.dateISO || '').trim()}::${String(entry?.planId || '').trim()}`
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    removePlanEntries(unique)
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
            <button
              type="button"
              className="cal-collapse-btn"
              onClick={() => setBenefitToolsOpen(prev => !prev)}
              aria-expanded={benefitToolsOpen}
            >
              {benefitToolsOpen ? 'Hide coverage + filters' : 'Show coverage + filters'}
            </button>
            {benefitToolsOpen && (
              <>
                <p className="section-note">
                  {unmappedBenefitIds.length === 0
                    ? 'Coverage check: all Benefits items are linked to checklist tasks.'
                    : `Coverage warning: ${unmappedBenefitIds.join(', ')} not linked to checklist yet.`}
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
                <div className="glass-tabs salary-mini-tabs">
                  {BENEFIT_OWNER_FILTERS.map(option => (
                    <button
                      key={`owner-${option.id}`}
                      type="button"
                      className={`glass-tab ${benefitOwnerFilter === option.id ? 'active' : ''}`}
                      onClick={() => setBenefitOwnerFilter(option.id)}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                <div className="glass-tabs salary-mini-tabs">
                  {BENEFIT_STATUS_FILTERS.map(option => (
                    <button
                      key={`status-${option.id}`}
                      type="button"
                      className={`glass-tab ${benefitStatusFilter === option.id ? 'active' : ''}`}
                      onClick={() => setBenefitStatusFilter(option.id)}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
                <p className="section-note">
                  Showing {filteredMoneyTracker.length} item(s). Claimed in this view: {filteredMoneyTracker.filter(item => moneyClaimed[item.id]).length}.
                </p>
              </>
            )}
            <ul>
              {filteredMoneyTracker.map(item => {
                const owner = normalizeBenefitOwner(BENEFIT_OWNER_BY_ID[item.id] || 'family')
                const ownerLabel = getBenefitOwnerLabel(owner)
                const claimed = Boolean(moneyClaimed[item.id])
                const smartBenefitSchedule = getSmartBenefitSchedule(item)
                const draft = benefitScheduleDraft?.[item.id] && typeof benefitScheduleDraft[item.id] === 'object'
                  ? benefitScheduleDraft[item.id]
                  : {}
                const selectedDateISO = String(draft.dateISO || smartBenefitSchedule.dateISO || '').trim() || toIsoDate()
                const selectedTime = String(draft.time || smartBenefitSchedule.time || '').trim() || DAYTIME_DEFAULT_TIME
                return (
                  <li key={item.id} className={`glass-card money-card ${claimed ? 'done' : ''}`}>
                    <div className="money-card-top">
                      <span className="checkbox glass-inner" onClick={() => toggleMoney(item.id)}>
                        {claimed ? '\u2713' : ''}
                      </span>
                      <div className="money-card-main">
                        <div className="money-card-badges">
                          <span className={`badge owner-badge owner-${owner}`}>{ownerLabel}</span>
                          <span className="badge money-badge">{formatYenCompact(item.amount)}</span>
                          {BENEFIT_ASK_REQUIRED_BY_ID[item.id] && !claimed && (
                            <span className="badge ask-badge">ASK</span>
                          )}
                        </div>
                        <span className={`item-text ${claimed ? 'claimed' : ''}`}>{item.label}</span>
                      </div>
                      <button className="info-btn glass-inner" onClick={(event) => toggleExpand(item.id, event)}>
                        {expandedItem === item.id ? 'Hide' : 'i'}
                      </button>
                    </div>

                    {expandedItem === item.id && item.howTo && (
                      <div className="money-detail">
                        <div className="detail-section">
                          <div className="detail-label">Claim owner:</div>
                          <div className="detail-text">{ownerLabel}</div>
                        </div>
                        <div className="detail-section">
                          <div className="detail-label">How to claim:</div>
                          <div className="detail-text">{item.howTo}</div>
                        </div>
                        <div className="detail-section">
                          <div className="detail-label">Schedule claim action:</div>
                          <div className="task-schedule-row">
                            <input
                              type="date"
                              value={selectedDateISO}
                              onChange={(event) => upsertBenefitScheduleDraft(item.id, { dateISO: event.target.value })}
                            />
                            <input
                              type="time"
                              value={selectedTime}
                              onChange={(event) => upsertBenefitScheduleDraft(item.id, { time: event.target.value })}
                            />
                          </div>
                          <div className="task-schedule-note">
                            Smart suggestion: {smartBenefitSchedule.dateISO} {smartBenefitSchedule.time}
                          </div>
                          <div className="stretch-step-actions">
                            <button
                              type="button"
                              className="tax-preset-btn glass-inner"
                              onClick={() => autoScheduleBenefit(item)}
                            >
                              Auto smart schedule
                            </button>
                            <button
                              type="button"
                              className="tax-preset-btn glass-inner"
                              onClick={() => addBenefitFollowUp(item, { dateISO: selectedDateISO, time: selectedTime })}
                            >
                              Add with selected date/time
                            </button>
                          </div>
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
                      {BENEFIT_ASK_REQUIRED_BY_ID[item.id] && (
                        <div className="detail-section">
                          <div className="detail-label">Important:</div>
                          <div className="detail-text">Not always auto-granted. Ask directly at counter/HR so this benefit is not missed.</div>
                        </div>
                      )}
                        {Array.isArray(benefitTasksById[item.id]) && benefitTasksById[item.id].length > 0 && (
                          <div className="detail-section">
                            <div className="detail-label">Checklist flow:</div>
                            <div className="detail-text">
                              {benefitTasksById[item.id].map((task) => {
                                const done = Boolean(checked?.[task.id])
                                return (
                                  <div key={`${item.id}-task-${task.id}`} className="benefit-task-row">
                                    <strong>{task.id.toUpperCase()}</strong> - {task.text} ({task.phaseTitle})
                                    <span className={`badge ${done ? 'done-badge' : 'pending-badge'}`}>{done ? 'Done' : 'Pending'}</span>
                                  </div>
                                )
                              })}
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
                )
              })}
            </ul>
            {filteredMoneyTracker.length === 0 && (
              <p className="section-note">No benefits match current source/owner/status filters.</p>
            )}
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.work} /></span>
              <div>
                <h2>Father / Family Lane (Draft)</h2>
                <span className="section-count">
                  {visibleFamilyBenefitsDoneCount}/{filteredFamilyBenefits.length || FAMILY_BENEFIT_ITEMS.length} checked
                </span>
              </div>
            </div>
            <p className="section-note">
              Optional Shinji-side support lane (kaisha/hoken). Naomi flow above stays unchanged.
            </p>
            <p className="section-note">
              Full progress: {familyBenefitsDoneCount}/{FAMILY_BENEFIT_ITEMS.length} checked.
            </p>
            <div className="glass-tabs salary-mini-tabs">
              <button
                type="button"
                className={`glass-tab ${familyBenefitsOpen ? 'active' : ''}`}
                onClick={() => setFamilyBenefitsOpen(prev => !prev)}
              >
                <span>{familyBenefitsOpen ? 'Hide lane' : 'Show lane'}</span>
              </button>
              {familyBenefitsOpen && (
                <button
                  type="button"
                  className={`glass-tab ${familyLaneToolsOpen ? 'active' : ''}`}
                  onClick={() => setFamilyLaneToolsOpen(prev => !prev)}
                >
                  <span>{familyLaneToolsOpen ? 'Hide filters' : 'Show filters'}</span>
                </button>
              )}
            </div>
            {familyBenefitsOpen && (
              <>
                {familyLaneToolsOpen && (
                  <>
                    <div className="glass-tabs salary-mini-tabs">
                      {FAMILY_BENEFIT_GROUP_FILTERS.map((group) => (
                        <button
                          key={`family-group-${group.id}`}
                          type="button"
                          className={`glass-tab ${familyBenefitGroupFilter === group.id ? 'active' : ''}`}
                          onClick={() => setFamilyBenefitGroupFilter(group.id)}
                        >
                          <span>{group.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="glass-tabs salary-mini-tabs">
                      {BENEFIT_STATUS_FILTERS.map((status) => (
                        <button
                          key={`family-status-${status.id}`}
                          type="button"
                          className={`glass-tab ${familyBenefitStatusFilter === status.id ? 'active' : ''}`}
                          onClick={() => setFamilyBenefitStatusFilter(status.id)}
                        >
                          <span>{status.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="backup-cloud-actions" style={{ marginBottom: '0.45rem' }}>
                      <button
                        type="button"
                        className="btn-glass-secondary"
                        onClick={addVisibleFamilyFollowUps}
                        disabled={!filteredFamilyBenefits.some(item => !familyBenefitsClaimed[item.id])}
                      >
                        Add pending follow-ups to Home calendar
                      </button>
                    </div>
                  </>
                )}
                <ul>
                  {filteredFamilyBenefits.map((item) => {
                  const detailId = `family-${item.id}`
                  const claimed = Boolean(familyBenefitsClaimed[item.id])
                  const owner = normalizeBenefitOwner(item.owner || 'family')
                  return (
                    <li key={item.id} className={`glass-card money-card ${claimed ? 'done' : ''}`}>
                      <div className="money-card-top">
                        <span className="checkbox glass-inner" onClick={() => toggleFamilyBenefit(item.id)}>
                          {claimed ? '\u2713' : ''}
                        </span>
                        <div className="money-card-main">
                          <div className="money-card-badges">
                            <span className={`badge owner-badge owner-${owner}`}>{getBenefitOwnerLabel(owner)}</span>
                            <span className="badge money-badge">{item.estimateLabel}</span>
                            {item.askRequired && !claimed && <span className="badge ask-badge">ASK</span>}
                          </div>
                          <span className={`item-text ${claimed ? 'claimed' : ''}`}>{item.label}</span>
                        </div>
                        <button className="info-btn glass-inner" onClick={(event) => toggleExpand(detailId, event)}>
                          {expandedItem === detailId ? 'Hide' : 'i'}
                        </button>
                      </div>
                      {expandedItem === detailId && (
                        <div className="money-detail">
                          <div className="detail-section">
                            <div className="detail-label">Action:</div>
                            <div className="detail-text">{item.howTo}</div>
                          </div>
                          <div className="detail-section">
                            <div className="detail-label">Claim owner:</div>
                            <div className="detail-text">{getBenefitOwnerLabel(owner)}</div>
                          </div>
                          <div className="detail-section">
                            <div className="detail-label">Where:</div>
                            <div className="detail-text">{item.where}</div>
                          </div>
                          <div className="detail-section">
                            <div className="detail-label">Timing:</div>
                            <div className="detail-text">{item.timing}</div>
                          </div>
                          <div className="detail-section">
                            <button
                              type="button"
                              className="tax-preset-btn glass-inner"
                              onClick={() => addFamilyBenefitFollowUp(item)}
                            >
                              Add follow-up to Home calendar
                            </button>
                          </div>
                          {Array.isArray(item.sourceLinks) && item.sourceLinks.length > 0 && (
                            <div className="detail-section">
                              <div className="detail-label">Official sources:</div>
                              <div className="detail-text">
                                {item.sourceLinks.map((source, index) => (
                                  <div key={`${item.id}-family-source-${index}`}>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
                </ul>
                {filteredFamilyBenefits.length === 0 && (
                  <p className="section-note">No family-lane items match current filters.</p>
                )}
              </>
            )}
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.tax} /></span>
              <div><h2>18-Year Support Projection</h2></div>
            </div>
            <p className="section-note">
              Strict mode is conservative baseline. Stretch mode adds optional/campaign capture items with an explicit playbook.
            </p>
            <div className="glass-tabs salary-mini-tabs projection-mode-tabs">
              {[
                { id: 'strict', label: 'Strict Baseline' },
                { id: 'stretch', label: 'Stretch Scenario' },
              ].map(option => (
                <button
                  key={`support-scenario-${option.id}`}
                  type="button"
                  className={`glass-tab ${supportProjectionScenario === option.id ? 'active' : ''}`}
                  onClick={() => setSupportProjectionScenario(option.id)}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="glass-tabs salary-mini-tabs projection-mode-tabs">
              {[
                { id: 'one', label: '1 Child Model' },
                { id: 'two', label: '2 Child Model' },
              ].map(option => (
                <button
                  key={`support-child-${option.id}`}
                  type="button"
                  className={`glass-tab ${supportProjectionChildModel === option.id ? 'active' : ''}`}
                  onClick={() => setSupportProjectionChildModel(option.id)}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="projection-assumption-strip glass-inner">
              <span>
                {supportProjectionScenario === 'strict'
                  ? 'Strict excludes optional refund/campaign/ask-only cash.'
                  : 'Stretch includes optional refund/campaign/ask-only cash capture.'}
              </span>
              <strong>{supportProjectionScenario === 'strict' ? 'Conservative' : 'Maximize'}</strong>
            </div>
            <div className="ceiling-table">
              <div className="ceil-row glass-inner">
                <span>Direct cash around birth ({supportProjectionScenario === 'strict' ? 'strict baseline' : 'strict + stretch extras'})</span>
                <span>{formatYen(
                  supportProjectionScenario === 'strict'
                    ? supportProjection.directCashStrict
                    : supportProjection.directCashStretch
                )}</span>
              </div>
              {supportProjectionScenario === 'stretch' && (
                <div className="ceil-row glass-inner">
                  <span>Stretch-only optional cash pool (refund/ask/campaign)</span>
                  <span>+ {formatYen(supportProjection.directCashStretchOnly)}</span>
                </div>
              )}
              {supportProjectionScenario === 'strict' && (
                <div className="ceil-row glass-inner">
                  <span>Optional cash not counted in strict baseline</span>
                  <span>{formatYen(supportProjection.directCashStretchOnly)}</span>
                </div>
              )}
              <div className="ceil-row glass-inner">
                <span>Income replacement cash (leave benefits)</span>
                <span>{formatYen(supportProjection.incomeReplacementCash)}</span>
              </div>
              <div className="ceil-row glass-inner">
                <span>Cost savings (medical/education, configured)</span>
                <span>{formatYen(supportProjection.costSavingsConfigured)}</span>
              </div>
              <div className="ceil-row glass-inner">
                <span>Tax benefits over time (18 years)</span>
                <span>{formatYen(supportProjection.taxOver18y)} ({formatYen(supportProjection.taxAnnualEstimate)}/year)</span>
              </div>
              <div className="ceil-row glass-inner">
                <span>Child allowance ({supportProjectionChildModel === 'two' ? '2-child model' : '1-child model'})</span>
                <span>{formatYen(activeChildAllowance)}</span>
              </div>
              <div className="ceil-row total glass-inner">
                <span>Total 18-year projection ({supportProjectionScenario === 'strict' ? 'strict' : 'stretch'})</span>
                <span>{formatYen(activeProjectionTotal)}</span>
              </div>
              <div className="ceil-row glass-inner projection-compare-row">
                <span>Strict vs Stretch delta ({supportProjectionChildModel === 'two' ? '2-child' : '1-child'})</span>
                <span>+ {formatYen(stretchUpside)}</span>
              </div>
            </div>
            {supportProjection.stretchOnlyRows.length > 0 && (
              <div className="support-optional-list">
                <div className="detail-label">Stretch-only benefit sources</div>
                <div className="detail-text">
                  {supportProjection.stretchOnlyRows.map((row) => (
                    <div key={`stretch-only-${row.id}`} className="benefit-task-row">
                      <strong>{row.id.toUpperCase()}</strong> - {row.label}
                      <span className="badge money-badge">{formatYenCompact(row.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              className="cal-collapse-btn"
              onClick={() => setSupportPlaybookOpen(prev => !prev)}
              aria-expanded={supportPlaybookOpen}
            >
              {supportPlaybookOpen ? 'Hide Stretch Maximizer' : 'Show Stretch Maximizer'}
            </button>
            {supportPlaybookOpen && (
              <div className="stretch-playbook">
                <p className="section-note">
                  Detailed maximize flow: may undo/remove na bawat step, plus one-click auto schedule papunta sa task calendar flow.
                </p>
                <div className="backup-cloud-actions" style={{ marginBottom: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    onClick={addStretchPlaybookBatch}
                    disabled={STRETCH_PLAYBOOK_STEPS.every(step => hasStretchStepPlan(step))}
                  >
                    Add all missing stretch steps to Home calendar
                  </button>
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    onClick={autoScheduleStretchTaskBatch}
                    disabled={STRETCH_PLAYBOOK_STEPS.every(step => getSchedulableMissingTaskCount(step) === 0)}
                  >
                    One-click: auto-schedule linked tasks (best dates)
                  </button>
                  <button
                    type="button"
                    className="btn-glass-secondary"
                    onClick={removeAllStretchEntries}
                    disabled={STRETCH_PLAYBOOK_STEPS.every(step => getStretchStepEntries(step, 'all').length === 0)}
                  >
                    Undo all stretch adds (calendar + task schedules)
                  </button>
                </div>
                {STRETCH_PLAYBOOK_STEPS.map((step) => {
                  const relatedBenefitIds = Array.isArray(step.benefitIds) ? step.benefitIds : []
                  const relatedTaskIds = resolveStepTaskIds(step)
                  const hasStepCard = hasStretchStepPlan(step)
                  const hasTaskSchedules = hasStretchTaskPlans(step)
                  const missingTaskCount = getSchedulableMissingTaskCount(step)
                  const bestDateISO = getBestDateISOForStep(step)
                  const linkedAmount = relatedBenefitIds.reduce((acc, id) => {
                    const benefit = moneyTracker.find(item => item.id === id)
                    return acc + Math.max(0, Number(benefit?.amount) || 0)
                  }, 0)
                  return (
                    <div key={step.id} className="stretch-step glass-inner">
                      <div className="stretch-step-top">
                        <div>
                          <div className="stretch-step-title">{step.title}</div>
                          <div className="stretch-step-meta">
                            <span>Best date: {bestDateISO}</span>
                            {step.time && <span>{step.time}</span>}
                            {step.location && <span>{step.location}</span>}
                          </div>
                        </div>
                        <span className="badge money-badge">{formatYenCompact(linkedAmount)} pool</span>
                      </div>
                      <div className="stretch-step-note"><strong>Focus:</strong> {step.focus}</div>
                      <div className="stretch-step-note"><strong>Target:</strong> {step.target}</div>
                      <div className="stretch-step-badges">
                        {relatedBenefitIds.map((benefitId) => (
                          <span key={`${step.id}-${benefitId}`} className="badge owner-badge owner-family">
                            {benefitId.toUpperCase()}
                          </span>
                        ))}
                        {relatedTaskIds.map((taskId) => (
                          <span key={`${step.id}-task-${taskId}`} className="badge owner-badge owner-naomi">
                            {taskId.toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="stretch-step-actions">
                        <button
                          type="button"
                          className="tax-preset-btn glass-inner"
                          onClick={() => (hasStepCard ? removeStretchStepFromCalendar(step) : addStretchStepToCalendar(step))}
                        >
                          {hasStepCard ? 'Remove step from Home calendar' : 'Add step to Home calendar'}
                        </button>
                        <button
                          type="button"
                          className="tax-preset-btn glass-inner"
                          onClick={() => (hasTaskSchedules ? removeStretchTaskSchedulesForStep(step) : autoScheduleStretchTasksForStep(step))}
                          disabled={!hasTaskSchedules && missingTaskCount === 0}
                        >
                          {hasTaskSchedules ? 'Undo auto task schedules' : `Auto-schedule tasks (${missingTaskCount})`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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


