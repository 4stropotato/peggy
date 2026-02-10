import { useEffect } from 'react'
import { useApp } from '../AppContext'
import { babyNamesInfo } from '../infoData'
import {
  buildDailyTip,
  buildDailyTipReminder,
  buildNameSpotlight,
  buildPlannerReminder,
  buildSupplementReminder,
  buildWorkReminder,
  getPlannerReminderContext,
  getSupplementReminderContext,
  getWorkReminderContext,
  hasSentNotificationSlot,
  isNowInSmartNotifQuietHours,
  markNotificationSlotSent,
  readSmartNotifEnabled,
  readSmartNotifQuietHours,
} from '../reminderContent'

const APP_BASE = import.meta.env.BASE_URL || '/'
const NOTIF_ICON = `${APP_BASE.replace(/\/+$/, '/')}icon-192.png`

function canNotifyNow() {
  if (typeof document === 'undefined') return true
  if (document.visibilityState === 'hidden') return true
  if (typeof document.hasFocus === 'function') return !document.hasFocus()
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

function fireNotification({ title, body, slotKey, type = 'general', level = 'gentle', urgent = false }) {
  const tone = getNotifTone(type, level)
  const safeTitle = `${tone.titlePrefix} ${String(title || '').trim()}`.trim()
  const baseBody = String(body || '').trim()
  const safeBody = tone.bodyPrefix ? `${tone.bodyPrefix} ${baseBody}`.trim() : baseBody

  try {
    new Notification(safeTitle, {
      body: safeBody,
      icon: NOTIF_ICON,
      badge: NOTIF_ICON,
      tag: `${type}:${slotKey}`,
      renotify: urgent,
      requireInteraction: urgent || level === 'urgent',
      vibrate: tone.vibrate,
      timestamp: Date.now(),
      data: { type, level },
    })
  } catch {
    // Ignore notification errors from unsupported environments.
  }
}

export default function SmartReminderAgent() {
  const { dailySupp, suppSchedule, attendance, planner } = useApp()

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined

    const tick = () => {
      if (!readSmartNotifEnabled()) {
        void syncAppBadge(0)
        return
      }

      const now = new Date()
      const suppCtx = getSupplementReminderContext({ dailySupp, suppSchedule, now })
      const workCtx = getWorkReminderContext({ attendance, now })
      const planCtx = getPlannerReminderContext({ planner, now })

      const planBadgeCount = Math.max(0, Number(planCtx.pendingTodayCount) || 0) + Math.max(0, Number(planCtx.pendingOverdueCount) || 0)
      const badgeCount = Math.max(0, suppCtx.remainingDoses) + (workCtx.needsReminder ? 1 : 0) + planBadgeCount
      void syncAppBadge(badgeCount)

      if (isNowInSmartNotifQuietHours(now, readSmartNotifQuietHours())) return
      if (Notification.permission !== 'granted') return
      if (!canNotifyNow()) return

      const actionableCandidates = []
      if (suppCtx.remainingDoses > 0) {
        actionableCandidates.push(buildSupplementReminder(suppCtx, now, 'notify'))
      }
      if (workCtx.needsReminder) {
        actionableCandidates.push(buildWorkReminder(workCtx, now, 'notify'))
      }
      if (planCtx?.candidate?.planId) {
        const planReminder = buildPlannerReminder(planCtx, now, 'notify')
        if (planReminder) actionableCandidates.push(planReminder)
      }

      const actionable = actionableCandidates
        .filter(item => !hasSentNotificationSlot(item.slotKey, now))
        .sort((a, b) => b.priorityScore - a.priorityScore)[0] || null

      if (actionable) {
        fireNotification({
          title: actionable.notificationTitle,
          body: actionable.notificationBody,
          slotKey: actionable.slotKey,
          type: actionable.type,
          level: actionable.level,
          urgent: actionable.level === 'urgent',
        })
        markNotificationSlotSent(actionable.slotKey, now)
        return
      }

      const dailyTip = buildDailyTip({ now, suppCtx })
      const tipReminder = buildDailyTipReminder({ now, dailyTip, seedSalt: 'notify' })
      if (!hasSentNotificationSlot(tipReminder.slotKey, now)) {
        fireNotification({
          title: tipReminder.notificationTitle,
          body: tipReminder.notificationBody,
          slotKey: tipReminder.slotKey,
          type: tipReminder.type,
          level: tipReminder.level,
          urgent: false,
        })
        markNotificationSlotSent(tipReminder.slotKey, now)
        return
      }

      const nameSpotlight = buildNameSpotlight({ now, babyNamesInfo, seedSalt: 'notify' })
      const nameSlotKey = `${nameSpotlight.slotKey}|name-notif`
      const nameUnsent = !hasSentNotificationSlot(nameSlotKey, now)
      if (nameUnsent && now.getMinutes() % 2 === 0) {
        fireNotification({
          title: nameSpotlight.notificationTitle,
          body: nameSpotlight.notificationBody,
          slotKey: nameSlotKey,
          type: 'name',
          level: 'gentle',
          urgent: false,
        })
        markNotificationSlotSent(nameSlotKey, now)
      }
    }

    tick()
    const id = window.setInterval(tick, 45 * 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [dailySupp, suppSchedule, attendance])

  return null
}
