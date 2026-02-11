import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD_PX = 70
const MAX_PULL_PX = 120
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

function getScrollOffset(scroller) {
  if (!scroller) return 0
  const y = Number(scroller.scrollTop)
  if (Number.isFinite(y)) return y
  return 0
}

function getGlobalScrollTop() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 0
  const appScroller = document.getElementById('peggy-scroll-root')
  const appY = getScrollOffset(appScroller)
  const docY = getScrollOffset(document.scrollingElement || document.documentElement || document.body)
  const winY = Number.isFinite(Number(window.scrollY)) ? Number(window.scrollY) : 0
  return Math.max(appY, docY, winY)
}

function isAtTop(scroller) {
  const localY = getScrollOffset(scroller)
  if (localY > TOP_EPSILON_PX) return false
  return getGlobalScrollTop() <= TOP_EPSILON_PX
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return false
  // Ignore modal sheets and form controls to avoid accidental refresh while editing.
  if (target.closest('.day-detail-sheet, .photo-modal-content')) return true
  const formEl = target.closest('input, textarea, select, [contenteditable="true"]')
  return Boolean(formEl)
}

export default function PullToRefreshAgent() {
  const [ui, setUi] = useState({
    visible: false,
    progress: 0,
    armed: false,
    refreshing: false,
  })
  const stateRef = useRef({
    active: false,
    startY: 0,
    atTop: false,
    triggered: false,
    scroller: null,
    eligible: false,
  })
  const lastTriggerRef = useRef(0)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    const showIdleUi = () => {
      setUi(prev => ({
        ...prev,
        visible: prev.progress > 0.03 || prev.refreshing,
      }))
    }

    const hideUiSoon = (delay = 120) => {
      clearHideTimer()
      hideTimerRef.current = window.setTimeout(() => {
        setUi({
          visible: false,
          progress: 0,
          armed: false,
          refreshing: false,
        })
      }, delay)
    }

    const reset = () => {
      stateRef.current = { active: false, startY: 0, atTop: false, triggered: false, scroller: null, eligible: false }
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
        eligible: isAtTop(scroller),
      }
      // Keep indicator hidden on touch start. We only show when user is actually
      // pulling down from top; this avoids false positives while mid-scroll.
      hideUiSoon(30)
    }

    const onTouchMove = (event) => {
      if (!stateRef.current.active || stateRef.current.triggered) return
      if (!stateRef.current.atTop) return
      if (!stateRef.current.eligible) return
      const touch = event.touches?.[0]
      if (!touch) return
      if (!isAtTop(stateRef.current.scroller)) {
        stateRef.current.eligible = false
        hideUiSoon(20)
        return
      }
      const dy = touch.clientY - stateRef.current.startY
      const positiveDy = Math.max(0, dy)
      const progress = Math.min(1, positiveDy / MAX_PULL_PX)
      const armed = positiveDy >= PULL_THRESHOLD_PX
      setUi(prev => {
        const same = prev.visible && Math.abs(prev.progress - progress) < 0.02 && prev.armed === armed && !prev.refreshing
        if (same) return prev
        return {
          visible: positiveDy > 6,
          progress,
          armed,
          refreshing: false,
        }
      })
      if (dy >= PULL_THRESHOLD_PX) {
        stateRef.current.triggered = true
      }
    }

    const onTouchEnd = async () => {
      const { triggered } = stateRef.current
      reset()
      if (!triggered) {
        setUi(prev => ({ ...prev, armed: false, refreshing: false }))
        hideUiSoon(130)
        return
      }
      if (isUserEditing()) return

      const now = Date.now()
      if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) {
        showIdleUi()
        hideUiSoon(220)
        return
      }
      lastTriggerRef.current = now

      setUi({
        visible: true,
        progress: 1,
        armed: true,
        refreshing: true,
      })

      // Ask main.jsx to run the "version.json" check + cache-busting reload.
      try {
        window.dispatchEvent(new CustomEvent('peggy-force-update'))
      } catch {}

      const hasUpdate = await checkForUpdate()
      // If a new SW is installing/waiting, main.jsx will reload when it's ready.
      // Otherwise, do a simple reload to "force refresh" the app.
      if (!hasUpdate) {
        window.setTimeout(() => {
          window.location.reload()
        }, 140)
      } else {
        hideUiSoon(500)
      }
    }

    // Use document-level listeners for iOS standalone PWA where container listeners
    // can be unreliable depending on scroll ownership.
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true })
    document.addEventListener('touchend', onTouchEnd, { capture: true })
    document.addEventListener('touchcancel', onTouchEnd, { capture: true })

    return () => {
      clearHideTimer()
      document.removeEventListener('touchstart', onTouchStart, { capture: true })
      document.removeEventListener('touchmove', onTouchMove, { capture: true })
      document.removeEventListener('touchend', onTouchEnd, { capture: true })
      document.removeEventListener('touchcancel', onTouchEnd, { capture: true })
    }
  }, [])

  const indicatorClass = `pull-refresh-indicator ${ui.visible ? 'show' : ''} ${ui.refreshing ? 'refreshing' : ''}`
  const text = ui.refreshing ? 'Refreshing...' : (ui.armed ? 'Release to refresh' : 'Pull to refresh')

  return (
    <div className={indicatorClass} aria-hidden="true">
      <div className="pull-refresh-surface">
        <div className="pull-refresh-spinner-wrap">
          <div className="pull-refresh-spinner" style={{ '--pull-progress': ui.progress }} />
        </div>
        <div className="pull-refresh-text">{text}</div>
      </div>
    </div>
  )
}
