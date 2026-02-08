import { useEffect } from 'react'
import { useApp } from '../AppContext'
import { babyNamesInfo } from '../infoData'
import {
  buildNameSpotlight,
  buildSupplementReminder,
  buildWorkReminder,
  getSupplementReminderContext,
  getWorkReminderContext,
  hasSentNotificationSlot,
  markNotificationSlotSent,
  readSmartNotifEnabled,
} from '../reminderContent'

function canNotifyNow() {
  if (typeof document === 'undefined') return true
  if (document.visibilityState === 'hidden') return true
  if (typeof document.hasFocus === 'function') return !document.hasFocus()
  return true
}

function fireNotification(title, body, slotKey, urgent = false) {
  try {
    // Browser notification payload for PWA + desktop tab sessions.
    new Notification(title, {
      body,
      icon: '/peggy/icon-192.png',
      badge: '/peggy/icon-192.png',
      tag: slotKey,
      renotify: false,
      requireInteraction: urgent,
    })
  } catch {
    // Ignore notification errors from unsupported environments.
  }
}

export default function SmartReminderAgent() {
  const { dailySupp, suppSchedule, attendance } = useApp()

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined

    const tick = () => {
      if (!readSmartNotifEnabled()) return
      if (Notification.permission !== 'granted') return
      if (!canNotifyNow()) return

      const now = new Date()
      const suppCtx = getSupplementReminderContext({ dailySupp, suppSchedule, now })
      const workCtx = getWorkReminderContext({ attendance, now })
      const candidates = []

      if (suppCtx.remainingDoses > 0) {
        candidates.push(buildSupplementReminder(suppCtx, now, 'notify'))
      }
      if (workCtx.needsReminder) {
        candidates.push(buildWorkReminder(workCtx, now, 'notify'))
      }

      const unsentReminders = candidates
        .filter(item => !hasSentNotificationSlot(item.slotKey, now))
        .sort((a, b) => b.priorityScore - a.priorityScore)

      const topReminder = unsentReminders[0] || null
      const nameSpotlight = buildNameSpotlight({ now, babyNamesInfo, seedSalt: 'notify' })
      const nameSlotKey = `${nameSpotlight.slotKey}|name-notif`
      const nameUnsent = !hasSentNotificationSlot(nameSlotKey, now)

      if (topReminder && topReminder.level === 'urgent') {
        fireNotification(topReminder.notificationTitle, topReminder.notificationBody, topReminder.slotKey, true)
        markNotificationSlotSent(topReminder.slotKey, now)
        return
      }

      if (nameUnsent && (!topReminder || now.getMinutes() % 2 === 0)) {
        fireNotification(nameSpotlight.notificationTitle, nameSpotlight.notificationBody, nameSlotKey, false)
        markNotificationSlotSent(nameSlotKey, now)
        return
      }

      if (topReminder) {
        fireNotification(topReminder.notificationTitle, topReminder.notificationBody, topReminder.slotKey, false)
        markNotificationSlotSent(topReminder.slotKey, now)
      }
    }

    tick()
    const id = window.setInterval(tick, 60 * 1000)
    return () => window.clearInterval(id)
  }, [dailySupp, suppSchedule, attendance])

  return null
}
