import { useEffect, useRef } from 'react'

const PULL_THRESHOLD_PX = 70
const TRIGGER_COOLDOWN_MS = 12000

function isUserEditing() {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (!el) return false
  const tag = String(el.tagName || '').toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

async function checkForUpdate() {
  if (typeof navigator === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.update()
    // If a new worker is installing/waiting, main.jsx will handle the update reload.
    return Boolean(reg.installing || reg.waiting)
  } catch {
    // ignore update failures
  }
  return false
}

export default function PullToRefreshAgent() {
  const stateRef = useRef({
    active: false,
    startY: 0,
    atTop: false,
    triggered: false,
  })
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined
    const el = document.getElementById('peggy-scroll-root')
    if (!el) return undefined

    const reset = () => {
      stateRef.current = { active: false, startY: 0, atTop: false, triggered: false }
    }

    const onTouchStart = (event) => {
      const touch = event.touches?.[0]
      if (!touch) return
      stateRef.current = {
        active: true,
        startY: touch.clientY,
        atTop: el.scrollTop <= 0,
        triggered: false,
      }
    }

    const onTouchMove = (event) => {
      if (!stateRef.current.active || stateRef.current.triggered) return
      if (!stateRef.current.atTop) return
      const touch = event.touches?.[0]
      if (!touch) return
      const dy = touch.clientY - stateRef.current.startY
      if (dy >= PULL_THRESHOLD_PX) {
        stateRef.current.triggered = true
      }
    }

    const onTouchEnd = async () => {
      const { triggered } = stateRef.current
      reset()
      if (!triggered) return
      if (isUserEditing()) return

      const now = Date.now()
      if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) return
      lastTriggerRef.current = now

      // Ask main.jsx to run the "version.json" check + cache-busting reload.
      try {
        window.dispatchEvent(new CustomEvent('peggy-force-update'))
      } catch {}

      const hasUpdate = await checkForUpdate()
      // If a new SW is installing/waiting, main.jsx will reload when it's ready.
      // Otherwise, do a simple reload to "force refresh" the app.
      if (!hasUpdate) {
        window.location.reload()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return null
}
