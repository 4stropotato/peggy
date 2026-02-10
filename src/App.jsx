import { useEffect, useRef, useState } from 'react'
import { AppProvider, useApp } from './AppContext'
import HomeTab from './tabs/HomeTab'
import TasksTab from './tabs/TasksTab'
import MoneyTab from './tabs/MoneyTab'
import HealthTab from './tabs/HealthTab'
import MoreTab from './tabs/MoreTab'
import CloudSyncAgent from './components/CloudSyncAgent'
import PushSyncAgent from './components/PushSyncAgent'
import SmartReminderAgent from './components/SmartReminderAgent'
import WidgetSyncAgent from './components/WidgetSyncAgent'
import LocationAttendanceAgent from './components/LocationAttendanceAgent'
import PullToRefreshAgent from './components/PullToRefreshAgent'
import { THEME_ICONS, UiIcon, getNavIcons, resolveIconStyle } from './uiIcons'
import './App.css'

const FLOATING_TOGGLE_MARGIN = 8
const FLOATING_TOGGLE_SIZE = 36

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function AppInner() {
  const [tab, setTab] = useState('home')
  const [themeTogglePos, setThemeTogglePos] = useState(null)
  const { theme, toggleTheme, iconStyle } = useApp()
  const themeToggleRef = useRef(null)
  const themeTogglePosRef = useRef(null)
  const suppressThemeClickRef = useRef(false)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  })
  const normalizedIconStyle = resolveIconStyle(iconStyle)
  const navIcons = getNavIcons(normalizedIconStyle)
  const tabs = [
    { id: 'home', label: 'Home', icon: navIcons.home },
    { id: 'tasks', label: 'Tasks', icon: navIcons.tasks },
    { id: 'money', label: 'Money', icon: navIcons.money },
    { id: 'health', label: 'Health', icon: navIcons.health },
    { id: 'more', label: 'More', icon: navIcons.more },
  ]
  const ThemeIcon = theme === 'dark' ? THEME_ICONS.dark : THEME_ICONS.light

  const applyThemeTogglePosition = (pos) => {
    const button = themeToggleRef.current
    if (!button || !pos) return
    button.style.left = `${pos.x}px`
    button.style.top = `${pos.y}px`
    button.style.right = 'auto'
  }

  const clampThemeTogglePos = (x, y, width = FLOATING_TOGGLE_SIZE, height = FLOATING_TOGGLE_SIZE) => {
    if (typeof window === 'undefined') return { x, y }
    const maxX = Math.max(FLOATING_TOGGLE_MARGIN, window.innerWidth - width - FLOATING_TOGGLE_MARGIN)
    const maxY = Math.max(FLOATING_TOGGLE_MARGIN, window.innerHeight - height - FLOATING_TOGGLE_MARGIN)
    return {
      x: clamp(x, FLOATING_TOGGLE_MARGIN, maxX),
      y: clamp(y, FLOATING_TOGGLE_MARGIN, maxY),
    }
  }

  const startThemeToggleDrag = (event) => {
    if (typeof event.button === 'number' && event.button !== 0) return
    const button = themeToggleRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    themeTogglePosRef.current = { x: rect.left, y: rect.top }
    button.setPointerCapture?.(event.pointerId)
  }

  const moveThemeToggleDrag = (event) => {
    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) > 4) {
      drag.moved = true
    }
    if (!drag.moved) return

    event.preventDefault()
    const rect = themeToggleRef.current?.getBoundingClientRect()
    const next = clampThemeTogglePos(
      drag.originX + dx,
      drag.originY + dy,
      rect?.width || FLOATING_TOGGLE_SIZE,
      rect?.height || FLOATING_TOGGLE_SIZE
    )
    themeTogglePosRef.current = next
    applyThemeTogglePosition(next)
  }

  const endThemeToggleDrag = (event) => {
    const drag = dragRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      suppressThemeClickRef.current = true
      if (themeTogglePosRef.current) {
        setThemeTogglePos(themeTogglePosRef.current)
      }
    }

    dragRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      moved: false,
    }
    themeToggleRef.current?.releasePointerCapture?.(event.pointerId)
  }

  const handleThemeToggleClick = () => {
    if (suppressThemeClickRef.current) {
      suppressThemeClickRef.current = false
      return
    }
    toggleTheme()
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleResize = () => {
      const current = themeTogglePosRef.current
      if (!current) return
      const rect = themeToggleRef.current?.getBoundingClientRect()
      const clamped = clampThemeTogglePos(
        current.x,
        current.y,
        rect?.width || FLOATING_TOGGLE_SIZE,
        rect?.height || FLOATING_TOGGLE_SIZE
      )
      themeTogglePosRef.current = clamped
      applyThemeTogglePosition(clamped)
      setThemeTogglePos(prev => {
        if (!prev) return clamped
        const rect = themeToggleRef.current?.getBoundingClientRect()
        const resized = clampThemeTogglePos(
          prev.x,
          prev.y,
          rect?.width || FLOATING_TOGGLE_SIZE,
          rect?.height || FLOATING_TOGGLE_SIZE
        )
        if (resized.x === prev.x && resized.y === prev.y) return prev
        return resized
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!themeTogglePos) return
    themeTogglePosRef.current = themeTogglePos
    applyThemeTogglePosition(themeTogglePos)
  }, [themeTogglePos])

  return (
    <div className={`app ${theme} icon-${normalizedIconStyle}`}>
      <button
        ref={themeToggleRef}
        className="theme-toggle"
        onPointerDown={startThemeToggleDrag}
        onPointerMove={moveThemeToggleDrag}
        onPointerUp={endThemeToggleDrag}
        onPointerCancel={endThemeToggleDrag}
        onClick={handleThemeToggleClick}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={themeTogglePos ? { left: `${themeTogglePos.x}px`, top: `${themeTogglePos.y}px`, right: 'auto' } : undefined}
      >
        <UiIcon icon={ThemeIcon} />
      </button>
      <main id="peggy-scroll-root" className="app-main">
        {tab === 'home' && <HomeTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'money' && <MoneyTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'more' && <MoreTab />}
      </main>

      <nav className="bottom-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon"><UiIcon icon={t.icon} /></span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <CloudSyncAgent />
      <PushSyncAgent />
      <SmartReminderAgent />
      <WidgetSyncAgent />
      <LocationAttendanceAgent />
      <PullToRefreshAgent />
      <AppInner />
    </AppProvider>
  )
}
