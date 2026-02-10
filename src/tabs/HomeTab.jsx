import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../AppContext'
import { phases, supplements, moneyTracker, checkupSchedule } from '../data'
import { babyNamesInfo } from '../infoData'
import Calendar, { isoToDateString } from '../components/Calendar'
import DayDetail from '../components/DayDetail'
import { APP_ICONS, TokenIcon, UiIcon } from '../uiIcons'
import {
  buildCompanionSubtitleRotation,
  buildDailyTip,
  buildNameSpotlight,
  buildPlannerReminder,
  buildSupplementReminder,
  buildWorkReminder,
  getPlannerReminderContext,
  getSupplementReminderContext,
  getWorkReminderContext,
} from '../reminderContent'

// Find earliest date any supplement was tracked
function getFirstTrackingDate(dailySupp) {
  let earliest = null
  for (const key of Object.keys(dailySupp)) {
    // Keys are like "prenatal-0-Sat Feb 08 2026"
    const parts = key.split('-')
    const dateStr = parts.slice(2).join('-') // Rejoin in case dateString has dashes
    const d = new Date(dateStr)
    if (!Number.isNaN(d) && (!earliest || d < earliest)) earliest = d
  }
  return earliest
}

// Helper: supplement status for a date
function getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate) {
  const ds = isoToDateString(dateISO)
  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (dateISO > todayISO) return null

  // Don't show anything for dates before user started tracking
  if (firstTrackDate) {
    const cellDate = new Date(ds)
    if (cellDate < firstTrackDate) return null
  } else {
    return null
  }

  let total = 0
  let taken = 0
  supplements.forEach(s => {
    const sched = suppSchedule[s.id]
    const times = sched?.times || s.defaultTimes
    times.forEach((_, i) => {
      total += 1
      if (dailySupp[`${s.id}-${i}-${ds}`]) taken += 1
    })
  })
  if (total === 0) return null
  if (taken === total) return 'all'
  if (taken > 0) return 'partial'
  return 'missed'
}

