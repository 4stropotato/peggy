import { useState } from 'react'
import { AppProvider, useApp } from './AppContext'
import HomeTab from './tabs/HomeTab'
import TasksTab from './tabs/TasksTab'
import MoneyTab from './tabs/MoneyTab'
import HealthTab from './tabs/HealthTab'
import MoreTab from './tabs/MoreTab'
import './App.css'

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'money', label: 'Money', icon: '💰' },
  { id: 'health', label: 'Health', icon: '💊' },
  { id: 'more', label: 'More', icon: '⋯' },
]

function AppInner() {
  const [tab, setTab] = useState('home')
  const { theme, toggleTheme } = useApp()

  return (
    <div className={`app ${theme}`}>
      <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <main className="app-main">
        {tab === 'home' && <HomeTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'money' && <MoneyTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'more' && <MoreTab />}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
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
      <AppInner />
    </AppProvider>
  )
}
