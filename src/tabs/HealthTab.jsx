import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../AppContext'
import { supplements, checkupSchedule, optimalSchedule } from '../data'
import Calendar, { isoToDateString } from '../components/Calendar'
import { APP_ICONS, TokenIcon, UiIcon } from '../uiIcons'
import { getCurrentAppLocation, isNativeIos } from '../native/locationBridge'
import { GEO_TELEMETRY_EVENT, getGeoTelemetry } from '../locationTelemetry'

const MOOD_EMOJIS = ['😊', '😐', '😢', '🤢', '😴', '😤', '🥰', '😰']

const MIN_WORK_RADIUS_METERS = 50
const DEFAULT_WORK_RADIUS_METERS = 180
const DEFAULT_HOME_RADIUS_METERS = 220
const DEFAULT_AUTO_HOURS = 8
const DEFAULT_AWAY_MINUTES = 90
const MAX_GEOFENCE_RADIUS_METERS = 3000
const MAX_AWAY_MINUTES = 720

const DEFAULT_GEO_LIVE = {
  tracking: false,
  inside: false,
  insideWork: false,
  insideHome: false,
  distanceMeters: null,
  distanceWorkMeters: null,
  distanceHomeMeters: null,
  accuracyMeters: null,
  updatedAt: '',
}

function isValidLatLng(lat, lng) {
  const latNum = Number(lat)
  const lngNum = Number(lng)
  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  )
}

function normalizeRadius(value, fallback = DEFAULT_WORK_RADIUS_METERS) {
  return Math.min(
    MAX_GEOFENCE_RADIUS_METERS,
    Math.max(MIN_WORK_RADIUS_METERS, Number(value) || fallback)
  )
}

function normalizeAutoHours(value) {
  return Math.min(12, Math.max(0.5, Number(value) || DEFAULT_AUTO_HOURS))
}

function normalizeAwayMinutes(value) {
  return Math.min(MAX_AWAY_MINUTES, Math.max(15, Number(value) || DEFAULT_AWAY_MINUTES))
}

function toCoordString(value) {
  if (value === '' || value === null || typeof value === 'undefined') return ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return parsed.toFixed(6)
}

function toLocationDraft(location) {
  return {
    workName: String(location?.name || ''),
    workLat: toCoordString(location?.lat),
    workLng: toCoordString(location?.lng),
    workRadiusMeters: String(normalizeRadius(location?.radiusMeters, DEFAULT_WORK_RADIUS_METERS)),
    homeName: String(location?.homeName || ''),
    homeLat: toCoordString(location?.homeLat),
    homeLng: toCoordString(location?.homeLng),
    homeRadiusMeters: String(normalizeRadius(location?.homeRadiusMeters, DEFAULT_HOME_RADIUS_METERS)),
    autoHours: String(normalizeAutoHours(location?.autoHours)),
    awayMinutesForWork: String(normalizeAwayMinutes(location?.awayMinutesForWork)),
  }
}

function getCountdown(scheduledTime, lastTaken) {
  const now = new Date()
  const today = now.toDateString()

  const [h, m] = scheduledTime.split(':').map(Number)
  const scheduled = new Date(now)
  scheduled.setHours(h, m, 0, 0)

  if (now > scheduled) {
    if (lastTaken) {
      const takenDate = new Date(lastTaken)
      if (takenDate.toDateString() === today) {
        return { text: 'Done!', status: 'done', minutes: 0 }
      }
    }
    return { text: 'Take now!', status: 'overdue', minutes: 0 }
  }

  const diff = scheduled - now
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60

  if (hrs > 0) {
    return { text: `${hrs}h ${remainMins}m`, status: 'waiting', minutes: mins }
  }
  if (mins <= 15) {
    return { text: `${mins}m`, status: 'soon', minutes: mins }
  }
  return { text: `${mins}m`, status: 'waiting', minutes: mins }
}

