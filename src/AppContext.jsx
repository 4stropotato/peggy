import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { saveState, loadState } from './db'
import { supplements, OPTIMAL_SUPP_SCHEDULE } from './data'

const AppContext = createContext()

function useLS(key, initial) {
  const initialRef = useRef(initial)
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch { return initial }
  })
  const hasMountedRef = useRef(false)

  // Try to recover from IndexedDB if localStorage was cleared
  useEffect(() => {
    loadState(key).then(idbValue => {
      if (idbValue !== null) {
        const lsValue = localStorage.getItem(key)
        if (!lsValue || lsValue === 'null' || lsValue === '""' || lsValue === '{}' || lsValue === '[]') {
          const hasData = typeof idbValue === 'object'
            ? (Array.isArray(idbValue) ? idbValue.length > 0 : Object.keys(idbValue).length > 0)
            : Boolean(idbValue)
          if (hasData) {
            setValue(idbValue)
          }
        }
      }
    }).catch(() => {})
  }, [key])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(key)
        setValue(raw ? JSON.parse(raw) : initialRef.current)
      } catch {
        setValue(initialRef.current)
      }
    }

    window.addEventListener('peggy-backup-restored', syncFromStorage)
    return () => window.removeEventListener('peggy-backup-restored', syncFromStorage)
  }, [key])

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
    saveState(key, value)
    const isSyncApplying = typeof window !== 'undefined' && window.__peggySyncApplying
    if (hasMountedRef.current && typeof window !== 'undefined' && !isSyncApplying) {
      window.dispatchEvent(new CustomEvent('peggy-local-changed', { detail: { key } }))
    } else {
      hasMountedRef.current = true
    }
  }, [key, value])

  return [value, setValue]
}

// Locked optimal schedule â€” no user editing
const defaultSuppSchedule = OPTIMAL_SUPP_SCHEDULE
const defaultHealthCalendarVisibility = Object.freeze({
  supps: true,
  work: true,
  checkups: true,
  mood: true,
})

function createDefaultWorkLocation() {
  return {
    enabled: false,
    name: '',
    lat: '',
    lng: '',
    radiusMeters: 180,
    homeName: '',
    homeLat: '',
    homeLng: '',
    homeRadiusMeters: 220,
    autoHours: 8,
    awayMinutesForWork: 90,
    lastAutoLogDate: '',
    lastInsideAt: '',
    lastAutoReason: '',
  }
}

function createDefaultFinanceConfig() {
  return {
    payrollProfiles: {
      naomi: {
        payMode: 'fixed_day',
        payDay: 15,
        delayMonths: 1,
        monthlyAdjustment: 0,
      },
      husband: {
        payMode: 'month_end',
        payDay: 30,
        delayMonths: 1,
        monthlyAdjustment: 0,
      },
    },
  }
}

