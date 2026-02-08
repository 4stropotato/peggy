import { useEffect, useRef, useState } from 'react'
import { buildBackupObject, clearLocalAppData, restoreBackupObject } from '../db'
import {
  isCloudConfigured,
  getCloudSession,
  cloudValidateSession,
  cloudDownloadBackup,
  cloudUploadBackup
} from '../cloudSync'

const ACTIVE_USER_KEY = 'peggy-cloud-active-user-id'
const SESSION_EVENT = 'peggy-cloud-session-changed'

function hasCloudBackupError(err) {
  return String(err?.message || '').toLowerCase().includes('no cloud backup found')
}

export default function CloudSyncAgent() {
  const [session, setSession] = useState(() => getCloudSession())
  const readyRef = useRef(false)
  const syncingRef = useRef(false)
  const uploadTimerRef = useRef(null)
  const sessionRef = useRef(session)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!isCloudConfigured() || typeof window === 'undefined') return undefined

    const onSessionChanged = (event) => {
      setSession(event?.detail?.session || getCloudSession())
    }

    window.addEventListener(SESSION_EVENT, onSessionChanged)
    setSession(getCloudSession())

    return () => {
      window.removeEventListener(SESSION_EVENT, onSessionChanged)
    }
  }, [])

  useEffect(() => {
    if (!isCloudConfigured()) return undefined
    let cancelled = false

    const hydrateForSession = async () => {
      readyRef.current = false

      if (!session?.accessToken || !session?.user?.id) {
        const activeUser = localStorage.getItem(ACTIVE_USER_KEY)
        if (activeUser) {
          try { await clearLocalAppData() } catch {}
          localStorage.removeItem(ACTIVE_USER_KEY)
        }
        readyRef.current = true
        return
      }

      syncingRef.current = true
      try {
        const validated = await cloudValidateSession(session)
        if (cancelled) return

        const activeUser = localStorage.getItem(ACTIVE_USER_KEY)
        const switchedUser = Boolean(activeUser && activeUser !== validated.user.id)
        if (switchedUser) {
          try { await clearLocalAppData() } catch {}
        }

        try {
          const { backup } = await cloudDownloadBackup(validated)
          if (cancelled) return
          await restoreBackupObject(backup)
        } catch (err) {
          if (!hasCloudBackupError(err)) throw err
          const localBackup = await buildBackupObject()
          await cloudUploadBackup(localBackup, validated)
        }

        if (cancelled) return
        localStorage.setItem(ACTIVE_USER_KEY, validated.user.id)
      } catch {
        // If validation fails, keep the app usable in local-only mode.
      } finally {
        syncingRef.current = false
        readyRef.current = true
      }
    }

    hydrateForSession()
    return () => { cancelled = true }
  }, [session?.accessToken, session?.user?.id])

  useEffect(() => {
    if (!isCloudConfigured() || typeof window === 'undefined') return undefined

    const scheduleUpload = () => {
      const active = sessionRef.current
      if (!readyRef.current || syncingRef.current) return
      if (!active?.accessToken || !active?.user?.id) return

      if (uploadTimerRef.current) {
        clearTimeout(uploadTimerRef.current)
      }

      uploadTimerRef.current = setTimeout(async () => {
        const currentSession = sessionRef.current
        if (syncingRef.current) return
        if (!currentSession?.accessToken || !currentSession?.user?.id) return
        try {
          const backup = await buildBackupObject()
          await cloudUploadBackup(backup, currentSession)
        } catch {
          // Keep app responsive even if network fails. Next change will retry.
        }
      }, 1200)
    }

    window.addEventListener('peggy-local-changed', scheduleUpload)
    window.addEventListener('peggy-photo-changed', scheduleUpload)

    return () => {
      window.removeEventListener('peggy-local-changed', scheduleUpload)
      window.removeEventListener('peggy-photo-changed', scheduleUpload)
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current)
    }
  }, [])

  return null
}
