import { useEffect, useRef } from 'react'
import { useApp } from '../AppContext'
import { babyNamesInfo } from '../infoData'
import { getCloudSession, isCloudConfigured, cloudSyncPendingReminders } from '../cloudSync'
import { getPushDeviceId, isPushSupported } from '../pushSync'
import {
  appendSmartNotifInbox,
  buildDailyTip,
  buildDailyTipReminder,
  buildMoodReminder,
  buildNameSpotlight,
  buildPlannerReminder,
  buildSupplementReminder,
  buildWorkReminder,
  getMoodReminderContext,
  getPlannerReminderContext,
  getSupplementReminderContext,
  getWorkReminderContext,
  hasSentNotificationSlot,
  isSmartNotifChannelEnabled,
  isNowInSmartNotifQuietHours,
  markNotificationSlotSent,
  readSmartNotifChannels,
  readSmartNotifEnabled,
  readSmartNotifQuietHours,
} from '../reminderContent'

const APP_BASE = import.meta.env.BASE_URL || '/'
const NOTIF_ICON = `${APP_BASE.replace(/\/+$/, '/')}icon-192.png`

function canNotifyNow() {
  return true
}

async function syncAppBadge(count) {
  if (typeof navigator === 'undefined') return
  const hasSet = typeof navigator.setAppBadge === 'function'
  const hasClear = typeof navigator.clearAppBadge === 'function'
  if (!hasSet && !hasClear) return

  try {
    const safeCount = Math.max(0, Number(count) || 0)
    if (safeCount <= 0) {
      if (hasClear) {
        await navigator.clearAppBadge()
      } else if (hasSet) {
        await navigator.setAppBadge(0)
      }
      return
    }
    if (hasSet) await navigator.setAppBadge(Math.min(99, safeCount))
  } catch {
    // Badging is optional enhancement only.
  }
}

function getNotifTone(type, level = 'gentle') {
  if (type === 'supp') {
    return {
      titlePrefix: '💊',
      bodyPrefix: 'Supplement check:',
      vibrate: level === 'urgent' ? [140, 70, 140] : [100, 60, 100],
    }
  }
  if (type === 'work') {
    return {
      titlePrefix: '🧾',
      bodyPrefix: 'Work log:',
      vibrate: level === 'urgent' ? [120, 50, 120, 50, 120] : [90, 50, 90],
    }
  }
  if (type === 'tip') {
    return {
      titlePrefix: '💡',
      bodyPrefix: 'Daily tip:',
      vibrate: [70],
    }
  }
  if (type === 'name') {
    return {
      titlePrefix: '🍼',
      bodyPrefix: 'Name spotlight:',
      vibrate: [50, 35, 50],
    }
  }
  if (type === 'plan') {
    return {
      titlePrefix: '📅',
      bodyPrefix: 'Plan:',
      vibrate: level === 'urgent' ? [110, 60, 110] : [70, 40, 70],
    }
  }
  return {
    titlePrefix: '',
    bodyPrefix: '',
    vibrate: [80],
  }
}

function fireNotification({
  title,
  body,
  slotKey,
  type = 'general',
  level = 'gentle',
  urgent = false,
  url = APP_BASE,
  actions = null,
  actionUrls = null,
}) {
  const tone = getNotifTone(type, level)
  const safeTitle = `${tone.titlePrefix} ${String(title || '').trim()}`.trim()
  const baseBody = String(body || '').trim()
  const safeBody = tone.bodyPrefix ? `${tone.bodyPrefix} ${baseBody}`.trim() : baseBody

  try {
    const options = {
      body: safeBody,
      icon: NOTIF_ICON,
      badge: NOTIF_ICON,
      tag: `${type}:${slotKey}`,
      renotify: urgent,
      requireInteraction: urgent || level === 'urgent',
      vibrate: tone.vibrate,
      timestamp: Date.now(),
      data: {
        type,
        level,
        url,
        actionUrls: actionUrls && typeof actionUrls === 'object' ? actionUrls : {},
      },
    }
    if (Array.isArray(actions) && actions.length > 0) {
      options.actions = actions.slice(0, 8)
    }
    new Notification(safeTitle, options)
  } catch {
    // Ignore notification errors from unsupported environments.
  }
}

