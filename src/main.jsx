import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  let refreshing = false
  let hasHadController = Boolean(navigator.serviceWorker.controller)

  const BUILD_ID = typeof __PEGGY_BUILD_ID__ !== 'undefined' ? __PEGGY_BUILD_ID__ : ''

  const isUserEditing = () => {
    if (typeof document === 'undefined') return false
    const el = document.activeElement
    if (!el) return false
    const tag = String(el.tagName || '').toUpperCase()
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
  }

  const buildCacheBustedUrl = (buildId = '') => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('_pv', String(buildId || BUILD_ID || 'refresh'))
      url.searchParams.set('_ts', String(Date.now()))
      return url.toString()
    } catch {
      return window.location.href
    }
  }

  const scheduleReloadWhenSafe = (opts = {}) => {
    if (refreshing) return
    const forceUrl = typeof opts.forceUrl === 'string' ? opts.forceUrl : ''
    const tryReload = () => {
      if (refreshing) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        window.setTimeout(tryReload, 1500)
        return
      }
      if (isUserEditing()) {
        window.setTimeout(tryReload, 1500)
        return
      }
      refreshing = true
      if (forceUrl) {
        window.location.replace(forceUrl)
        return
      }
      window.location.reload()
    }
    window.setTimeout(tryReload, 350)
  }

  const clearAppCaches = async () => {
    try {
      if (typeof caches === 'undefined') return
      const keys = await caches.keys()
      await Promise.all(keys
        .filter((k) => String(k).startsWith('peggy-') || String(k).startsWith('baby-prep-'))
        .map((k) => caches.delete(k))
      )
    } catch {
      // Cache clearing is best-effort only.
    }
  }

  const fetchRemoteVersion = async (base) => {
    const url = `${base.replace(/\/+$/, '/')}version.json`
    try {
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) return null
      return await resp.json()
    } catch {
      return null
    }
  }

  const maybeForceUpdateIfRemoteChanged = async (reg, reason = 'boot') => {
    if (!reg) return
    const base = import.meta.env.BASE_URL || '/'
    const remote = await fetchRemoteVersion(base)
    const remoteBuildId = String(remote?.buildId || '').trim()
    if (!remoteBuildId) return
    const localBuildId = String(BUILD_ID || '').trim()
    if (localBuildId && remoteBuildId === localBuildId) return

    const key = `peggy-update-attempted:${remoteBuildId}`
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, `${Date.now()}|${reason}`)
    } catch {}

    // Clear caches first so the next navigation is forced to pull fresh assets.
    await clearAppCaches()
    try { await reg.update() } catch {}
    scheduleReloadWhenSafe({ forceUrl: buildCacheBustedUrl(remoteBuildId) })
  }

  window.addEventListener('load', async () => {
    const base = import.meta.env.BASE_URL || '/'
    // Use a build query param so GH Pages HTTP caching (max-age=600) can't keep sw.js stale.
    const swBuildSuffix = BUILD_ID ? `?b=${encodeURIComponent(BUILD_ID)}` : ''
    const swUrl = `${base.replace(/\/+$/, '/')}sw.js${swBuildSuffix}`
    try {
      const reg = await navigator.serviceWorker.register(swUrl)

      const probeForUpdate = (reason) => {
        try { reg.update() } catch {}
        void maybeForceUpdateIfRemoteChanged(reg, reason)
      }

      // Kick an update check immediately on load.
      probeForUpdate('load')

      // When the app comes back into view, re-check for updates.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          probeForUpdate('visible')
        }
      })
      window.addEventListener('focus', () => probeForUpdate('focus'))
      window.addEventListener('pageshow', () => probeForUpdate('pageshow'))
      window.addEventListener('online', () => probeForUpdate('online'))
      window.setInterval(() => {
        if (document.visibilityState === 'visible') probeForUpdate('interval')
      }, 45000)

      // Manual trigger (PullToRefreshAgent + any future update UI).
      window.addEventListener('peggy-force-update', () => {
        probeForUpdate('manual')
      })

      // Reload once a new SW takes control (but skip the first install takeover).
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hasHadController) {
          hasHadController = true
          return
        }
        scheduleReloadWhenSafe()
      })

      // Extra signal for some browsers: when an update is installed, refresh.
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && hasHadController) {
            scheduleReloadWhenSafe()
          }
        })
      })
    } catch {
      // Keep app usable even if SW registration fails.
    }
  })
}
