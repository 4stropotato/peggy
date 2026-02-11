import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD_PX = 110
const MAX_PULL_PX = 170
const TRIGGER_COOLDOWN_MS = 12000
const TOP_EPSILON_PX = 2
const UPDATE_CHECK_TIMEOUT_MS = 2200
const REFRESH_UI_TIMEOUT_MS = 4500

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

  const withTimeout = (promise, timeoutMs) => new Promise((resolve) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(false)
      }
    }, timeoutMs)

    Promise.resolve(promise)
      .then((value) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve(false)
      })
  })

  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, UPDATE_CHECK_TIMEOUT_MS)
    if (!reg) return false
    await withTimeout(reg.update(), UPDATE_CHECK_TIMEOUT_MS)
    // If a new worker is installing/waiting, main.jsx will handle the update reload.
    return Boolean(reg.installing || reg.waiting)
  } catch {
    // ignore update failures
  }
  return false
}

function forceReloadNavigation() {
  if (typeof window === 'undefined') return
  let leftPage = false
  const onPageHide = () => { leftPage = true }
  window.addEventListener('pagehide', onPageHide, { once: true })

  try {
    window.dispatchEvent(new CustomEvent('peggy-refresh-started', { detail: { source: 'pull' } }))
  } catch {}

  const stamp = Date.now()
  try {
    const url = new URL(window.location.href)
    // Change URL minimally to force a new navigation entry in stubborn iOS PWAs.
    url.searchParams.set('_r', String(stamp))
    window.location.assign(url.toString())
  } catch {
    // fallback
    try {
      window.location.reload()
    } catch {}
  }

  // Extra fallbacks for iOS standalone cases where first navigation does not happen.
  window.setTimeout(() => {
    if (leftPage) return
    try { window.location.reload() } catch {}
  }, 900)

  window.setTimeout(() => {
    if (leftPage) return
    try {
      const base = `${window.location.origin}${window.location.pathname}`
      window.location.href = `${base}?_r=${stamp}&_rf=1`
    } catch {}
  }, 1700)
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
  // Ignore fixed controls (especially draggable theme toggle), otherwise dragging
  // the control can look like a pull gesture and trigger refresh by mistake.
  if (target.closest('.theme-toggle, .bottom-nav')) return true
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
  const refreshingRef = useRef(false)
  const stateRef = useRef({
    active: false,
    startY: 0,
    currentY: 0,
    atTop: false,
    triggered: false,
    scroller: null,
    eligible: false,
  })
  const lastTriggerRef = useRef(0)
  const hideTimerRef = useRef(null)
  const refreshTimeoutRef = useRef(null)

  useEffect(() => {
    refreshingRef.current = ui.refreshing
  }, [ui.refreshing])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    const clearRefreshTimeout = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
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
      stateRef.current = { active: false, startY: 0, currentY: 0, atTop: false, triggered: false, scroller: null, eligible: false }
    }

    const onTouchStart = (event) => {
      if (refreshingRef.current) return
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
        currentY: touch.clientY,
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
      stateRef.current.currentY = touch.clientY
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
      const { triggered, startY, currentY } = stateRef.current
      const releaseDistance = Math.max(0, Number(currentY) - Number(startY))
      reset()
      if (!triggered || releaseDistance < PULL_THRESHOLD_PX) {
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
      clearRefreshTimeout()
      refreshTimeoutRef.current = window.setTimeout(() => {
        // Fail-safe: never keep spinner forever if iOS blocks navigation/reload.
        setUi(prev => ({ ...prev, refreshing: false, armed: false }))
        hideUiSoon(220)
      }, REFRESH_UI_TIMEOUT_MS)

      // Ask main.jsx to run the "version.json" check + cache-busting reload.
      try {
        window.dispatchEvent(new CustomEvent('peggy-force-update'))
      } catch {}

      const hasUpdate = await checkForUpdate()
      // Always navigate after pull-refresh so users get a clear "actual refresh" behavior.
      // The SW + version check logic still handles cache busting behind the scenes.
      window.setTimeout(() => {
        forceReloadNavigation()
      }, hasUpdate ? 240 : 140)
    }

    // Use document-level listeners for iOS standalone PWA where container listeners
    // can be unreliable depending on scroll ownership.
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true })
    document.addEventListener('touchend', onTouchEnd, { capture: true })
    document.addEventListener('touchcancel', onTouchEnd, { capture: true })

    return () => {
      clearHideTimer()
      clearRefreshTimeout()
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