function SuppCountdownCard({ supp, schedule, isTaken, toggleSupp, undoSupp, resetBottle, lastTaken, bottle, showExplanation, onToggleExplanation }) {
  const [countdowns, setCountdowns] = useState([])
  // Force re-render on day change so "taken" resets properly
  const [today, setToday] = useState(new Date().toDateString())

  useEffect(() => {
    const update = () => {
      // Detect day change → force fresh render
      const now = new Date().toDateString()
      if (now !== today) setToday(now)
      const times = schedule?.times || supp.defaultTimes
      const cds = times.map((t, i) => ({
        ...getCountdown(t, lastTaken?.[`${supp.id}-${i}`]),
        time: t,
        doseIndex: i,
      }))
      setCountdowns(cds)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [supp.id, schedule, lastTaken, today])

  // Compute "taken" DURING RENDER (not in stale effect) so it always reflects current day
  const times = schedule?.times || supp.defaultTimes
  const takenFlags = times.map((_, i) => isTaken(supp.id, i))
  const allDone = takenFlags.every(Boolean)

  const bottleRemaining = bottle?.remaining ?? supp.bottleSize
  const bottlePercent = (bottleRemaining / supp.bottleSize) * 100
  const dosesPerDay = supp.perDose * (schedule?.timesPerDay || supp.timesPerDay)
  const daysLeft = Math.floor(bottleRemaining / dosesPerDay)
  const totalDays = Math.floor(supp.bottleSize / dosesPerDay)
  const costPerDay = supp.price ? Math.round(supp.price / totalDays) : null

  return (
    <li className={`glass-card supp-card ${allDone ? 'supp-done' : ''}`}>
      <div className="supp-card-header">
        <span className="supp-icon-lg"><TokenIcon token={supp.icon} /></span>
        <div className="supp-card-info">
          <div className="supp-card-name">{supp.name}</div>
          <div className="supp-card-why">{supp.why}</div>
        </div>
        <button className="info-btn glass-inner" onClick={onToggleExplanation}>
          {showExplanation ? '▲' : '?'}
        </button>
      </div>

      {showExplanation && (
        <div className="supp-explanation">
          {supp.explanation && <div className="supp-explain-text">{supp.explanation}</div>}
          {supp.dosageInfo && (
            <div className="supp-dosage-info">
              <span className="supp-dosage-label">Dosage:</span> {supp.dosageInfo}
            </div>
          )}
          {supp.warnings && (
            <div className="supp-warning-info">
              <span className="supp-warning-label">Warning:</span> {supp.warnings}
            </div>
          )}
          {supp.budgetAlt && (
            <div className="supp-budget-alt">
              <span className="supp-dosage-label">Budget Alt:</span> {supp.budgetAlt}
            </div>
          )}
        </div>
      )}

      <div className="supp-countdowns">
        {countdowns.map((cd, i) => {
          const taken = takenFlags[i]
          return (
            <div key={i} className="supp-dose-wrap">
              <div
                className={`supp-dose glass-inner ${taken ? 'dose-done' : cd.status === 'overdue' ? 'dose-overdue' : cd.status === 'soon' ? 'dose-soon' : ''}`}
                onClick={() => !taken && toggleSupp(supp.id, i)}
              >
                <div className="dose-time">{cd.time}</div>
                <div className={`dose-countdown ${taken ? 'done' : cd.status}`}>
                  {taken ? '✓' : cd.text}
                </div>
                <div className="dose-label">
                  {taken ? 'Taken!' : cd.status === 'overdue' ? 'Overdue' : cd.status === 'soon' ? 'Almost time' : 'Upcoming'}
                </div>
              </div>
              {taken && (
                <button className="undo-dose-btn" onClick={() => undoSupp(supp.id, i)}>
                  Undo
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="supp-bottle-bar">
        <div className="bottle-label">
          <span>Bottle: {bottleRemaining}/{supp.bottleSize}</span>
          <span className={daysLeft <= 7 ? 'bottle-low' : ''}>{daysLeft}d left</span>
        </div>
        <div className="bottle-track">
          <div className={`bottle-fill ${bottlePercent < 20 ? 'low' : bottlePercent < 40 ? 'med' : ''}`} style={{ width: `${bottlePercent}%` }} />
        </div>
        <button
          className="reset-bottle-btn"
          onClick={() => {
            if (window.confirm(`Reset ${supp.name} bottle count back to ${supp.bottleSize}? (New bottle opened)`)) {
              resetBottle(supp.id)
            }
          }}
        >
          New Bottle
        </button>
      </div>

      <div className="supp-card-meta">
        <span className="supp-card-product">{supp.product}</span>
        {supp.price && (
          <span className="supp-card-price">¥{supp.price.toLocaleString()} ({totalDays}d = ¥{costPerDay}/day)</span>
        )}
      </div>
      {supp.note && <div className="supp-card-note">{supp.note}</div>}
    </li>
  )
}

// Helper: get supp status for a given ISO date
// Find earliest date any supplement was tracked
function getFirstTrackingDate(dailySupp) {
  let earliest = null
  for (const key of Object.keys(dailySupp)) {
    const parts = key.split('-')
    const dateStr = parts.slice(2).join('-')
    const d = new Date(dateStr)
    if (!isNaN(d) && (!earliest || d < earliest)) earliest = d
  }
  return earliest
}

function getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate) {
  const ds = isoToDateString(dateISO)
  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  if (dateISO > todayISO) return 'future'

  // Don't show anything for dates before user started tracking
  if (firstTrackDate) {
    const cellDate = new Date(ds)
    if (cellDate < firstTrackDate) return 'future'
  } else {
    return 'future' // no tracking data at all
  }

  let total = 0, taken = 0
  supplements.forEach(s => {
    const sched = suppSchedule[s.id]
    const times = sched?.times || s.defaultTimes
    times.forEach((_, i) => {
      total++
      const key = `${s.id}-${i}-${ds}`
      if (dailySupp[key]) taken++
    })
  })
  if (total === 0) return 'future'
  if (taken === total) return 'all'
  if (taken > 0) return 'partial'
  return 'missed'
}

export default function HealthTab() {
  const {
    dailySupp, isSuppTaken, toggleSupp, undoSupp, checkups, updateCheckup, moods, addMood,
    suppSchedule, suppLastTaken, suppBottles, resetBottle,
    attendance, markAttendance, workLocation, setWorkLocation,
    healthCalendarVisibility, setHealthCalendarVisibility,
  } = useApp()
  const [subTab, setSubTab] = useState('supps')
  const [editVisit, setEditVisit] = useState(null)
  const [visitForm, setVisitForm] = useState({})
  const [moodForm, setMoodForm] = useState({ mood: '', energy: 3, cravings: '', notes: '' })
  const [expandedSupp, setExpandedSupp] = useState(null)
  const showCalendar = useMemo(() => {
    const source = healthCalendarVisibility && typeof healthCalendarVisibility === 'object'
      ? healthCalendarVisibility
      : {}
    return {
      supps: source.supps !== false,
      work: source.work !== false,
      checkups: source.checkups !== false,
      mood: source.mood !== false,
    }
  }, [healthCalendarVisibility])

  // Shared calendar state per sub-tab
  const now = new Date()
  const [suppCal, setSuppCal] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [workCal, setWorkCal] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [checkCal, setCheckCal] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [moodCal, setMoodCal] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })

  const [attendanceDate, setAttendanceDate] = useState(now.toISOString().split('T')[0])
  const [attendanceForm, setAttendanceForm] = useState({ worked: true, hours: 8, note: '' })
  const [geoMessage, setGeoMessage] = useState('')
  const [geoStatus, setGeoStatus] = useState(() => String(getGeoTelemetry()?.status || ''))
  const [geoLive, setGeoLive] = useState(() => ({
    ...DEFAULT_GEO_LIVE,
    ...(getGeoTelemetry()?.live || {})
  }))
  const [locationDraft, setLocationDraft] = useState(() => toLocationDraft(workLocation))
  const draftDirtyRef = useRef(false)
  const geoMessageTimerRef = useRef(null)

  useEffect(() => {
    if (draftDirtyRef.current) return
    setLocationDraft(toLocationDraft(workLocation))
  }, [
    workLocation.name,
    workLocation.lat,
    workLocation.lng,
    workLocation.radiusMeters,
    workLocation.homeName,
    workLocation.homeLat,
    workLocation.homeLng,
    workLocation.homeRadiusMeters,
    workLocation.autoHours,
    workLocation.awayMinutesForWork,
  ])

  const suppTaken = supplements.filter(s => {
    const schedule = suppSchedule[s.id]
    const times = schedule?.times || s.defaultTimes
    return times.every((_, i) => isSuppTaken(s.id, i))
  }).length
  const suppTotal = supplements.length
  const savedWorkTargetValid = isValidLatLng(workLocation.lat, workLocation.lng)
  const savedHomeTargetValid = isValidLatLng(workLocation.homeLat, workLocation.homeLng)
  const hasSavedGeoTarget = savedWorkTargetValid || savedHomeTargetValid
  const nativeTrackingMode = isNativeIos()

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const applyTelemetry = (next) => {
      const payload = next && typeof next === 'object' ? next : getGeoTelemetry()
      setGeoStatus(String(payload?.status || ''))
      setGeoLive({ ...DEFAULT_GEO_LIVE, ...(payload?.live || {}) })
    }

    applyTelemetry(getGeoTelemetry())
    const onTelemetry = (event) => applyTelemetry(event?.detail)
    window.addEventListener(GEO_TELEMETRY_EVENT, onTelemetry)
    return () => window.removeEventListener(GEO_TELEMETRY_EVENT, onTelemetry)
  }, [])

  useEffect(() => {
    if (!geoMessage) return undefined
    if (geoMessageTimerRef.current) clearTimeout(geoMessageTimerRef.current)
    geoMessageTimerRef.current = setTimeout(() => {
      setGeoMessage('')
    }, 10000)
    return () => {
      if (geoMessageTimerRef.current) clearTimeout(geoMessageTimerRef.current)
    }
  }, [geoMessage])

  const handleVisitSave = (visitId) => {
    updateCheckup(visitId, { ...visitForm, completed: true })
    setEditVisit(null)
    setVisitForm({})
  }

  const startEditVisit = (visit) => {
    setEditVisit(visit.id)
    setVisitForm(checkups[visit.id] || { date: '', weight: '', bp: '', babySize: '', notes: '', nextDate: '' })
  }

  const handleMoodSubmit = (e) => {
    e.preventDefault()
    if (!moodForm.mood) return
    addMood(moodForm)
    setMoodForm({ mood: '', energy: 3, cravings: '', notes: '' })
  }

  const handleAttendanceSave = () => {
    markAttendance(attendanceDate, attendanceForm)
    setAttendanceForm({ worked: true, hours: 8, note: '' })
  }

  const updateLocationDraft = (patch) => {
    draftDirtyRef.current = true
    setLocationDraft(prev => ({ ...prev, ...patch }))
  }

  const handleSaveLocationConfig = () => {
    const hasWorkCoordsInput = String(locationDraft.workLat || '').trim() !== '' || String(locationDraft.workLng || '').trim() !== ''
    const hasHomeCoordsInput = String(locationDraft.homeLat || '').trim() !== '' || String(locationDraft.homeLng || '').trim() !== ''

    if (hasWorkCoordsInput && !isValidLatLng(locationDraft.workLat, locationDraft.workLng)) {
      setGeoMessage('Work pin is invalid. Enter valid latitude and longitude.')
      return
    }

    if (hasHomeCoordsInput && !isValidLatLng(locationDraft.homeLat, locationDraft.homeLng)) {
      setGeoMessage('Home pin is invalid. Enter valid latitude and longitude.')
      return
    }

    setWorkLocation(prev => ({
      ...prev,
      name: String(locationDraft.workName || '').trim(),
      lat: toCoordString(locationDraft.workLat),
      lng: toCoordString(locationDraft.workLng),
      radiusMeters: normalizeRadius(locationDraft.workRadiusMeters, DEFAULT_WORK_RADIUS_METERS),
      homeName: String(locationDraft.homeName || '').trim(),
      homeLat: toCoordString(locationDraft.homeLat),
      homeLng: toCoordString(locationDraft.homeLng),
      homeRadiusMeters: normalizeRadius(locationDraft.homeRadiusMeters, DEFAULT_HOME_RADIUS_METERS),
      autoHours: normalizeAutoHours(locationDraft.autoHours),
      awayMinutesForWork: normalizeAwayMinutes(locationDraft.awayMinutesForWork),
    }))

    draftDirtyRef.current = false
    setGeoMessage('Saved location settings. You can now enable tracker.')
  }

  const handleUseCurrentLocation = async (target = 'work') => {
    try {
      setGeoMessage('Getting current location...')
      const loc = await getCurrentAppLocation()
      if (!loc) {
        setGeoMessage('Could not get current location. Try again.')
        return
      }

      const lat = loc.latitude
      const lng = loc.longitude
      if (target === 'home') {
        updateLocationDraft({
          homeLat: lat.toFixed(6),
          homeLng: lng.toFixed(6),
          homeName: String(locationDraft.homeName || '').trim() || 'Home',
        })
        setGeoMessage('Current location captured for Home. Tap Save Locations.')
        return
      }

      updateLocationDraft({
        workLat: lat.toFixed(6),
        workLng: lng.toFixed(6),
        workName: String(locationDraft.workName || '').trim() || 'Work',
      })
      setGeoMessage('Current location captured for Work. Tap Save Locations.')
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      if (msg.includes('permission')) {
        setGeoMessage('Location permission denied. Enable location access first.')
      } else {
        setGeoMessage('Could not get current location. Try again.')
      }
    }
  }

  const handleEnableTracker = () => {
    if (!hasSavedGeoTarget) {
      setGeoMessage('Save at least one valid location (Work or Home) before enabling tracker.')
      return
    }
    setWorkLocation(prev => ({ ...prev, enabled: true }))
    setGeoMessage('Location tracker enabled.')
  }

  const handleDisableTracker = () => {
    setWorkLocation(prev => ({ ...prev, enabled: false }))
    setGeoMessage('Location tracker disabled.')
  }

  const toggleCalendar = (tab) => {
    const key = String(tab || '').trim()
    if (!key) return
    setHealthCalendarVisibility(prev => {
      const safe = prev && typeof prev === 'object' ? prev : {}
      const normalized = {
        supps: safe.supps !== false,
        work: safe.work !== false,
        checkups: safe.checkups !== false,
        mood: safe.mood !== false,
      }
      return { ...normalized, [key]: !normalized[key] }
    })
  }

  // Monthly work stats
  const viewMonth = `${workCal.y}-${String(workCal.m).padStart(2, '0')}`
  const monthAttendance = useMemo(() => {
    return Object.entries(attendance)
      .filter(([date]) => date.startsWith(viewMonth))
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [attendance, viewMonth])

  const daysWorked = monthAttendance.filter(a => a.worked).length
  const totalHours = monthAttendance.filter(a => a.worked).reduce((acc, a) => acc + (Number(a.hours) || 0), 0)

  // Mood lookup by date
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

  // Checkup dates lookup
  const checkupDates = useMemo(() => {
    const map = {}
    checkupSchedule.forEach(v => {
      const data = checkups[v.id]
      if (data?.date) map[data.date] = v
    })
    return map
  }, [checkups])

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['supps', 'work', 'checkups', 'mood'].map(t => (
          <button key={t} className={`glass-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>
            <span className="tab-icon-label">
              <UiIcon icon={t === 'supps' ? APP_ICONS.supplements : t === 'work' ? APP_ICONS.work : t === 'checkups' ? APP_ICONS.checkup : APP_ICONS.tip} />
              <span>{t === 'supps' ? 'Supps' : t === 'work' ? 'Work' : t === 'checkups' ? 'Checkups' : 'Mood'}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ========== SUPPS ========== */}
      {subTab === 'supps' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.supplements} /></span>
              <div>
                <h2>Daily Supplement Tracker</h2>
                <span className="section-count">{suppTaken}/{suppTotal} complete today</span>
              </div>
              <button
                type="button"
                className="cal-collapse-btn"
                onClick={() => toggleCalendar('supps')}
                aria-expanded={showCalendar.supps}
              >
                {showCalendar.supps ? 'Hide calendar' : 'Show calendar'}
              </button>
            </div>

            {showCalendar.supps && (
              <>
                <Calendar
                  year={suppCal.y} month={suppCal.m}
                  onMonthChange={(y, m) => setSuppCal({ y, m })}
                  renderDay={(dateISO) => {
                    const st = getSuppDayStatus(dailySupp, suppSchedule, dateISO, firstTrackDate)
                    if (st === 'future') return null
                    return <span className={`cal-dot supp-dot-${st}`} />
                  }}
                />
                <div className="cal-legend">
                  <span className="cal-legend-item"><span className="cal-dot supp-dot-all" /> All taken</span>
                  <span className="cal-legend-item"><span className="cal-dot supp-dot-partial" /> Partial</span>
                  <span className="cal-legend-item"><span className="cal-dot supp-dot-missed" /> Missed</span>
                </div>
              </>
            )}
          </section>

          <section className="glass-section">
            <p className="section-note">Tap dose to mark as taken. Tap ? for info. Use "Undo" if you made a mistake.</p>
            <ul className="supp-grid">
              {supplements.map(s => (
                <SuppCountdownCard
                  key={s.id}
                  supp={s}
                  schedule={suppSchedule[s.id]}
                  isTaken={isSuppTaken}
                  toggleSupp={toggleSupp}
                  undoSupp={undoSupp}
                  resetBottle={resetBottle}
                  lastTaken={suppLastTaken}
                  bottle={suppBottles[s.id]}
                  showExplanation={expandedSupp === s.id}
                  onToggleExplanation={() => setExpandedSupp(prev => prev === s.id ? null : s.id)}
                />
              ))}
            </ul>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.tasks} /></span>
              <div><h2>Optimal Schedule (Locked)</h2></div>
            </div>
            <p className="section-note">This is the optimal schedule — follow it para ma-maximize ang absorption!</p>
            <div className="optimal-schedule">
              {optimalSchedule.map((slot, i) => (
                <div key={i} className="optimal-slot glass-card">
                  <div className="optimal-slot-header">
                    <span className="optimal-icon"><TokenIcon token={slot.icon} /></span>
                    <span className="optimal-time">{slot.time}</span>
                  </div>
                  <div className="optimal-supps">
                    {slot.supps.map((s, j) => (
                      <span key={j} className="optimal-supp-tag">{s}</span>
                    ))}
                  </div>
                  <div className="optimal-note">{slot.tagNote || slot.note}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.warning} /></span>
              <div><h2>Important Rule</h2></div>
            </div>
            <div className="glass-card warn-card">
              <p>Huwag sabayan ang Calcium at Prenatal (may iron)!</p>
              <p>Nag-aagawan sila sa absorption. Keep them 2+ hours apart.</p>
              <p><strong>Morning:</strong> Prenatal + DHA + Choline + Chlorella</p>
              <p><strong>Lunch:</strong> Calcium (1st) (+ Vitamin D3 only if advised)</p>
              <p><strong>Evening:</strong> Calcium (2nd)</p>
            </div>
          </section>
        </>
      )}

      {/* ========== WORK ========== */}
      {subTab === 'work' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.work} /></span>
              <div><h2>Naomi's Work Attendance</h2></div>
              <button
                type="button"
                className="cal-collapse-btn"
                onClick={() => toggleCalendar('work')}
                aria-expanded={showCalendar.work}
              >
                {showCalendar.work ? 'Hide calendar' : 'Show calendar'}
              </button>
            </div>
            <p className="section-note">Save a Work pin or Home pin first, then enable tracker for auto attendance logs.</p>

            <div className="glass-card work-location-card">
              <h3>Work/Home Location Auto-Log</h3>

              <div className="attendance-toggle">
                <button
                  type="button"
                  className={`att-btn ${workLocation.enabled ? 'active worked' : ''}`}
                  onClick={handleEnableTracker}
                >
                  Tracker ON
                </button>
                <button
                  type="button"
                  className={`att-btn ${!workLocation.enabled ? 'active absent' : ''}`}
                  onClick={handleDisableTracker}
                >
                  Tracker OFF
                </button>
              </div>

              <div className="work-location-sections">
                <div className="work-location-block glass-inner">
                  <h4>Work Location</h4>
                  <div className="form-row">
                    <label>Name</label>
                    <input
                      type="text"
                      value={locationDraft.workName}
                      onChange={e => updateLocationDraft({ workName: e.target.value })}
                      placeholder="e.g. Kawasaki Office"
                    />
                  </div>

                  <div className="work-location-grid">
                    <div className="form-row">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationDraft.workLat}
                        onChange={e => updateLocationDraft({ workLat: e.target.value })}
                        placeholder="35.530000"
                      />
                    </div>
                    <div className="form-row">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationDraft.workLng}
                        onChange={e => updateLocationDraft({ workLng: e.target.value })}
                        placeholder="139.700000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Radius (meters)</label>
                    <input
                      type="number"
                      min={MIN_WORK_RADIUS_METERS}
                      max={MAX_GEOFENCE_RADIUS_METERS}
                      value={locationDraft.workRadiusMeters}
                      onChange={e => updateLocationDraft({
                        workRadiusMeters: String(normalizeRadius(e.target.value, DEFAULT_WORK_RADIUS_METERS)),
                      })}
                    />
                  </div>

                  <div className="work-location-actions">
                    <button type="button" className="btn-glass-secondary" onClick={() => handleUseCurrentLocation('work')}>
                      Use Current for Work
                    </button>
                  </div>
                </div>

                <div className="work-location-block glass-inner">
                  <h4>Home Location</h4>
                  <div className="form-row">
                    <label>Name</label>
                    <input
                      type="text"
                      value={locationDraft.homeName}
                      onChange={e => updateLocationDraft({ homeName: e.target.value })}
                      placeholder="e.g. Home"
                    />
                  </div>

                  <div className="work-location-grid">
                    <div className="form-row">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationDraft.homeLat}
                        onChange={e => updateLocationDraft({ homeLat: e.target.value })}
                        placeholder="35.530000"
                      />
                    </div>
                    <div className="form-row">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={locationDraft.homeLng}
                        onChange={e => updateLocationDraft({ homeLng: e.target.value })}
                        placeholder="139.700000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Radius (meters)</label>
                    <input
                      type="number"
                      min={MIN_WORK_RADIUS_METERS}
                      max={MAX_GEOFENCE_RADIUS_METERS}
                      value={locationDraft.homeRadiusMeters}
                      onChange={e => updateLocationDraft({
                        homeRadiusMeters: String(normalizeRadius(e.target.value, DEFAULT_HOME_RADIUS_METERS)),
                      })}
                    />
                  </div>

                  <div className="work-location-actions">
                    <button type="button" className="btn-glass-secondary" onClick={() => handleUseCurrentLocation('home')}>
                      Use Current for Home
                    </button>
                  </div>
                </div>
              </div>

              <div className="work-location-grid">
                <div className="form-row">
                  <label>Auto hours</label>
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    value={locationDraft.autoHours}
                    onChange={e => updateLocationDraft({ autoHours: String(normalizeAutoHours(e.target.value)) })}
                  />
                </div>
                <div className="form-row">
                  <label>Away minutes (home-only mode)</label>
                  <input
                    type="number"
                    min="15"
                    max={MAX_AWAY_MINUTES}
                    value={locationDraft.awayMinutesForWork}
                    onChange={e => updateLocationDraft({
                      awayMinutesForWork: String(normalizeAwayMinutes(e.target.value)),
                    })}
                  />
                </div>
              </div>

              <div className="work-location-save-row">
                <button type="button" className="btn-glass-primary" onClick={handleSaveLocationConfig}>
                  Save Locations
                </button>
              </div>

              {geoMessage && <p className="section-note">{geoMessage}</p>}
              {geoStatus && geoStatus !== geoMessage && <p className="section-note">{geoStatus}</p>}
              <p className="section-note">
                Tracking mode: {nativeTrackingMode ? 'Native iOS (background-capable)' : 'Web (foreground-only)'}
              </p>
              {workLocation.enabled && geoLive.tracking && (
                <div className={`work-geo-live glass-inner ${geoLive.insideWork ? 'inside' : geoLive.insideHome ? 'home' : 'outside'}`}>
                  <span>
                    {geoLive.insideWork ? 'Inside work zone' : geoLive.insideHome ? 'Inside home zone' : 'Outside zones'}
                  </span>
                  <span>
                    {geoLive.distanceWorkMeters !== null ? `Work ${geoLive.distanceWorkMeters}m` : 'Work n/a'}
                    {' | '}
                    {geoLive.distanceHomeMeters !== null ? `Home ${geoLive.distanceHomeMeters}m` : 'Home n/a'}
                  </span>
                </div>
              )}
              {workLocation.enabled && geoLive.accuracyMeters !== null && (
                <p className="section-note">GPS accuracy: +/-{geoLive.accuracyMeters}m</p>
              )}
              {workLocation.lastAutoLogDate && (
                <p className="section-note">
                  Last auto log date: {workLocation.lastAutoLogDate}
                  {workLocation.lastAutoReason ? ` (${workLocation.lastAutoReason === 'work-zone' ? 'work zone' : 'away from home'})` : ''}
                </p>
              )}
              {!hasSavedGeoTarget && (
                <p className="section-note">Save valid Work or Home coordinates to activate tracking.</p>
              )}
              <p className="section-note disclaimer">
                {nativeTrackingMode
                  ? 'Native mode can continue tracking in background after location permissions are granted.'
                  : 'Web mode auto logging works while Peggy is open and location permission is granted.'}
              </p>
            </div>

            {showCalendar.work && (
              <>
                <p className="section-note">Tap a day to select, then log attendance below.</p>
                <Calendar
                  year={workCal.y} month={workCal.m}
                  onMonthChange={(y, m) => setWorkCal({ y, m })}
                  selectedDate={attendanceDate}
                  onDayClick={(d) => {
                    setAttendanceDate(d)
                    setAttendanceForm(attendance[d] || { worked: true, hours: 8, note: '' })
                  }}
                  renderDay={(dateISO) => {
                    const att = attendance[dateISO]
                    if (!att) return null
                    return <span className={`cal-dot ${att.worked ? 'work-dot-yes' : 'work-dot-no'}`} />
                  }}
                />
              </>
            )}

            <div className="glass-card attendance-form">
              <h3>Log: {attendanceDate}</h3>
              <div className="attendance-toggle">
                <button
                  className={`att-btn ${attendanceForm.worked ? 'active worked' : ''}`}
                  onClick={() => setAttendanceForm(p => ({ ...p, worked: true }))}
                >Worked</button>
                <button
                  className={`att-btn ${!attendanceForm.worked ? 'active absent' : ''}`}
                  onClick={() => setAttendanceForm(p => ({ ...p, worked: false }))}
                >Absent</button>
              </div>
              {attendanceForm.worked && (
                <div className="form-row">
                  <label>Hours</label>
                  <input
                    type="number"
                    min="1" max="12" step="0.5"
                    value={attendanceForm.hours}
                    onChange={e => setAttendanceForm(p => ({ ...p, hours: Number(e.target.value) }))}
                  />
                </div>
              )}
              <div className="form-row">
                <label>Note (optional)</label>
                <input
                  type="text"
                  value={attendanceForm.note}
                  onChange={e => setAttendanceForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="e.g. half day, overtime..."
                />
              </div>
              <button className="btn-glass-primary" onClick={handleAttendanceSave}>Save</button>
            </div>
          </section>

          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
              <div><h2>Monthly Summary — {viewMonth}</h2></div>
            </div>
            <div className="attendance-stats">
              <div className="att-stat glass-inner">
                <div className="att-stat-num">{daysWorked}</div>
                <div className="att-stat-label">Days Worked</div>
              </div>
              <div className="att-stat glass-inner">
                <div className="att-stat-num">{totalHours}</div>
                <div className="att-stat-label">Total Hours</div>
              </div>
              <div className="att-stat glass-inner">
                <div className="att-stat-num">{monthAttendance.filter(a => !a.worked).length}</div>
                <div className="att-stat-label">Days Off</div>
              </div>
            </div>
            {monthAttendance.length > 0 && (
              <ul className="attendance-log">
                {monthAttendance.map(a => (
                  <li
                    key={a.date}
                    className={`att-log-item glass-inner ${a.worked ? 'worked' : 'absent'}`}
                    onClick={() => {
                      setAttendanceDate(a.date)
                      setAttendanceForm(a)
                    }}
                  >
                    <span className="att-log-date">{a.date}</span>
                    <span className="att-log-status">{a.worked ? `Worked ${a.hours}h` : 'Absent'}</span>
                    {a.note && <span className="att-log-note">{a.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* ========== CHECKUPS ========== */}
      {subTab === 'checkups' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.checkup} /></span>
            <div>
              <h2>Checkup Visits</h2>
              <span className="section-count">
                {checkupSchedule.filter(v => checkups[v.id]?.completed).length}/14 completed
              </span>
            </div>
            <button
              type="button"
              className="cal-collapse-btn"
              onClick={() => toggleCalendar('checkups')}
              aria-expanded={showCalendar.checkups}
            >
              {showCalendar.checkups ? 'Hide calendar' : 'Show calendar'}
            </button>
          </div>

          {showCalendar.checkups && (
            <Calendar
              year={checkCal.y} month={checkCal.m}
              onMonthChange={(y, m) => setCheckCal({ y, m })}
              renderDay={(dateISO) => {
                if (checkupDates[dateISO]) return <span className="cal-icon"><UiIcon icon={APP_ICONS.checkup} /></span>
                return null
              }}
            />
          )}

          <p className="section-note" style={{ marginTop: '0.6rem' }}>Track your 14 prenatal checkups from boshi techo vouchers.</p>

          <ul className="checkup-list">
            {checkupSchedule.map(visit => {
              const data = checkups[visit.id] || {}
              const isEditing = editVisit === visit.id
              return (
                <li key={visit.id} className={`glass-card checkup-item ${data.completed ? 'completed' : ''}`}>
                  <div className="checkup-header" onClick={() => !isEditing && startEditVisit(visit)}>
                    <div className={`checkup-num ${data.completed ? 'done' : ''}`}>{data.completed ? '✓' : visit.visit}</div>
                    <div className="checkup-info">
                      <div className="checkup-title">Visit {visit.visit} - Week {visit.weekRange}</div>
                      <div className="checkup-desc">{visit.label}</div>
                      {data.completed && data.date && (
                        <div className="checkup-date">Done: {data.date}</div>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="checkup-form">
                      <div className="form-row">
                        <label>Date</label>
                        <input type="date" value={visitForm.date || ''} onChange={e => setVisitForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div className="form-row">
                        <label>Weight (kg)</label>
                        <input type="number" step="0.1" value={visitForm.weight || ''} onChange={e => setVisitForm(p => ({ ...p, weight: e.target.value }))} placeholder="e.g. 55.5" />
                      </div>
                      <div className="form-row">
                        <label>Blood Pressure</label>
                        <input type="text" value={visitForm.bp || ''} onChange={e => setVisitForm(p => ({ ...p, bp: e.target.value }))} placeholder="e.g. 120/80" />
                      </div>
                      <div className="form-row">
                        <label>Baby Size</label>
                        <input type="text" value={visitForm.babySize || ''} onChange={e => setVisitForm(p => ({ ...p, babySize: e.target.value }))} placeholder="e.g. 25cm, 800g" />
                      </div>
                      <div className="form-row">
                        <label>Doctor Notes</label>
                        <textarea value={visitForm.notes || ''} onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes from the doctor..." />
                      </div>
                      <div className="form-row">
                        <label>Next Appointment</label>
                        <input type="date" value={visitForm.nextDate || ''} onChange={e => setVisitForm(p => ({ ...p, nextDate: e.target.value }))} />
                      </div>
                      <div className="form-buttons">
                        <button className="btn-glass-primary" onClick={() => handleVisitSave(visit.id)}>Save & Mark Complete</button>
                        <button className="btn-glass-secondary" onClick={() => { setEditVisit(null); setVisitForm({}) }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ========== MOOD ========== */}
      {subTab === 'mood' && (
        <>
          <section className="glass-section">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.tip} /></span>
              <div><h2>Mood & Cravings</h2></div>
              <button
                type="button"
                className="cal-collapse-btn"
                onClick={() => toggleCalendar('mood')}
                aria-expanded={showCalendar.mood}
              >
                {showCalendar.mood ? 'Hide calendar' : 'Show calendar'}
              </button>
            </div>

            {showCalendar.mood && (
              <Calendar
                year={moodCal.y} month={moodCal.m}
                onMonthChange={(y, m) => setMoodCal({ y, m })}
                renderDay={(dateISO) => {
                  const m = moodByDate[dateISO]
                  if (!m) return null
                  return (
                    <span className="cal-icon cal-mood-icon">
                      <TokenIcon token={m.mood} />
                    </span>
                  )
                }}
              />
            )}

            <p className="section-note" style={{ marginTop: '0.6rem' }}>How is Naomi feeling today?</p>

            <form className="mood-form" onSubmit={handleMoodSubmit}>
              <div className="mood-emojis">
                {MOOD_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    className={`mood-emoji glass-inner ${moodForm.mood === e ? 'selected' : ''}`}
                    onClick={() => setMoodForm(p => ({ ...p, mood: e }))}
                  >
                    <TokenIcon token={e} className="ui-icon mood-option-icon" />
                  </button>
                ))}
              </div>

              <div className="form-row">
                <label>Energy Level: {moodForm.energy}/5</label>
                <input
                  type="range"
                  min="1" max="5"
                  value={moodForm.energy}
                  onChange={e => setMoodForm(p => ({ ...p, energy: Number(e.target.value) }))}
                />
              </div>

              <div className="form-row">
                <label>Cravings</label>
                <input
                  type="text"
                  value={moodForm.cravings}
                  onChange={e => setMoodForm(p => ({ ...p, cravings: e.target.value }))}
                  placeholder="What's Naomi craving?"
                />
              </div>

              <div className="form-row">
                <label>Notes</label>
                <textarea
                  value={moodForm.notes}
                  onChange={e => setMoodForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any other notes..."
                />
              </div>

              <button type="submit" className="btn-glass-primary" disabled={!moodForm.mood}>Log Mood</button>
            </form>
          </section>

          {moods.length > 0 && (
            <section className="glass-section">
              <div className="section-header">
                <span className="section-icon"><UiIcon icon={APP_ICONS.info} /></span>
                <div>
                  <h2>Mood History</h2>
                  <span className="section-count">{moods.length} entries</span>
                </div>
              </div>
              <ul className="mood-list">
                {moods.slice(0, 20).map(m => (
                  <li key={m.id} className="glass-card mood-entry">
                    <div className="mood-entry-top">
                      <span className="mood-entry-emoji"><TokenIcon token={m.mood} /></span>
                      <span className="mood-entry-energy">Energy: {m.energy}/5</span>
                      <span className="mood-entry-date">{new Date(m.date).toLocaleDateString()}</span>
                    </div>
                    {m.cravings && <div className="mood-entry-craving">Craving: {m.cravings}</div>}
                    {m.notes && <div className="mood-entry-notes">{m.notes}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

