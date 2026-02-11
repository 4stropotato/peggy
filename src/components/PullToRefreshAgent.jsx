import { useEffect, useRef } from 'react'

const PULL_THRESHOLD_PX = 70
const TRIGGER_COOLDOWN_MS = 12000
const TOP_EPSILON_PX = 2

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

function getPrimaryScroller() {
  if (typeof document === 'undefined') return null
  return (
    document.getElementById('peggy-scroll-root')
    || document.scrollingElement
    || document.documentElement
    || document.body
    || null
  )
}

function isAtTop(scroller) {
  if (!scroller) return true
  const y = Number(scroller.scrollTop)
  if (Number.isFinite(y)) return y <= TOP_EPSILON_PX
  if (typeof window !== 'undefined') return window.scrollY <= TOP_EPSILON_PX
  return true
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return false
  // Ignore modal sheets and form controls to avoid accidental refresh while editing.
  if (target.closest('.day-detail-sheet, .photo-modal-content')) return true
  const formEl = target.closest('input, textarea, select, [contenteditable="true"]')
  return Boolean(formEl)
}

export default function PullToRefreshAgent() {
  const stateRef = useRef({
    active: false,
    startY: 0,
    atTop: false,
    triggered: false,
    scroller: null,
  })
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const reset = () => {
      stateRef.current = { active: false, startY: 0, atTop: false, triggered: false, scroller: null }
    }

    const onTouchStart = (event) => {
      if (event.touches?.length !== 1) {
        reset()
        return
      }
      if (shouldIgnoreTarget(event.target)) {
        reset()
        return
      }
      const touch = event.touches?.[0]
      if (!touch) return
      const scroller = getPrimaryScroller()
      stateRef.current = {
        active: true,
        startY: touch.clientY,
        atTop: isAtTop(scroller),
        triggered: false,
        scroller,
      }
    }

    const onTouchMove = (event) => {
      if (!stateRef.current.active || stateRef.current.triggered) return
      if (!stateRef.current.atTop) return
      const touch = event.touches?.[0]
      if (!touch) return
      if (!isAtTop(stateRef.current.scroller)) return
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

    // Use document-level listeners for iOS standalone PWA where container listeners
    // can be unreliable depending on scroll ownership.
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true })
    document.addEventListener('touchend', onTouchEnd, { capture: true })
    document.addEventListener('touchcancel', onTouchEnd, { capture: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart, { capture: true })
      document.removeEventListener('touchmove', onTouchMove, { capture: true })
      document.removeEventListener('touchend', onTouchEnd, { capture: true })
      document.removeEventListener('touchcancel', onTouchEnd, { capture: true })
    }
  }, [])

  return null
}