export function AppProvider({ children }) {
  const [checked, setChecked] = useLS('baby-prep-checked', {})
  const [dailySupp, setDailySupp] = useLS('baby-prep-daily', {})
  const [moneyClaimed, setMoneyClaimed] = useLS('baby-prep-money', {})
  const [dueDate, setDueDate] = useLS('baby-prep-due', '2026-10-04')
  const [theme, setTheme] = useLS('baby-prep-theme', 'light')
  const [iconStyle, setIconStyle] = useLS('baby-prep-icon-style', 'minimal-clean')
  const [salary, setSalary] = useLS('baby-prep-salary', [])
  const [payRates, setPayRates] = useLS('baby-prep-pay-rates', [])
  const [checkups, setCheckups] = useLS('baby-prep-checkups', {})
  const [moods, setMoods] = useLS('baby-prep-moods', [])
  // Health tab calendar collapse/expand state per sub-tab.
  const [healthCalendarVisibility, setHealthCalendarVisibility] = useLS(
    'baby-prep-health-calendar-visibility',
    { ...defaultHealthCalendarVisibility },
  )
  // Personal calendar planner entries by day (ISO): { '2026-02-10': [{ id, time, title, location, notes, done, taskIds?: [] }] }
  const [planner, setPlanner] = useLS('baby-prep-planner', {})
  const [doctor, setDoctor] = useLS('baby-prep-doctor', { name: '', hospital: '', phone: '', address: '', notes: '' })
  const [contacts, setContacts] = useLS('baby-prep-contacts', [
    { id: '1', name: 'Naomi', phone: '', relationship: 'Wife / Mommy' },
    { id: '2', name: 'Shinji', phone: '', relationship: 'Husband / Dada' },
    { id: '3', name: 'Tom', phone: '', relationship: 'Ate / Sister' },
  ])
  const [taxInputs, setTaxInputs] = useLS('baby-prep-tax', {
    annualIncome: '',
    spouseIncome: '',
    medicalExpenses: '',
    socialInsurance: ''
  })
  // Work attendance for Naomi: { '2026-02-07': { worked: true, hours: 8, note: '' } }
  const [attendance, setAttendance] = useLS('baby-prep-attendance', {})
  // Husband work attendance for family-income transparency.
  const [husbandAttendance, setHusbandAttendance] = useLS('baby-prep-attendance-husband', {})
  // Finance household settings (single mother mode support).
  const [familyConfig, setFamilyConfig] = useLS('baby-prep-family-config', {
    includeHusband: true,
  })
  // Finance settings and household expense tracker.
  const [financeConfig, setFinanceConfig] = useLS('baby-prep-finance-config', createDefaultFinanceConfig())
  const [expenses, setExpenses] = useLS('baby-prep-expenses', [])
  // Work geofence auto-logging config (synced per account via cloud backup).
  const [workLocation, setWorkLocation] = useLS('baby-prep-work-location', createDefaultWorkLocation())
  // Husband geofence config (separate from Naomi).
  const [husbandWorkLocation, setHusbandWorkLocation] = useLS('baby-prep-work-location-husband', createDefaultWorkLocation())
  // Supplement schedule config: { suppId: { enabled, times: ['08:00', '20:00'], timesPerDay } }
  const [suppSchedule, setSuppSchedule] = useLS('baby-prep-supp-schedule', defaultSuppSchedule)
  // Supplement last taken timestamps: { 'suppId-doseIndex': 'ISO timestamp' }
  const [suppLastTaken, setSuppLastTaken] = useLS('baby-prep-supp-taken', {})
  // Supplement bottle start dates + remaining: { suppId: { startDate: 'ISO', remaining: 90 } }
  const [suppBottles, setSuppBottles] = useLS('baby-prep-supp-bottles', {})

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // Synchronous guard ref - prevents rapid clicks from bypassing stale state check
  const suppToggleGuard = useRef(new Set())

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }))

  const toggleSupp = (id, doseIndex = 0) => {
    const today = new Date().toDateString()
    const key = `${id}-${doseIndex}-${today}`

    // Guard: check BOTH React state AND synchronous ref (ref catches rapid clicks before re-render)
    if (dailySupp[key] || suppToggleGuard.current.has(key)) return
    suppToggleGuard.current.add(key)

    setDailySupp(prev => ({ ...prev, [key]: true }))

    // Track last taken time
    const takenKey = `${id}-${doseIndex}`
    setSuppLastTaken(prev => ({
      ...prev,
      [takenKey]: new Date().toISOString()
    }))

    // Decrease bottle remaining (only fires once thanks to ref guard)
    const supp = supplements.find(s => s.id === id)
    if (supp) {
      setSuppBottles(prev => {
        const bottle = prev[id] || { startDate: new Date().toISOString(), remaining: supp.bottleSize }
        const newRemaining = Math.max(0, bottle.remaining - supp.perDose)
        // Auto-reset when bottle is empty (new bottle!)
        if (newRemaining <= 0) {
          return { ...prev, [id]: { startDate: new Date().toISOString(), remaining: supp.bottleSize } }
        }
        return { ...prev, [id]: { ...bottle, remaining: newRemaining } }
      })
    }
  }

  // Undo a supplement dose (for mistakes - separate action)
  const undoSupp = (id, doseIndex = 0) => {
    const today = new Date().toDateString()
    const key = `${id}-${doseIndex}-${today}`
    if (!dailySupp[key] && !suppToggleGuard.current.has(key)) return
    suppToggleGuard.current.delete(key) // Allow re-toggle after undo
    setDailySupp(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    // Restore bottle count
    const supp = supplements.find(s => s.id === id)
    if (supp) {
      setSuppBottles(prev => {
        const bottle = prev[id] || { startDate: new Date().toISOString(), remaining: supp.bottleSize }
        return { ...prev, [id]: { ...bottle, remaining: Math.min(supp.bottleSize, bottle.remaining + supp.perDose) } }
      })
    }
  }

  const isSuppTaken = (id, doseIndex = 0) => {
    const today = new Date().toDateString()
    return dailySupp[`${id}-${doseIndex}-${today}`] || false
  }

  // Check legacy daily supp format (for backward compatibility)
  const isSuppTakenLegacy = (id) => {
    const today = new Date().toDateString()
    return dailySupp[`${id}-${today}`] || dailySupp[`${id}-0-${today}`] || false
  }

  const toggleMoney = (id) => setMoneyClaimed(prev => ({ ...prev, [id]: !prev[id] }))

  const addSalary = (entry) => setSalary(prev => [...prev, { ...entry, id: Date.now().toString(36) }])
  const removeSalary = (id) => setSalary(prev => prev.filter(s => s.id !== id))
  const addPayRate = (entry) => setPayRates(prev => [...prev, { ...entry, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }])
  const removePayRate = (id) => setPayRates(prev => prev.filter(r => r.id !== id))
  const updatePayRate = (id, patch) => setPayRates(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))

  // One-time migration from legacy monthly salary entries into pay-rates model.
  useEffect(() => {
    if (!Array.isArray(payRates) || payRates.length > 0) return
    if (!Array.isArray(salary) || salary.length === 0) return
    const migrated = salary
      .map((entry) => {
        const month = String(entry?.month || '').trim()
        const amount = Number(entry?.amount) || 0
        if (!month || amount <= 0) return null
        return {
          id: `mig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          person: 'naomi',
          basis: 'monthly',
          rate: amount,
          effectiveFrom: `${month}-01`,
          hoursPerDay: '',
          workDaysPerMonth: '',
          note: String(entry?.memo || 'Migrated from legacy salary tracker'),
        }
      })
      .filter(Boolean)
    if (migrated.length) setPayRates(migrated)
  }, [payRates, salary, setPayRates])

  const updateCheckup = (visitId, data) => setCheckups(prev => ({ ...prev, [visitId]: { ...prev[visitId], ...data } }))

  const addMood = (entry) => setMoods(prev => [{ ...entry, id: Date.now().toString(36), date: new Date().toISOString() }, ...prev])

  // Planner functions (simple personal organizer per date)
  const addPlan = (dateISO, data) => {
    const dateKey = String(dateISO || '').trim()
    if (!dateKey) return
    const title = String(data?.title || '').trim()
    if (!title) return

    const time = String(data?.time || '').trim()
    const location = String(data?.location || '').trim()
    const notes = String(data?.notes || '').trim()
    const done = Boolean(data?.done)
    const taskIds = Array.isArray(data?.taskIds)
      ? data.taskIds.map(t => String(t || '').trim()).filter(Boolean)
      : []
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

    setPlanner(prev => {
      const list = Array.isArray(prev?.[dateKey]) ? prev[dateKey] : []
      return {
        ...prev,
        [dateKey]: [...list, { id, time, title, location, notes, done, taskIds }]
      }
    })

    if (done && taskIds.length) {
      setChecked(prev => {
        const next = { ...prev }
        for (const taskId of taskIds) {
          next[taskId] = true
        }
        return next
      })
    }
  }

  const updatePlan = (dateISO, id, patch) => {
    const dateKey = String(dateISO || '').trim()
    const itemId = String(id || '').trim()
    if (!dateKey || !itemId) return

    const currentList = Array.isArray(planner?.[dateKey]) ? planner[dateKey] : []
    const current = currentList.find(item => item?.id === itemId) || null
    const nextDone = patch && Object.prototype.hasOwnProperty.call(patch, 'done')
      ? Boolean(patch.done)
      : Boolean(current?.done)
    const nextTaskIds = patch && Object.prototype.hasOwnProperty.call(patch, 'taskIds')
      ? (Array.isArray(patch.taskIds) ? patch.taskIds.map(t => String(t || '').trim()).filter(Boolean) : [])
      : (Array.isArray(current?.taskIds) ? current.taskIds.map(t => String(t || '').trim()).filter(Boolean) : [])

    setPlanner(prev => {
      const list = Array.isArray(prev?.[dateKey]) ? prev[dateKey] : []
      if (!list.length) return prev
      const next = list.map(item => {
        if (item?.id !== itemId) return item
        const title = patch && Object.prototype.hasOwnProperty.call(patch, 'title')
          ? String(patch.title || '').trim()
          : String(item?.title || '').trim()
        const taskIds = patch && Object.prototype.hasOwnProperty.call(patch, 'taskIds')
          ? (Array.isArray(patch.taskIds) ? patch.taskIds.map(t => String(t || '').trim()).filter(Boolean) : [])
          : (Array.isArray(item?.taskIds) ? item.taskIds.map(t => String(t || '').trim()).filter(Boolean) : [])
        return {
          ...item,
          ...patch,
          title,
          time: patch && Object.prototype.hasOwnProperty.call(patch, 'time') ? String(patch.time || '').trim() : String(item?.time || '').trim(),
          location: patch && Object.prototype.hasOwnProperty.call(patch, 'location') ? String(patch.location || '').trim() : String(item?.location || '').trim(),
          notes: patch && Object.prototype.hasOwnProperty.call(patch, 'notes') ? String(patch.notes || '').trim() : String(item?.notes || '').trim(),
          done: patch && Object.prototype.hasOwnProperty.call(patch, 'done') ? Boolean(patch.done) : Boolean(item?.done),
          taskIds,
        }
      })
      return { ...prev, [dateKey]: next }
    })

    if (nextDone && nextTaskIds.length) {
      setChecked(prev => {
        const next = { ...prev }
        for (const taskId of nextTaskIds) {
          next[taskId] = true
        }
        return next
      })
    }
  }

  const removePlan = (dateISO, id) => {
    const dateKey = String(dateISO || '').trim()
    const itemId = String(id || '').trim()
    if (!dateKey || !itemId) return

    setPlanner(prev => {
      const list = Array.isArray(prev?.[dateKey]) ? prev[dateKey] : []
      if (!list.length) return prev
      const nextList = list.filter(item => item?.id !== itemId)
      const next = { ...prev }
      if (nextList.length) {
        next[dateKey] = nextList
      } else {
        delete next[dateKey]
      }
      return next
    })
  }

  const togglePlanDone = (dateISO, id) => {
    const dateKey = String(dateISO || '').trim()
    const itemId = String(id || '').trim()
    if (!dateKey || !itemId) return

    const currentList = Array.isArray(planner?.[dateKey]) ? planner[dateKey] : []
    const current = currentList.find(item => item?.id === itemId) || null
    const willBeDone = Boolean(current) ? !Boolean(current.done) : false
    const taskIdsToMark = willBeDone && Array.isArray(current?.taskIds)
      ? current.taskIds.map(t => String(t || '').trim()).filter(Boolean)
      : []

    setPlanner(prev => {
      const list = Array.isArray(prev?.[dateKey]) ? prev[dateKey] : []
      if (!list.length) return prev
      const next = list.map(item => item?.id === itemId ? { ...item, done: !item.done } : item)
      return { ...prev, [dateKey]: next }
    })

    if (taskIdsToMark.length) {
      setChecked(prev => {
        const next = { ...prev }
        for (const taskId of taskIdsToMark) {
          next[taskId] = true
        }
        return next
      })
    }
  }

  const addContact = (contact) => setContacts(prev => [...prev, { ...contact, id: Date.now().toString(36) }])
  const removeContact = (id) => setContacts(prev => prev.filter(c => c.id !== id))
  const updateContact = (id, data) => setContacts(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))

  // Attendance functions
  const markAttendance = (date, data) => {
    setAttendance(prev => ({ ...prev, [date]: data }))
  }
  const getAttendance = (date) => attendance[date] || null
  const removeAttendance = (date) => {
    const dateKey = String(date || '').trim()
    if (!dateKey) return
    setAttendance(prev => {
      const safe = prev && typeof prev === 'object' ? prev : {}
      if (!Object.prototype.hasOwnProperty.call(safe, dateKey)) return safe
      const next = { ...safe }
      delete next[dateKey]
      return next
    })
  }
  const markHusbandAttendance = (date, data) => {
    setHusbandAttendance(prev => ({ ...prev, [date]: data }))
  }
  const getHusbandAttendance = (date) => husbandAttendance[date] || null
  const removeHusbandAttendance = (date) => {
    const dateKey = String(date || '').trim()
    if (!dateKey) return
    setHusbandAttendance(prev => {
      const safe = prev && typeof prev === 'object' ? prev : {}
      if (!Object.prototype.hasOwnProperty.call(safe, dateKey)) return safe
      const next = { ...safe }
      delete next[dateKey]
      return next
    })
  }

  const addExpense = (entry) => {
    const date = String(entry?.date || '').trim()
    const amount = Math.max(0, Number(entry?.amount) || 0)
    if (!date || amount <= 0) return
    const category = String(entry?.category || 'other').trim() || 'other'
    const note = String(entry?.note || '').trim()
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setExpenses(prev => [{ id, date, category, amount, note }, ...(Array.isArray(prev) ? prev : [])])
  }
  const removeExpense = (id) => {
    const targetId = String(id || '').trim()
    if (!targetId) return
    setExpenses(prev => (Array.isArray(prev) ? prev.filter(item => item?.id !== targetId) : []))
  }

  // Supplement bottle functions
  const resetBottle = (suppId) => {
    const supp = supplements.find(s => s.id === suppId)
    if (supp) {
      setSuppBottles(prev => ({
        ...prev,
        [suppId]: { startDate: new Date().toISOString(), remaining: supp.bottleSize }
      }))
    }
  }

  const value = {
    checked, toggle,
    dailySupp, toggleSupp, undoSupp, isSuppTaken, isSuppTakenLegacy,
    moneyClaimed, toggleMoney,
    dueDate, setDueDate,
    salary, addSalary, removeSalary,
    payRates, addPayRate, removePayRate, updatePayRate,
    checkups, updateCheckup,
    moods, addMood,
    healthCalendarVisibility, setHealthCalendarVisibility,
    planner, addPlan, updatePlan, removePlan, togglePlanDone,
    doctor, setDoctor,
    contacts, addContact, removeContact, updateContact,
    taxInputs, setTaxInputs,
    attendance, markAttendance, getAttendance, removeAttendance, workLocation, setWorkLocation,
    husbandAttendance, markHusbandAttendance, getHusbandAttendance, removeHusbandAttendance, husbandWorkLocation, setHusbandWorkLocation,
    familyConfig, setFamilyConfig,
    financeConfig, setFinanceConfig,
    expenses, addExpense, removeExpense,
    suppSchedule,
    suppLastTaken, suppBottles, resetBottle,
    theme, toggleTheme,
    iconStyle, setIconStyle
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