export default function HomeTab() {
  const {
    checked,
    dailySupp,
    isSuppTaken,
    moneyClaimed,
    dueDate,
    setDueDate,
    checkups,
    moods,
    suppSchedule,
    attendance,
    planner,
    addPlan,
    updatePlan,
    removePlan,
    togglePlanDone,
  } = useApp()

  const [showDueInput, setShowDueInput] = useState(!dueDate)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [subtitleTick, setSubtitleTick] = useState(() => Date.now())
  const now = useMemo(() => new Date(nowTick), [nowTick])
  const [calState, setCalState] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setSubtitleTick(Date.now()), 6 * 1000)
    return () => clearInterval(id)
  }, [])

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
  const claimedMoney = moneyTracker
    .filter(m => moneyClaimed[m.id])
    .reduce((acc, m) => acc + m.amount, 0)

  const daysUntilDue = dueDate
    ? Math.ceil((new Date(dueDate) - now) / (1000 * 60 * 60 * 24))
    : null

  const weeksPregnant = dueDate
    ? Math.max(0, 40 - Math.ceil(daysUntilDue / 7))
    : null

  const nextCheckup = useMemo(() => {
    for (const visit of checkupSchedule) {
      if (!checkups[visit.id]?.completed) return visit
    }
    return null
  }, [checkups])

  const completedCheckups = checkupSchedule.filter(v => checkups[v.id]?.completed).length
  const latestMood = moods.length > 0 ? moods[0] : null

  const checkupDates = useMemo(() => {
    const map = {}
    checkupSchedule.forEach(v => {
      const data = checkups[v.id]
      if (data?.date) map[data.date] = true
    })
    return map
  }, [checkups])

  const moodByDate = useMemo(() => {
    const map = {}
    moods.forEach(m => {
      const d = new Date(m.date)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[iso]) map[iso] = m
    })
    return map
  }, [moods])

  const firstTrackDate = useMemo(() => getFirstTrackingDate(dailySupp), [dailySupp])

  const suppReminderCtx = useMemo(
    () => getSupplementReminderContext({ dailySupp, suppSchedule, now }),
    [dailySupp, suppSchedule, nowTick],
  )
  const workReminderCtx = useMemo(
    () => getWorkReminderContext({ attendance, now }),
    [attendance, nowTick],
  )
  const planReminderCtx = useMemo(
    () => getPlannerReminderContext({ planner, now }),
    [planner, nowTick],
  )

  const suppReminder = useMemo(
    () => (suppReminderCtx.remainingDoses > 0 ? buildSupplementReminder(suppReminderCtx, now, 'home') : null),
    [suppReminderCtx, nowTick],
  )
  const workReminder = useMemo(
    () => (workReminderCtx.needsReminder ? buildWorkReminder(workReminderCtx, now, 'home') : null),
    [workReminderCtx, nowTick],
  )
  const planReminder = useMemo(
    () => (planReminderCtx?.candidate?.planId ? buildPlannerReminder(planReminderCtx, now, 'home') : null),
    [planReminderCtx, nowTick],
  )

  const nameSpotlight = useMemo(
    () => buildNameSpotlight({ now, babyNamesInfo, seedSalt: 'home' }),
    [nowTick],
  )
  const companionSubtitle = useMemo(
    () => buildCompanionSubtitleRotation({ now: new Date(subtitleTick), babyNamesInfo, seedSalt: 'home' }),
    [subtitleTick],
  )

  const dailyTip = useMemo(
    () => buildDailyTip({
      now,
      weeksPregnant,
      completedCheckups,
      suppCtx: suppReminderCtx,
    }),
    [nowTick, weeksPregnant, completedCheckups, suppReminderCtx.remainingDoses, suppReminderCtx.overdueDoses],
  )

  return (
    <div className="content">
      <header className="home-header">
        <div className="home-header-surface">
          <div className="home-header-top">
            <div className="home-header-brand">
              <h1>Peggy</h1>
              <p key={companionSubtitle.slotKey} className="subtitle dynamic-companion subtitle-no-card">
                {companionSubtitle.text}
              </p>
            </div>
            {dueDate && !showDueInput && (
              <button
                type="button"
                className={`due-badge glass-inner ${daysUntilDue !== null && daysUntilDue <= 0 ? 'due-now' : ''}`}
                onClick={() => setShowDueInput(true)}
              >
                {daysUntilDue !== null && daysUntilDue > 0 ? (
                  <>
                    <span className="due-badge-label">Due Countdown</span>
                    <span className="due-badge-value">{daysUntilDue} days</span>
                    {weeksPregnant !== null && <span className="due-badge-meta">Week {weeksPregnant}</span>}
                  </>
                ) : (
                  <>
                    <span className="due-badge-label">Delivery Window</span>
                    <span className="due-badge-value">Any day now</span>
                    <span className="due-badge-meta">Tap to update due date</span>
                  </>
                )}
              </button>
            )}
          </div>
          {(!dueDate || showDueInput) && (
            <div className="due-input">
              <label htmlFor="due-date-input">Due date</label>
              <input
                id="due-date-input"
                type="date"
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value)
                  setShowDueInput(false)
                }}
              />
            </div>
          )}
        </div>
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

      <section className="glass-section tip-card">
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.tip} /></span>
          <div><h2>Daily Tip</h2></div>
        </div>
        <div className={`tip-mode ${dailyTip.tone}`}>{dailyTip.modeLabel} - {dailyTip.category}</div>
        <p className="tip-text">{dailyTip.text}</p>
      </section>

      <section className="glass-section reminder-section">
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.reminders} /></span>
          <div><h2>Reminders for Today</h2></div>
        </div>
        {(planReminder || suppReminder || workReminder) ? (
          <div className="reminder-cards">
            {planReminder && (
              <div
                className={`reminder-card glass-inner reminder-plan level-${planReminder.level}`}
                onClick={() => setSelectedDay(planReminder.planDateISO)}
              >
                <span className="reminder-icon"><UiIcon icon={APP_ICONS.activity} /></span>
                <div className="reminder-content">
                  <div className="reminder-title">{planReminder.title}</div>
                  <div className="reminder-subtitle">{planReminder.subtitle}</div>
                </div>
                <button
                  type="button"
                  className="btn-glass-mini primary reminder-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePlanDone?.(planReminder.planDateISO, planReminder.planId)
                  }}
                >
                  Done
                </button>
              </div>
            )}
            {suppReminder && (
              <div className={`reminder-card glass-inner reminder-supps level-${suppReminder.level}`}>
                <span className="reminder-icon"><UiIcon icon={APP_ICONS.supplements} /></span>
                <div className="reminder-content">
                  <div className="reminder-title">{suppReminder.title}</div>
                  <div className="reminder-subtitle">{suppReminder.subtitle}</div>
                </div>
              </div>
            )}
            {workReminder && (
              <div className={`reminder-card glass-inner reminder-work level-${workReminder.level}`}>
                <span className="reminder-icon"><UiIcon icon={APP_ICONS.work} /></span>
                <div className="reminder-content">
                  <div className="reminder-title">{workReminder.title}</div>
                  <div className="reminder-subtitle">{workReminder.subtitle}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="section-note">All good. No reminders right now.</p>
        )}
        <p className="section-note">Notification settings are now in More.</p>
      </section>

      <section className="glass-section">
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
          <div>
            <h2>Calendar</h2>
            <span className="section-count">Tap a date to add plans</span>
          </div>
        </div>
        <Calendar
          year={calState.y}
          month={calState.m}
          onMonthChange={(y, m) => setCalState({ y, m })}
          selectedDate={selectedDay}
          onDayClick={d => setSelectedDay(d)}
          renderDay={dateISO => {
            const suppSt = getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate)
            const att = attendance[dateISO]
            const hasCheckup = checkupDates[dateISO]
            const mood = moodByDate[dateISO]
            const hasPlans = Array.isArray(planner?.[dateISO]) && planner[dateISO].length > 0
            if (!suppSt && !att && !hasCheckup && !mood && !hasPlans) return null
            return (
              <div className="cal-dots">
                {suppSt && <span className={`cal-micro supp-dot-${suppSt}`} />}
                {att && <span className={`cal-micro ${att.worked ? 'work-dot-yes' : 'work-dot-no'}`} />}
                {hasCheckup && <span className="cal-micro checkup-dot" />}
                {mood && <span className="cal-micro mood-dot" />}
                {hasPlans && <span className="cal-micro planner-dot" />}
              </div>
            )
          }}
        />
        <div className="cal-legend">
          <span className="cal-legend-item"><span className="cal-micro supp-dot-all" /> Supps</span>
          <span className="cal-legend-item"><span className="cal-micro work-dot-yes" /> Worked</span>
          <span className="cal-legend-item"><span className="cal-micro checkup-dot" /> Checkup</span>
          <span className="cal-legend-item"><span className="cal-micro mood-dot" /> Mood</span>
          <span className="cal-legend-item"><span className="cal-micro planner-dot" /> Plans</span>
        </div>
      </section>

      {selectedDay && (
        <DayDetail
          key={selectedDay}
          dateISO={selectedDay}
          onClose={() => setSelectedDay(null)}
          dailySupp={dailySupp}
          suppSchedule={suppSchedule}
          attendance={attendance}
          checkups={checkups}
          moods={moods}
          planner={planner}
          addPlan={addPlan}
          updatePlan={updatePlan}
          removePlan={removePlan}
          togglePlanDone={togglePlanDone}
        />
      )}

      {weeksPregnant !== null && weeksPregnant >= 0 && (
        <section className="glass-section home-progress-ring">
          <div className="ring-container">
            <svg viewBox="0 0 120 120" className="progress-svg">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="8"
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
              <div className="ring-detail ring-mood-detail">
                <span>Mood:</span>
                <span className="ring-mood-icon"><TokenIcon token={latestMood.mood} /></span>
                <span>{latestMood.energy && `Energy: ${latestMood.energy}/5`}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="glass-section name-spotlight-card">
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.names} /></span>
          <div>
            <h2>Name Spotlight</h2>
            <span className="section-count">{nameSpotlight.gender === 'boy' ? 'Boy names' : 'Girl names'} - updates every few hours</span>
          </div>
        </div>
        <div className="name-spotlight-main glass-inner">
          <div className="name-spotlight-title">{nameSpotlight.spotlight.name} {nameSpotlight.spotlight.kanji}</div>
          <div className="name-spotlight-subtitle">{nameSpotlight.spotlight.meaning}</div>
          <div className="name-spotlight-line">{nameSpotlight.spotlightLine} {nameSpotlight.jokeLine}</div>
        </div>
        <div className="name-chip-row">
          {nameSpotlight.pinnedTopPicks.map((pick, idx) => (
            <div key={`${pick.name}-${idx}`} className="name-chip glass-inner">
              <span className="name-chip-main">{pick.name}</span>
              <span className="name-chip-kanji">{pick.kanji}</span>
              <span className="name-chip-badge">Top Pick</span>
            </div>
          ))}
        </div>
      </section>

      {nextCheckup && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.checkup} /></span>
            <div>
              <h2>Next Checkup</h2>
              <span className="section-count">Visit {nextCheckup.visit} - Week {nextCheckup.weekRange}</span>
            </div>
          </div>
          <p className="tip-text">{nextCheckup.label}</p>
        </section>
      )}

      <section className="glass-section">
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
          <div><h2>Quick Overview</h2></div>
        </div>
        <div className="quick-stats">
          <div className="quick-stat glass-inner">
            <span className="qs-icon"><UiIcon icon={APP_ICONS.tasks} /></span>
            <span className="qs-label">Tasks</span>
            <span className="qs-value">{doneItems}/{totalItems}</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon"><UiIcon icon={APP_ICONS.benefits} /></span>
            <span className="qs-label">Benefits</span>
            <span className="qs-value">¥{claimedMoney.toLocaleString()}</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon"><UiIcon icon={APP_ICONS.checkup} /></span>
            <span className="qs-label">Checkups</span>
            <span className="qs-value">{completedCheckups}/14</span>
          </div>
          <div className="quick-stat glass-inner">
            <span className="qs-icon"><UiIcon icon={APP_ICONS.supplements} /></span>
            <span className="qs-label">Supps Today</span>
            <span className="qs-value">{suppTaken}/{suppTotal}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
