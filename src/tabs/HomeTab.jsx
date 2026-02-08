import { useState, useMemo } from 'react'
import { useApp } from '../AppContext'
import { phases, supplements, moneyTracker, checkupSchedule, taglishTips } from '../data'
import Calendar, { isoToDateString } from '../components/Calendar'
import DayDetail from '../components/DayDetail'

// Find earliest date any supplement was tracked
function getFirstTrackingDate(dailySupp) {
  let earliest = null
  for (const key of Object.keys(dailySupp)) {
    // Keys are like "prenatal-0-Sat Feb 08 2026"
    const parts = key.split('-')
    const dateStr = parts.slice(2).join('-') // rejoin in case dateString has dashes
    const d = new Date(dateStr)
    if (!isNaN(d) && (!earliest || d < earliest)) earliest = d
  }
  return earliest
}

// Helper: supp status for a date
function getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate) {
  const ds = isoToDateString(dateISO)
  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  if (dateISO > todayISO) return null

  // Don't show anything for dates before user started tracking
  if (firstTrackDate) {
    const cellDate = new Date(ds)
    if (cellDate < firstTrackDate) return null
  } else {
    return null // no tracking data at all
  }

  let total = 0, taken = 0
  supplements.forEach(s => {
    const sched = suppSchedule[s.id]
    const times = sched?.times || s.defaultTimes
    times.forEach((_, i) => {
      total++
      if (dailySupp[`${s.id}-${i}-${ds}`]) taken++
    })
  })
  if (total === 0) return null
  if (taken === total) return 'all'
  if (taken > 0) return 'partial'
  return 'missed'
}