async function fireNotificationReliable(payload) {
  const tone = getNotifTone(payload?.type, payload?.level)
  const safeTitle = `${tone.titlePrefix} ${String(payload?.title || '').trim()}`.trim()
  const baseBody = String(payload?.body || '').trim()
  const safeBody = tone.bodyPrefix ? `${tone.bodyPrefix} ${baseBody}`.trim() : baseBody
  const options = {
    body: safeBody,
    icon: NOTIF_ICON,
    badge: NOTIF_ICON,
    tag: `${String(payload?.type || 'general')}:${String(payload?.slotKey || '')}`,
    renotify: Boolean(payload?.urgent),
    requireInteraction: Boolean(payload?.urgent || payload?.level === 'urgent'),
    vibrate: tone.vibrate,
    timestamp: Date.now(),
    data: {
      type: payload?.type || 'general',
      level: payload?.level || 'gentle',
      url: payload?.url || APP_BASE,
      actionUrls: payload?.actionUrls && typeof payload.actionUrls === 'object' ? payload.actionUrls : {},
    },
  }
  if (Array.isArray(payload?.actions) && payload.actions.length > 0) {
    options.actions = payload.actions.slice(0, 8)
  }

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration?.showNotification) {
        await registration.showNotification(safeTitle, options)
        return
      }
    }
  } catch {
    // Fall back to Notification API below.
  }

  fireNotification(payload)
}

const SYNC_MIN_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes — fast re-sync when state changes

const SUPP_DISPLAY = {
  prenatal: 'Prenatal', dha: 'DHA', calcium: 'Calcium',
  chlorella: 'Chlorella', choline: 'Choline', vitd: 'Vitamin D',
}

function computeSyncHash(reminders) {
  if (!reminders || !reminders.length) return 'EMPTY'
  return reminders
    .map(r => `${r.type}|${r.tag}|${r.fireAt || ''}|${r.notificationTitle}`)
    .join(';;')
}

// Build a schedule of upcoming reminders with exact fireAt times.
// The server cron sends each one when its time arrives — like an alarm.
function computeUpcomingSchedule(suppSchedule, dailySupp, attendance, planner, moods, now) {
  const upcoming = []
  const dateStr = now.toDateString()
  const dateISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const twoHoursAgo = now.getTime() - 2 * 60 * 60 * 1000

  // --- Supplements: group untaken doses by their scheduled time ---
  const timeGroups = {}
  for (const suppId of Object.keys(suppSchedule || {})) {
    const sched = suppSchedule[suppId]
    if (!sched?.enabled) continue
    const times = Array.isArray(sched.times) ? sched.times : []
    times.forEach((time, doseIndex) => {
      const key = `${suppId}-${doseIndex}-${dateStr}`
      if (dailySupp[key] === true) return // already taken
      if (!timeGroups[time]) timeGroups[time] = []
      timeGroups[time].push(SUPP_DISPLAY[suppId] || suppId)
    })
  }
  for (const time of Object.keys(timeGroups)) {
    const names = timeGroups[time]
    const parts = time.split(':').map(Number)
    const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1] || 0, 0)
    if (fireAt.getTime() < twoHoursAgo) continue
    const isOverdue = fireAt.getTime() <= now.getTime()
    const tone = getNotifTone('supp', isOverdue ? 'urgent' : 'gentle')
    const label = isOverdue ? 'Overdue supplements' : 'Supplement time'
    upcoming.push({
      type: 'supp', level: isOverdue ? 'urgent' : 'gentle',
      notificationTitle: `${tone.titlePrefix} ${label}`.trim(),
      notificationBody: `${tone.bodyPrefix} Take ${names.join(', ')}`.trim(),
      tag: `supp-${dateISO}-${time}`, fireAt: fireAt.toISOString(), priorityScore: isOverdue ? 90 : 70,
    })
  }

  // --- Work: weekday + not yet logged → nudge at 11 AM, urgent at 5 PM ---
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5
  const hasAttendance = attendance && attendance[dateISO]
  if (isWeekday && !hasAttendance) {
    for (const { hour, level } of [{ hour: 11, level: 'gentle' }, { hour: 17, level: 'urgent' }]) {
      const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
      if (fireAt.getTime() < twoHoursAgo) continue
      const tone = getNotifTone('work', level)
      upcoming.push({
        type: 'work', level,
        notificationTitle: `${tone.titlePrefix} Work attendance`.trim(),
        notificationBody: `${tone.bodyPrefix} Log today's work attendance`.trim(),
        tag: `work-${dateISO}-${hour}`, fireAt: fireAt.toISOString(), priorityScore: level === 'urgent' ? 75 : 50,
      })
    }
  }

  // --- Mood: windows at 12, 17, 20 (if not logged today) ---
  const hasMoodToday = Array.isArray(moods) && moods.some(m => String(m?.date || m?.createdAt || '').startsWith(dateISO))
  if (!hasMoodToday) {
    for (const { hour, label, level } of [
      { hour: 12, label: 'Kumusta feeling mo today?', level: 'gentle' },
      { hour: 17, label: 'Afternoon mood check-in', level: 'nudge' },
      { hour: 20, label: 'Evening mood check-in', level: 'urgent' },
    ]) {
      const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
      if (fireAt.getTime() < twoHoursAgo) continue
      upcoming.push({
        type: 'mood', level,
        notificationTitle: '\uD83D\uDE0A Mood check',
        notificationBody: label,
        tag: `mood-${dateISO}-${hour}`, fireAt: fireAt.toISOString(), priorityScore: level === 'urgent' ? 65 : 40,
      })
    }
  }

  // --- Planner: pending plans with time → notify 15 min before ---
  const todayPlans = Array.isArray(planner?.[dateISO]) ? planner[dateISO] : []
  for (const plan of todayPlans) {
    if (plan.done) continue
    const planTime = String(plan.time || '').trim()
    if (!planTime) continue
    const tp = planTime.split(':').map(Number)
    if (!Number.isFinite(tp[0])) continue
    const eventAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tp[0], tp[1] || 0, 0)
    const notifyAt = new Date(eventAt.getTime() - 15 * 60 * 1000)
    if (notifyAt.getTime() < twoHoursAgo) continue
    const tone = getNotifTone('plan', 'gentle')
    upcoming.push({
      type: 'plan', level: 'gentle',
      notificationTitle: `${tone.titlePrefix} ${String(plan.title || 'Upcoming event').trim()}`.trim(),
      notificationBody: `${tone.bodyPrefix} ${planTime} — ${String(plan.title || '').trim()}`.trim(),
      tag: `plan-${dateISO}-${plan.id || planTime}`, fireAt: notifyAt.toISOString(), priorityScore: 85,
    })
  }

  upcoming.sort((a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime())
  return upcoming
}

