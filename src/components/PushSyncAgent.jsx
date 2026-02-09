import { useEffect, useRef, useState } from 'react'
import { cloudTryRecoverSession, getCloudSession, isCloudConfigured } from '../cloudSync'
import {
  SMART_NOTIF_PREF_EVENT,
  readSmartNotifEnabled,
} from '../reminderContent'
import {
  disableCurrentPushSubscription,
  isPushSupported,
  upsertCurrentPushSubscription,
} from '../pushSync'

const SESSION_EVENT = 'peggy-cloud-session-changed'

export default function PushSyncAgent() {
  const [session, setSession] = useState(() => getCloudSession())
  const [notifEnabled, setNotifEnabled] = useState(() => readSmartNotifEnabled())
  const sessionRef = useRef(session)
  const notifEnabledRef = useRef(notifEnabled)
  const syncBusyRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    notifEnabledRef.current = notifEnabled
  }, [notifEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncState = async () => {
      if (!isCloudConfigured() || syncBusyRef.current) return

      const activeSession = sessionRef.current
      if (!activeSession?.accessToken || !activeSession?.user?.id) return

      syncBusyRef.current = true
      try {
        if (!isPushSupported()) {
          await disableCurrentPushSubscription(activeSession, { unsubscribeLocal: false })
          return
        }

        const enabled = notifEnabledRef.current
        if (!enabled || Notification.permission !== 'granted') {
          await disableCurrentPushSubscription(activeSession, { unsubscribeLocal: !enabled })
          return
        }

        await upsertCurrentPushSubscription(activeSession, { notifEnabled: enabled })
      } catch {
        // Keep app functional even if push sync fails.
      } finally {
        syncBusyRef.current = false
      }
    }

    const syncFromSessionEvent = (event) => {
      const next = event?.detail?.session || getCloudSession() || null
      setSession(next)
      sessionRef.current = next
      void syncState()
    }

    const syncFromPrefEvent = () => {
      const enabled = readSmartNotifEnabled()
      setNotifEnabled(enabled)
      notifEnabledRef.current = enabled
      void syncState()
    }

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncState()
      }
    }

    window.addEventListener(SESSION_EVENT, syncFromSessionEvent)
    window.addEventListener(SMART_NOTIF_PREF_EVENT, syncFromPrefEvent)
    window.addEventListener('peggy-backup-restored', syncFromPrefEvent)
    document.addEventListener('visibilitychange', syncWhenVisible)

    let cancelled = false
    void cloudTryRecoverSession().then((recovered) => {
      if (cancelled) return
      if (recovered?.accessToken && recovered?.user?.id) {
        setSession(recovered)
        sessionRef.current = recovered
        void syncState()
      }
    })

    void syncState()
    const id = window.setInterval(() => { void syncState() }, 5 * 60 * 1000)

    return () => {
      cancelled = true
      window.removeEventListener(SESSION_EVENT, syncFromSessionEvent)
      window.removeEventListener(SMART_NOTIF_PREF_EVENT, syncFromPrefEvent)
      window.removeEventListener('peggy-backup-restored', syncFromPrefEvent)
      document.removeEventListener('visibilitychange', syncWhenVisible)
      window.clearInterval(id)
    }
  }, [])

  return null
}