export default function HomeTab() {
  const {
    checked, dailySupp, isSuppTaken, moneyClaimed, dueDate, setDueDate,
    checkups, moods, suppSchedule, attendance
  } = useApp()
  const [showDueInput, setShowDueInput] = useState(!dueDate)
  const now = new Date()
  const [calState, setCalState] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [selectedDay, setSelectedDay] = useState(null)

  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0)
  const doneItems = phases.reduce((acc, p) => acc + p.items.filter(i => checked[i.id]).length, 0)
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const suppTaken = supplements.filter(s => {
    const schedule = suppSchedule?.[s.id]
    const times = schedule?.times || s.defaultTimes
    return times.every((_, i) => isSuppTaken(s.id, i))
  }).length
  const suppTotal = supplements.length

  const totalMoney = moneyTracker.reduce((acc, m) => acc + m.amount, 0)
  const claimedMoney = moneyTracker.filter(m => moneyClaimed[m.id]).reduce((acc, m) => acc + m.amount, 0)

  const daysUntilDue = dueDate
    ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const weeksPregnant = dueDate
    ? Math.max(0, 40 - Math.ceil(daysUntilDue / 7))
    : null

  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    return taglishTips[dayOfYear % taglishTips.length]
  }, [])

  const nextCheckup = useMemo(() => {
    for (const visit of checkupSchedule) {
      if (!checkups[visit.id]?.completed) return visit
    }
    return null
  }, [checkups])

  const completedCheckups = checkupSchedule.filter(v => checkups[v.id]?.completed).length
  const latestMood = moods.length > 0 ? moods[0] : null

  // Checkup dates lookup
  const checkupDates = useMemo(() => {
    const map = {}
    checkupSchedule.forEach(v => {
      const data = checkups[v.id]
      if (data?.date) map[data.date] = true
    })
    return map
  }, [checkups])

  // Mood by date
  const moodByDate = useMemo(() => {
    const map = {}
    moods.forEach(m => {
      const d = new Date(m.date)
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      if (!map[iso]) map[iso] = m
    })
    return map
  }, [moods])

  // First date any supp was tracked (so we don't show "missed" before tracking started)
  const firstTrackDate = useMemo(() => getFirstTrackingDate(dailySupp), [dailySupp])

  // Reminder checks
  const todayStr = now.toISOString().split('T')[0]
  const todayDay = now.getDay()
  const isWeekday = todayDay >= 1 && todayDay <= 5
  const todayAttendance = attendance[todayStr]
  const allSuppsTaken = suppTaken === suppTotal

  return (
    <div className="content">
      <header className="home-header">
        <h1>Peggy</h1>
        <p className="subtitle">Your Pregnancy Companion</p>
        {dueDate && daysUntilDue > 0 && !showDueInput && (
          <div className="due-badge glass-inner" onClick={() => setShowDueInput(true)}>
            {daysUntilDue} days to go {weeksPregnant !== null && `(Week ${weeksPregnant})`}
          </div>
        )}
        {dueDate && daysUntilDue !== null && daysUntilDue <= 0 && !showDueInput && (
          <div className="due-badge due-now glass-inner" onClick={() => setShowDueInput(true)}>
            Baby is here (or any day now!)
          </div>
        )}
        {(!dueDate || showDueInput) && (
          <div className="due-input">
            <label>Due date: </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => { setDueDate(e.target.value); setShowDueInput(false) }}
            />
          </div>
        )}
      </header>

      <div className="stats">
        <div className="stat-card glass-card">
          <div className="stat-number">{progress}%</div>
          <div className="stat-label">Tasks Done</div>
          <div className="stat-bar"><div style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-number">{suppTaken}/{suppTotal}</div>
          <div className="stat-label">Supps Today</div>
          <div className="stat-bar"><div style={{ width: `${(suppTaken / suppTotal) * 100}%` }} className="green" /></div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-number">{(claimedMoney / 10000).toFixed(0)}万</div>
          <div className="stat-label">Yen Claimed</div>
          <div className="stat-bar"><div style={{ width: `${(claimedMoney / totalMoney) * 100}%` }} className="gold" /></div>
        </div>
      </div>

      {/* Daily Reminders */}
      {(!allSuppsTaken || (isWeekday && !todayAttendance)) && (
        <section className="glass-section reminder-section">
          <div className="section-header">
            <span className="section-icon">🔔</span>
            <div><h2>Reminders for Today</h2></div>
          </div>
          <div className="reminder-cards">
            {!allSuppsTaken && (
              <div className="reminder-card glass-inner reminder-supps">
                <span className="reminder-icon">💊</span>
                <div className="reminder-content">
                  <div className="reminder-title">Uminom ka na ba ng supplements?</div>
                  <div className="reminder-subtitle">{suppTaken}/{suppTotal} taken - {suppTotal - suppTaken} remaining today</div>
                </div>
              </div>
            )}
            {isWeekday && !todayAttendance && (
              <div className="reminder-card glass-inner reminder-work">
                <span className="reminder-icon">💼</span>
                <div className="reminder-content">
                  <div className="reminder-title">Pumasok ka ba sa work ngayon?</div>
                  <div className="reminder-subtitle">Don't forget to log today's attendance!</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {weeksPregnant !== null && weeksPregnant >= 0 && (
        <section className="glass-section home-progress-ring">
          <div className="ring-container">
            <svg viewBox="0 0 120 120" className="progress-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke="url(#ringGradient)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(weeksPregnant / 40) * 327} 327`}
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e91e8b" />
                  <stop offset="100%" stopColor="#6c5ce7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="ring-text">
              <div className="ring-number">{weeksPregnant}</div>
              <div className="ring-label">weeks</div>
            </div>
          </div>
          <div className="ring-info">
            <div className="ring-detail">Trimester {weeksPregnant < 13 ? '1' : weeksPregnant < 27 ? '2' : '3'}</div>
            <div className="ring-detail">Checkups: {completedCheckups}/14</div>
            {latestMood && (
              <div className="ring-detail">Mood: {latestMood.mood} {latestMood.energy && `Energy: ${latestMood.energy}/5`}</div>
            )}
          </div>
        </section>
      )}

      {/* Master Calendar */}
      <section className="glass-section">
        <div className="section-header">
          <span className="section-icon">📅</span>
          <div><h2>All Activity</h2></div>
        </div>
        <Calendar
          year={calState.y} month={calState.m}
          onMonthChange={(y, m) => setCalState({ y, m })}
          selectedDate={selectedDay}
          onDayClick={(d) => setSelectedDay(d)}
          renderDay={(dateISO) => {
            const suppSt = getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate)
            const att = attendance[dateISO]
            const hasCheckup = checkupDates[dateISO]
            const mood = moodByDate[dateISO]
            if (!suppSt && !att && !hasCheckup && !mood) return null
            return (
              <div className="cal-dots">
                {suppSt && <span className={`cal-micro supp-dot-${suppSt}`} />}
                {att && <span className={`cal-micro ${att.worked ? 'work-dot-yes' : 'work-dot-no'}`} />}
                {hasCheckup && <span className="cal-micro checkup-dot" />}
                {mood && <span className="cal-micro mood-dot" />}
              </div>
            )
          }}
        />
        <div className="cal-legend">
          <span className="cal-legend-item"><span className="cal-micro supp-dot-all" /> Supps</span>
          <span className="cal-legend-item"><span className="cal-micro work-dot-yes" /> Worked</span>
          <span className="cal-legend-item"><span className="cal-micro checkup-dot" /> Checkup</span>
          <span className="cal-legend-item"><span className="cal-micro mood-dot" /> Mood</span>
        </div>
      </section>

      {selectedDay && (
        <DayDetail
          dateISO={selectedDay}
          onClose={() => setSelectedDay(null)}
          dailySupp={dailySupp}
          suppSchedule={suppSchedule}
          attendance={attendance}
          checkups={checkups}
          moods={moods}
        />
      )}

      {nextCheckup && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon">🏥</span>
            <div>
              <h2>Next Checkup</h2>
              <span className="section-count">Visit {nextCheckup.visit} - Week {nextCheckup.weekRange}</span>
            </div>
          </div>
          <p className="tip-text">{nextCheckup.label}</p>
        </section>
      )}

      <section className="glass-section tip-card">
        <div className="section-header">
          <span className="section-icon">💡</span>
          <div><h2>Daily Tip</h2></div>
        </div>
        <p className="tip-text">{dailyTip}</p>
      </section>

      <section className="glass-section">
        <div className="section-header">
          <span className="section-icon">📊</span>
          <div><h2>Quick Overview</h2></div>
        </div>
        <div className="quick-stats">
          <div className="quick-stat glass-inner">
            <span className="qs-icon">📋</span>
            <span className="qs-label">Tasks</span>
            <span className="qs-value">{doneItems}/{totalItems}</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon">💰</span>
            <span className="qs-label">Benefits</span>
            <span className="qs-value">¥{claimedMoney.toLocaleString()}</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon">🏥</span>
            <span className="qs-label">Checkups</span>
            <span className="qs-value">{completedCheckups}/14</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon">💊</span>
            <span className="qs-label">Supps Today</span>
            <span className="qs-value">{suppTaken}/{suppTotal}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