export default function SmartReminderAgent() {
  const { dailySupp, suppSchedule, attendance, planner, moods } = useApp()
  const lastSyncHashRef = useRef('')
  const lastSyncTimeRef = useRef(0)
  const syncBusyRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined

    const tick = () => {
      if (!readSmartNotifEnabled()) {
        void syncAppBadge(0)
        return
      }

      // Keep iOS home-screen badge clean and avoid stale stuck counts.
      // Notification history is shown inside the app inbox instead.
      void syncAppBadge(0)

      const now = new Date()
      const suppCtx = getSupplementReminderContext({ dailySupp, suppSchedule, now })
      const workCtx = getWorkReminderContext({ attendance, now })
      const moodCtx = getMoodReminderContext({ moods, now })
      const planCtx = getPlannerReminderContext({ planner, now })
      const channelPrefs = readSmartNotifChannels()
      const remindersChannelOn = isSmartNotifChannelEnabled('reminders', channelPrefs)
      const calendarChannelOn = isSmartNotifChannelEnabled('calendar', channelPrefs)
      const dailyTipChannelOn = isSmartNotifChannelEnabled('dailyTip', channelPrefs)
      const namesChannelOn = isSmartNotifChannelEnabled('names', channelPrefs)

      const actionableCandidates = []
      if (remindersChannelOn && suppCtx.remainingDoses > 0) {
        actionableCandidates.push(buildSupplementReminder(suppCtx, now, 'notify'))
      }
      if (remindersChannelOn && workCtx.needsReminder) {
        actionableCandidates.push(buildWorkReminder(workCtx, now, 'notify'))
      }
      if (remindersChannelOn && moodCtx.needsReminder) {
        const moodReminder = buildMoodReminder(moodCtx, now, 'notify')
        if (moodReminder) actionableCandidates.push(moodReminder)
      }
      if (calendarChannelOn && planCtx?.candidate?.planId) {
        const planReminder = buildPlannerReminder(planCtx, now, 'notify')
        if (planReminder) actionableCandidates.push(planReminder)
      }

      // --- Cloud sync: push SCHEDULED reminders with fireAt times to Supabase ---
      // Server cron sends each one at the right time — like an alarm.
      // Re-syncs when state changes (dose taken, mood logged) to remove delivered items.
      if (isCloudConfigured() && isPushSupported()) {
        const schedule = computeUpcomingSchedule(suppSchedule, dailySupp, attendance, planner, moods, now)
        const hash = computeSyncHash(schedule)
        const elapsed = Date.now() - lastSyncTimeRef.current
        if (hash !== lastSyncHashRef.current && elapsed >= SYNC_MIN_INTERVAL_MS && !syncBusyRef.current) {
          const session = getCloudSession()
          if (session?.accessToken) {
            syncBusyRef.current = true
            cloudSyncPendingReminders(schedule, getPushDeviceId(), session)
              .then(() => {
                lastSyncHashRef.current = hash
                lastSyncTimeRef.current = Date.now()
              })
              .catch(() => {})
              .finally(() => { syncBusyRef.current = false })
          }
        }
      }

      const actionable = actionableCandidates
        .filter(item => !hasSentNotificationSlot(item.slotKey, now))
        .sort((a, b) => b.priorityScore - a.priorityScore)[0] || null

      const quietHoursOnNow = isNowInSmartNotifQuietHours(now, readSmartNotifQuietHours())
      const permissionGranted = Notification.permission === 'granted'
      const canNotify = canNotifyNow() && !quietHoursOnNow && permissionGranted

      if (!canNotify && actionable) {
        const reason = quietHoursOnNow
          ? 'quiet-hours'
          : (permissionGranted ? 'foreground-suppressed' : 'permission-not-granted')
        appendSmartNotifInbox({
          title: actionable.notificationTitle,
          body: actionable.notificationBody,
          type: actionable.type,
          level: actionable.level,
          status: 'missed',
          reason,
          source: 'local',
          slotKey: actionable.slotKey,
          dedupeKey: `${actionable.slotKey}|missed|${reason}`,
          createdAt: now.toISOString(),
          read: false,
        })
      }

      if (!canNotify) return

      if (actionable) {
        const isMoodReminder = actionable.type === 'mood'
        const moodActions = Array.isArray(actionable.moodQuickActions)
          ? actionable.moodQuickActions
          : []
        const actions = moodActions.map(item => ({
          action: `quick_mood_${String(item.code || '').trim()}`,
          title: String(item.label || item.emoji || '').trim(),
        })).filter(item => item.action && item.title)
        const actionUrls = Object.fromEntries(
          moodActions
            .map(item => {
              const code = String(item?.code || '').trim()
              if (!code) return ['', '']
              return [`quick_mood_${code}`, `${APP_BASE}?openMood=1&quickMood=${encodeURIComponent(code)}`]
            })
            .filter(([k, v]) => k && v)
        )
        void fireNotificationReliable({
          title: actionable.notificationTitle,
          body: actionable.notificationBody,
          slotKey: actionable.slotKey,
          type: actionable.type,
          level: actionable.level,
          urgent: actionable.level === 'urgent',
          url: isMoodReminder ? `${APP_BASE}?openMood=1` : APP_BASE,
          actions: isMoodReminder ? actions : [],
          actionUrls: isMoodReminder ? actionUrls : {},
        })
        markNotificationSlotSent(actionable.slotKey, now)
        appendSmartNotifInbox({
          title: actionable.notificationTitle,
          body: actionable.notificationBody,
          type: actionable.type,
          level: actionable.level,
          status: 'sent',
          reason: '',
          source: 'local',
          slotKey: actionable.slotKey,
          dedupeKey: `${actionable.slotKey}|sent`,
          createdAt: now.toISOString(),
          read: false,
        })
        return
      }

      if (dailyTipChannelOn) {
        const dailyTip = buildDailyTip({ now, suppCtx })
        const tipReminder = buildDailyTipReminder({ now, dailyTip, seedSalt: 'notify' })
        if (!hasSentNotificationSlot(tipReminder.slotKey, now)) {
          void fireNotificationReliable({
            title: tipReminder.notificationTitle,
            body: tipReminder.notificationBody,
            slotKey: tipReminder.slotKey,
            type: tipReminder.type,
            level: tipReminder.level,
            urgent: false,
          })
          markNotificationSlotSent(tipReminder.slotKey, now)
          appendSmartNotifInbox({
            title: tipReminder.notificationTitle,
            body: tipReminder.notificationBody,
            type: tipReminder.type,
            level: tipReminder.level,
            status: 'sent',
            source: 'local',
            slotKey: tipReminder.slotKey,
            dedupeKey: `${tipReminder.slotKey}|sent`,
            createdAt: now.toISOString(),
            read: false,
          })
          return
        }
      }

      if (namesChannelOn) {
        const nameSpotlight = buildNameSpotlight({ now, babyNamesInfo, seedSalt: 'notify' })
        const nameSlotKey = `${nameSpotlight.slotKey}|name-notif`
        const nameUnsent = !hasSentNotificationSlot(nameSlotKey, now)
        if (nameUnsent && now.getMinutes() % 2 === 0) {
          void fireNotificationReliable({
            title: nameSpotlight.notificationTitle,
            body: nameSpotlight.notificationBody,
            slotKey: nameSlotKey,
            type: 'name',
            level: 'gentle',
            urgent: false,
          })
          markNotificationSlotSent(nameSlotKey, now)
          appendSmartNotifInbox({
            title: nameSpotlight.notificationTitle,
            body: nameSpotlight.notificationBody,
            type: 'name',
            level: 'gentle',
            status: 'sent',
            source: 'local',
            slotKey: nameSlotKey,
            dedupeKey: `${nameSlotKey}|sent`,
            createdAt: now.toISOString(),
            read: false,
          })
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 45 * 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [dailySupp, suppSchedule, attendance, planner, moods])

  return null
}
