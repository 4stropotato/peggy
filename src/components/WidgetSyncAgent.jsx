import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../AppContext'
import { checkupSchedule, phases, supplements } from '../data'
import { reloadNativeWidgetTimelines, syncWidgetSnapshot } from '../native/widgetBridge'

const RELOAD_COOLDOWN_MS = 5 * 60 * 1000

function toIsoDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isValidDate(value) {
  if (!value) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime())
}

export default function WidgetSyncAgent() {
  const {
    checked,
    dailySupp,
    dueDate,
    checkups,
    suppSchedule,
    attendance,
  } = useApp()

  const lastPayloadRef = useRef('')
  const lastReloadRef = useRef(0)

  const snapshot = useMemo(() => {
    const now = new Date()
    const todayKey = toIsoDate(now)
    const todayDateString = now.toDateString()

    let supplementsTaken = 0
    let supplementsTotal = 0
    supplements.forEach((supp) => {
      const schedule = suppSchedule?.[supp.id]
      if (schedule?.enabled === false) return
      const times = schedule?.times || supp.defaultTimes
      times.forEach((_, doseIndex) => {
        supplementsTotal += 1
        if (dailySupp?.[`${supp.id}-${doseIndex}-${todayDateString}`]) {
          supplementsTaken += 1
        }
      })
    })

    const checkupsDone = checkupSchedule.filter(item => checkups?.[item.id]?.completed).length
    const checkupsTotal = checkupSchedule.length

    const totalTasks = phases.reduce((acc, phase) => acc + phase.items.length, 0)
    const doneTasks = phases.reduce((acc, phase) => (
      acc + phase.items.filter(item => checked?.[item.id]).length
    ), 0)
    const openTasks = Math.max(0, totalTasks - doneTasks)

    const attendedToday = Boolean(attendance?.[todayKey]?.worked)

    let daysUntilDue = 0
    let weeksPregnant = 0
    if (isValidDate(dueDate)) {
      const due = new Date(dueDate)
      daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      weeksPregnant = Math.max(0, 40 - Math.ceil(daysUntilDue / 7))
    }

    const supplementsLeft = Math.max(0, supplementsTotal - supplementsTaken)
    const reminderText = supplementsLeft > 0
      ? `${supplementsLeft} supplement dose(s) left today`
      : openTasks > 0
        ? `${openTasks} open task(s) to review`
        : 'All key items done today'

    return {
      updatedAt: now.toISOString(),
      dueDate: dueDate || '',
      daysUntilDue,
      weeksPregnant,
      supplementsTaken,
      supplementsTotal,
      checkupsDone,
      checkupsTotal,
      openTasks,
      attendedToday,
      reminderText,
    }
  }, [checked, dailySupp, dueDate, checkups, suppSchedule, attendance])

  const payloadKey = useMemo(() => JSON.stringify(snapshot), [snapshot])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled) return
      if (payloadKey === lastPayloadRef.current) return
      lastPayloadRef.current = payloadKey

      const syncResult = await syncWidgetSnapshot(snapshot)
      if (!syncResult?.ok) return

      const now = Date.now()
      if (now - lastReloadRef.current < RELOAD_COOLDOWN_MS) return
      lastReloadRef.current = now
      await reloadNativeWidgetTimelines()
    }, 700)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [payloadKey, snapshot])

  return null
}
