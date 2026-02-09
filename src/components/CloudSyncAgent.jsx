import { useEffect, useRef, useState } from 'react'
import { buildBackupObject, clearLocalAppData, restoreBackupObject } from '../db'
import {
  isCloudConfigured,
  getCloudSession,
  cloudTryRecoverSession,
  cloudValidateSession,
  cloudDownloadBackup,
  cloudUploadBackup
} from '../cloudSync'

const ACTIVE_USER_KEY = 'peggy-cloud-active-user-id'
const SESSION_EVENT = 'peggy-cloud-session-changed'
const NON_MEANINGFUL_KEYS = new Set(['baby-prep-theme'])

function hasCloudBackupError(err) {
  return String(err?.message || '').toLowerCase().includes('no cloud backup found')
}

function hasMeaningfulBackupData(backup) {
  if (!backup || typeof backup !== 'object') return false
  if (Array.isArray(backup.photos) && backup.photos.length > 0) return true

  const appData = backup.appData || {}
  for (const [key, value] of Object.entries(appData)) {
    if (NON_MEANINGFUL_KEYS.has(key)) continue
    if (Array.isArray(value) && value.length > 0) return true
    if (value && typeof value === 'object' && Object.keys(value).length > 0) return true
    if (typeof value === 'string' && value.trim() !== '') return true
    if (typeof value === 'number' && value !== 0) return true
    if (typeof value === 'boolean' && value) return true
  }
  return false
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
    let cancelled = false
    void cloudTryRecoverSession().then((recovered) => {
      if (cancelled) return
      if (recovered?.accessToken && recovered?.user?.id) {
        setSession(recovered)
      }
    })

    return () => {
      cancelled = true
      window.removeEventListener(SESSION_EVENT, onSessionChanged)
    }
  }, [])

  useEffect(() => {
    if (!isCloudConfigured()) return undefined
    let cancelled = false

    const hydrateForSession = async () => {
      readyRef.current = false

      if (!session?.accessToken || !session?.user?.id) {
        // iOS PWAs sometimes wipe localStorage after updates while IndexedDB survives.
        // Try to recover the auth session before deciding it's a true sign-out.
        try {
          const recovered = await cloudTryRecoverSession()
          if (!cancelled && recovered?.accessToken && recovered?.user?.id) {
            setSession(recovered)
            readyRef.current = true
            return
          }
        } catch {}

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
          if (switchedUser) {
            // New account on this device with no backup: stay blank.
            try { await clearLocalAppData() } catch {}
          } else {
            // First account link (or same account missing backup): seed cloud from meaningful local data.
            const localBackup = await buildBackupObject()
            if (hasMeaningfulBackupData(localBackup)) {
              await cloudUploadBackup(localBackup, validated)
            } else {
              try { await clearLocalAppData() } catch {}
            }
          }
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
