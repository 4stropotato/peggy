import { useEffect } from 'react'
import { useApp } from '../AppContext'
import { babyNamesInfo } from '../infoData'
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

export default function SmartReminderAgent() {
  const { dailySupp, suppSchedule, attendance, planner, moods } = useApp()

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
