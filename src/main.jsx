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

  const isUserEditing = () => {
    if (typeof document === 'undefined') return false
    const el = document.activeElement
    if (!el) return false
    const tag = String(el.tagName || '').toUpperCase()
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
  }

  const scheduleReloadWhenSafe = () => {
    if (refreshing) return
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
      window.location.reload()
    }
    window.setTimeout(tryReload, 350)
  }

  window.addEventListener('load', async () => {
    const base = import.meta.env.BASE_URL || '/'
    const swUrl = `${base.replace(/\/+$/, '/')}sw.js`
    try {
      const reg = await navigator.serviceWorker.register(swUrl)

      // Kick an update check immediately on load.
      try { await reg.update() } catch {}

      // When the app comes back into view, re-check for updates.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          try { reg.update() } catch {}
        }
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
