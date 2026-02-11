import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../AppContext'
import Calendar from './Calendar'
import { APP_ICONS, UiIcon } from '../uiIcons'
import { getCurrentAppLocation, isNativeIos } from '../native/locationBridge'
import { GEO_TELEMETRY_EVENT, getGeoTelemetry } from '../locationTelemetry'

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

function toHoursAndMinutes(value, { minHours = 0, maxHours = 24 } = {}) {
  const safeHours = Math.min(maxHours, Math.max(minHours, Number(value) || 0))
  let hours = Math.floor(safeHours)
  let minutes = Math.round((safeHours - hours) * 60)
  if (minutes >= 60) {
    hours += 1
    minutes -= 60
  }
  if (hours > maxHours) {
    hours = maxHours
    minutes = 0
  }
  return { hours, minutes }
}

function toDecimalHours(hoursPart, minutesPart, { minHours = 0, maxHours = 24 } = {}) {
  const hours = Math.max(0, Number(hoursPart) || 0)
  const minutes = Math.min(59, Math.max(0, Number(minutesPart) || 0))
  const total = hours + (minutes / 60)
  return Math.min(maxHours, Math.max(minHours, total))
}

function formatHoursAndMinutes(value) {
  const safe = Math.max(0, Number(value) || 0)
  let wholeHours = Math.floor(safe)
  let minutes = Math.round((safe - wholeHours) * 60)
  if (minutes >= 60) {
    wholeHours += 1
    minutes -= 60
  }
  if (minutes <= 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
}

function parseTimeToMinutes(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const [h, m] = raw.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return (h * 60) + m
}

function normalizeBreakMinutes(value) {
  return Math.min(12 * 60, Math.max(0, Number(value) || 0))
}

function computeWorkedHoursFromRange(startTime, endTime, breakMinutes = 0) {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return null
  let total = end - start
  if (total < 0) total += 24 * 60
  const paidMinutes = Math.max(0, total - normalizeBreakMinutes(breakMinutes))
  return paidMinutes / 60
}

function toCoordString(value) {
  if (value === '' || value === null || typeof value === 'undefined') return ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return parsed.toFixed(6)
}

function parseCoordinatesInput(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (!match) continue
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (isValidLatLng(lat, lng)) return { lat, lng }
  }
  return null
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

function createDefaultAttendanceForm({ isHusband = false } = {}) {
  return {
    worked: true,
    hours: isHusband ? 8 : 7.5,
    note: '',
    useTimeRange: isHusband,
    startTime: isHusband ? '08:00' : '',
    endTime: isHusband ? '17:00' : '',
    breakMinutes: isHusband ? 60 : 0,
  }
}

function toAttendanceForm(record, { isHusband = false } = {}) {
  const base = createDefaultAttendanceForm({ isHusband })
  const source = record && typeof record === 'object' ? record : {}
  return {
    ...base,
    worked: source.worked !== false,
    hours: Math.max(0, Number(source.hours) || base.hours),
    note: String(source.note || ''),
    useTimeRange: Boolean(source.useTimeRange),
    startTime: String(source.startTime || ''),
    endTime: String(source.endTime || ''),
    breakMinutes: normalizeBreakMinutes(source.breakMinutes),
  }
}

function readCalendarPreference(storageKey, fallback = true) {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(storageKey)
  if (raw === '0') return false
  if (raw === '1') return true
  return fallback
}

export default function WorkFinancePanel({
  personKey = 'naomi',
  title = 'Work Attendance',
  accent = 'wife',
  allowGeoTracker = true,
}) {
  const {
    attendance,
    markAttendance,
    workLocation,
    setWorkLocation,
    husbandAttendance,
    markHusbandAttendance,
    husbandWorkLocation,
    setHusbandWorkLocation,
  } = useApp()

  const isHusband = String(personKey || '').toLowerCase() === 'husband'
  const activeAttendance = isHusband ? husbandAttendance : attendance
  const activeMarkAttendance = isHusband ? markHusbandAttendance : markAttendance
  const activeWorkLocation = isHusband ? husbandWorkLocation : workLocation
  const activeSetWorkLocation = isHusband ? setHusbandWorkLocation : setWorkLocation
  const calendarStorageKey = `baby-prep-finance-work-calendar-${isHusband ? 'husband' : 'wife'}`
  const geoPanelStorageKey = `baby-prep-finance-work-geo-panel-${isHusband ? 'husband' : 'wife'}`
  const geoAdvancedStorageKey = `baby-prep-finance-work-geo-advanced-${isHusband ? 'husband' : 'wife'}`

  const now = new Date()
  const [workCal, setWorkCal] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [attendanceDate, setAttendanceDate] = useState(now.toISOString().split('T')[0])
  const [attendanceForm, setAttendanceForm] = useState(() => createDefaultAttendanceForm({ isHusband }))
  const [showWorkCalendar, setShowWorkCalendar] = useState(() => readCalendarPreference(calendarStorageKey, true))
  const [showGeoPanel, setShowGeoPanel] = useState(() => readCalendarPreference(geoPanelStorageKey, false))
  const [showGeoAdvanced, setShowGeoAdvanced] = useState(() => readCalendarPreference(geoAdvancedStorageKey, false))
  const [geoMessage, setGeoMessage] = useState('')
  const [geoStatus, setGeoStatus] = useState(() => String(getGeoTelemetry()?.status || ''))
  const [geoLive, setGeoLive] = useState(() => ({
    ...DEFAULT_GEO_LIVE,
    ...(getGeoTelemetry()?.live || {}),
  }))
  const [locationDraft, setLocationDraft] = useState(() => toLocationDraft(activeWorkLocation))
  const [mapPinInput, setMapPinInput] = useState({ work: '', home: '' })
  const draftDirtyRef = useRef(false)
  const geoMessageTimerRef = useRef(null)
  const savedWorkTargetValid = isValidLatLng(activeWorkLocation.lat, activeWorkLocation.lng)
  const savedHomeTargetValid = isValidLatLng(activeWorkLocation.homeLat, activeWorkLocation.homeLng)
  const hasSavedGeoTarget = savedWorkTargetValid || savedHomeTargetValid
  const nativeTrackingMode = isNativeIos()
  const attendanceDurationParts = toHoursAndMinutes(attendanceForm.hours, { minHours: 0.5, maxHours: 24 })
  const autoDurationParts = toHoursAndMinutes(locationDraft.autoHours, { minHours: 0.5, maxHours: 12 })
  const computedRangeHours = computeWorkedHoursFromRange(
    attendanceForm.startTime,
    attendanceForm.endTime,
    attendanceForm.breakMinutes,
  )

  useEffect(() => {
    if (draftDirtyRef.current) return
    setLocationDraft(toLocationDraft(activeWorkLocation))
  }, [
    activeWorkLocation.name,
    activeWorkLocation.lat,
    activeWorkLocation.lng,
    activeWorkLocation.radiusMeters,
    activeWorkLocation.homeName,
    activeWorkLocation.homeLat,
    activeWorkLocation.homeLng,
    activeWorkLocation.homeRadiusMeters,
    activeWorkLocation.autoHours,
    activeWorkLocation.awayMinutesForWork,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(calendarStorageKey, showWorkCalendar ? '1' : '0')
  }, [calendarStorageKey, showWorkCalendar])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(geoPanelStorageKey, showGeoPanel ? '1' : '0')
  }, [geoPanelStorageKey, showGeoPanel])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(geoAdvancedStorageKey, showGeoAdvanced ? '1' : '0')
  }, [geoAdvancedStorageKey, showGeoAdvanced])

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

  const updateLocationDraft = (patch) => {
    draftDirtyRef.current = true
    setLocationDraft(prev => ({ ...prev, ...patch }))
  }

  const updateAttendanceDuration = (field, rawValue) => {
    const nextHours = field === 'hours' ? Number(rawValue) : attendanceDurationParts.hours
    const nextMinutes = field === 'minutes' ? Number(rawValue) : attendanceDurationParts.minutes
    const normalized = toDecimalHours(nextHours, nextMinutes, { minHours: 0.5, maxHours: 24 })
    setAttendanceForm(prev => ({ ...prev, hours: normalized }))
  }

  const updateAttendanceTimeRange = (field, rawValue) => {
    setAttendanceForm(prev => {
      const next = { ...prev, [field]: field === 'breakMinutes' ? normalizeBreakMinutes(rawValue) : rawValue }
      const computed = computeWorkedHoursFromRange(next.startTime, next.endTime, next.breakMinutes)
      if (computed !== null) next.hours = computed
      return next
    })
  }

  const updateAutoDurationDraft = (field, rawValue) => {
    const nextHours = field === 'hours' ? Number(rawValue) : autoDurationParts.hours
    const nextMinutes = field === 'minutes' ? Number(rawValue) : autoDurationParts.minutes
    const normalized = toDecimalHours(nextHours, nextMinutes, { minHours: 0.5, maxHours: 12 })
    updateLocationDraft({ autoHours: String(normalized) })
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

    activeSetWorkLocation(prev => ({
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

  const openMapPicker = (target = 'work') => {
    if (typeof window === 'undefined') return
    const lat = target === 'home' ? activeWorkLocation.homeLat : activeWorkLocation.lat
    const lng = target === 'home' ? activeWorkLocation.homeLng : activeWorkLocation.lng
    const hasPin = isValidLatLng(lat, lng)
    const base = hasPin
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : 'https://www.google.com/maps'
    window.open(base, '_blank', 'noopener,noreferrer')
  }

  const handleApplyMapPin = (target = 'work') => {
    const raw = target === 'home' ? mapPinInput.home : mapPinInput.work
    const parsed = parseCoordinatesInput(raw)
    if (!parsed) {
      setGeoMessage('Pin not recognized. Paste a maps link or "lat,lng".')
      return
    }
    if (target === 'home') {
      updateLocationDraft({
        homeLat: parsed.lat.toFixed(6),
        homeLng: parsed.lng.toFixed(6),
        homeName: String(locationDraft.homeName || '').trim() || 'Home',
      })
      setMapPinInput(prev => ({ ...prev, home: '' }))
      setGeoMessage('Home pin captured from map. Tap Save Locations.')
      return
    }
    updateLocationDraft({
      workLat: parsed.lat.toFixed(6),
      workLng: parsed.lng.toFixed(6),
      workName: String(locationDraft.workName || '').trim() || 'Work',
    })
    setMapPinInput(prev => ({ ...prev, work: '' }))
    setGeoMessage('Work pin captured from map. Tap Save Locations.')
  }

  const handleEnableTracker = () => {
    if (!hasSavedGeoTarget) {
      setGeoMessage('Save at least one valid location (Work or Home) before enabling tracker.')
      return
    }
    activeSetWorkLocation(prev => ({ ...prev, enabled: true }))
    setGeoMessage('Location tracker enabled.')
  }

  const handleDisableTracker = () => {
    activeSetWorkLocation(prev => ({ ...prev, enabled: false }))
    setGeoMessage('Location tracker disabled.')
  }

  const handleAttendanceSave = () => {
    const computedRange = computeWorkedHoursFromRange(
      attendanceForm.startTime,
      attendanceForm.endTime,
      attendanceForm.breakMinutes,
    )
    const nextHours = attendanceForm.useTimeRange
      ? (computedRange ?? attendanceForm.hours)
      : attendanceForm.hours

    const payload = {
      ...attendanceForm,
      hours: attendanceForm.worked ? Math.max(0, Number(nextHours) || 0) : 0,
      breakMinutes: normalizeBreakMinutes(attendanceForm.breakMinutes),
    }
    activeMarkAttendance(attendanceDate, payload)
    setAttendanceForm(createDefaultAttendanceForm({ isHusband }))
  }

  const handleCalendarQuickLog = (dateISO) => {
    const source = activeAttendance[dateISO]
    const base = toAttendanceForm(source, { isHusband })
    const computedRange = base.useTimeRange
      ? computeWorkedHoursFromRange(base.startTime, base.endTime, base.breakMinutes)
      : null
    const defaultHours = createDefaultAttendanceForm({ isHusband }).hours
    const payload = {
      ...base,
      worked: true,
      hours: Math.max(0, Number(base.useTimeRange ? (computedRange ?? base.hours) : base.hours) || defaultHours),
      breakMinutes: normalizeBreakMinutes(base.breakMinutes),
    }
    activeMarkAttendance(dateISO, payload)
    setAttendanceDate(dateISO)
    setAttendanceForm(toAttendanceForm(payload, { isHusband }))
  }

  const toggleWorkCalendar = () => {
    setShowWorkCalendar(prev => !prev)
  }

  const viewMonth = `${workCal.y}-${String(workCal.m).padStart(2, '0')}`
  const monthAttendance = useMemo(() => (
    Object.entries(activeAttendance)
      .filter(([date]) => date.startsWith(viewMonth))
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date))
  ), [activeAttendance, viewMonth])
  const daysWorked = monthAttendance.filter(a => a.worked).length
  const totalHours = monthAttendance
    .filter(a => a.worked)
    .reduce((acc, a) => acc + (Number(a.hours) || 0), 0)

  return (
    <div className={`work-finance-wrap ${accent}`}>
      <section className={`glass-section finance-work-section ${accent}`}>
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.work} /></span>
          <div><h2>{title}</h2></div>
          <button
            type="button"
            className="cal-collapse-btn"
            onClick={toggleWorkCalendar}
            aria-expanded={showWorkCalendar}
          >
            {showWorkCalendar ? 'Hide calendar' : 'Show calendar'}
          </button>
        </div>

        {showWorkCalendar && (
          <>
            <p className="section-note">Double tap a date to quick-log Worked.</p>
            <Calendar
              year={workCal.y}
              month={workCal.m}
              onMonthChange={(y, m) => setWorkCal({ y, m })}
              selectedDate={attendanceDate}
              onDayClick={(d) => {
                setAttendanceDate(d)
                setAttendanceForm(toAttendanceForm(activeAttendance[d], { isHusband }))
              }}
              onDayDoubleTap={(d) => handleCalendarQuickLog(d)}
              renderDay={(dateISO) => {
                const att = activeAttendance[dateISO]
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
            >
              Worked
            </button>
            <button
              className={`att-btn ${!attendanceForm.worked ? 'active absent' : ''}`}
              onClick={() => setAttendanceForm(p => ({ ...p, worked: false }))}
            >
              Absent
            </button>
          </div>
          {attendanceForm.worked && (
            <>
              <div className="attendance-mode-row">
                <button
                  type="button"
                  className={`att-btn ${!attendanceForm.useTimeRange ? 'active worked' : ''}`}
                  onClick={() => setAttendanceForm(p => ({ ...p, useTimeRange: false }))}
                >
                  Manual Duration
                </button>
                <button
                  type="button"
                  className={`att-btn ${attendanceForm.useTimeRange ? 'active worked' : ''}`}
                  onClick={() => setAttendanceForm(p => ({ ...p, useTimeRange: true }))}
                >
                  Time In / Out
                </button>
              </div>
              {!attendanceForm.useTimeRange && (
                <div className="form-row">
                  <label>Worked duration</label>
                  <div className="work-duration-row">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="1"
                      value={attendanceDurationParts.hours}
                      onFocus={e => e.target.select()}
                      onChange={e => updateAttendanceDuration('hours', e.target.value)}
                    />
                    <span className="work-duration-sep">h</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={attendanceDurationParts.minutes}
                      onFocus={e => e.target.select()}
                      onChange={e => updateAttendanceDuration('minutes', e.target.value)}
                    />
                    <span className="work-duration-sep">m</span>
                  </div>
                </div>
              )}
              {attendanceForm.useTimeRange && (
                <>
                  <div className="attendance-time-range-grid">
                    <div className="form-row">
                      <label>Start</label>
                      <input
                        type="time"
                        value={attendanceForm.startTime}
                        onChange={e => updateAttendanceTimeRange('startTime', e.target.value)}
                      />
                    </div>
                    <span className="work-duration-sep time-range-sep">to</span>
                    <div className="form-row">
                      <label>End</label>
                      <input
                        type="time"
                        value={attendanceForm.endTime}
                        onChange={e => updateAttendanceTimeRange('endTime', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <label>Total break (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      max="720"
                      step="5"
                      value={attendanceForm.breakMinutes}
                      onFocus={e => e.target.select()}
                      onChange={e => updateAttendanceTimeRange('breakMinutes', e.target.value)}
                      placeholder="e.g. 75"
                    />
                  </div>
                  <p className="section-note attendance-computed">
                    Paid work time: {computedRangeHours === null ? 'Set start and end time' : formatHoursAndMinutes(computedRangeHours)}
                  </p>
                </>
              )}
            </>
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

      <section className={`glass-section finance-work-section ${accent}`}>
        <div className="section-header">
          <span className="section-icon"><UiIcon icon={APP_ICONS.overview} /></span>
          <div><h2>Monthly Summary - {viewMonth}</h2></div>
        </div>
        <div className="attendance-stats">
          <div className="att-stat glass-inner">
            <div className="att-stat-num">{daysWorked}</div>
            <div className="att-stat-label">Days Worked</div>
          </div>
          <div className="att-stat glass-inner">
            <div className="att-stat-num">{formatHoursAndMinutes(totalHours)}</div>
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
                  setAttendanceForm(toAttendanceForm(a, { isHusband }))
                }}
              >
                <span className="att-log-date">{a.date}</span>
                <span className="att-log-status">{a.worked ? `Worked ${formatHoursAndMinutes(a.hours)}` : 'Absent'}</span>
                {a.worked && a.useTimeRange && a.startTime && a.endTime && (
                  <span className="att-log-note">
                    {a.startTime} - {a.endTime} (break {formatHoursAndMinutes((Number(a.breakMinutes) || 0) / 60)})
                  </span>
                )}
                {a.note && <span className="att-log-note">{a.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {allowGeoTracker && (
        <section className={`glass-section finance-work-section ${accent}`}>
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.activity} /></span>
            <div><h2>Work/Home Location Auto-Log</h2></div>
            <button
              type="button"
              className="cal-collapse-btn"
              onClick={() => setShowGeoPanel(prev => !prev)}
              aria-expanded={showGeoPanel}
            >
              {showGeoPanel ? 'Hide tracker' : 'Show tracker'}
            </button>
          </div>
          <p className="section-note">
            Open map, pin the place, paste pin link, then save. Latitude/longitude are under Advanced options.
          </p>

          {showGeoPanel && (
            <div className="glass-card work-location-card">
              <div className="attendance-toggle">
                <button
                  type="button"
                  className={`att-btn ${activeWorkLocation.enabled ? 'active worked' : ''}`}
                  onClick={handleEnableTracker}
                >
                  Tracker ON
                </button>
                <button
                  type="button"
                  className={`att-btn ${!activeWorkLocation.enabled ? 'active absent' : ''}`}
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
                  <div className="work-location-actions map-actions">
                    <button type="button" className="btn-glass-secondary" onClick={() => handleUseCurrentLocation('work')}>
                      Use Current
                    </button>
                    <button type="button" className="btn-glass-secondary" onClick={() => openMapPicker('work')}>
                      Open Map
                    </button>
                  </div>
                  <div className="form-row">
                    <label>Map pin link or lat,lng</label>
                    <input
                      type="text"
                      value={mapPinInput.work}
                      onChange={e => setMapPinInput(prev => ({ ...prev, work: e.target.value }))}
                      placeholder="Paste maps link or 35.680000,139.760000"
                    />
                  </div>
                  <button type="button" className="btn-glass-mini primary" onClick={() => handleApplyMapPin('work')}>
                    Apply Work Pin
                  </button>
                  {savedWorkTargetValid && (
                    <p className="section-note pin-preview">
                      Saved: {activeWorkLocation.lat}, {activeWorkLocation.lng}
                    </p>
                  )}
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
                  <div className="work-location-actions map-actions">
                    <button type="button" className="btn-glass-secondary" onClick={() => handleUseCurrentLocation('home')}>
                      Use Current
                    </button>
                    <button type="button" className="btn-glass-secondary" onClick={() => openMapPicker('home')}>
                      Open Map
                    </button>
                  </div>
                  <div className="form-row">
                    <label>Map pin link or lat,lng</label>
                    <input
                      type="text"
                      value={mapPinInput.home}
                      onChange={e => setMapPinInput(prev => ({ ...prev, home: e.target.value }))}
                      placeholder="Paste maps link or 35.680000,139.760000"
                    />
                  </div>
                  <button type="button" className="btn-glass-mini primary" onClick={() => handleApplyMapPin('home')}>
                    Apply Home Pin
                  </button>
                  {savedHomeTargetValid && (
                    <p className="section-note pin-preview">
                      Saved: {activeWorkLocation.homeLat}, {activeWorkLocation.homeLng}
                    </p>
                  )}
                </div>
              </div>

              <div className="work-location-save-row">
                <button type="button" className="btn-glass-primary" onClick={handleSaveLocationConfig}>
                  Save Locations
                </button>
              </div>

              <div className="work-location-advanced-toggle">
                <button
                  type="button"
                  className="btn-glass-mini"
                  onClick={() => setShowGeoAdvanced(prev => !prev)}
                >
                  {showGeoAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                </button>
              </div>

              {showGeoAdvanced && (
                <div className="glass-inner work-location-advanced">
                  <div className="work-location-sections">
                    <div className="work-location-block">
                      <h4>Work Advanced</h4>
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
                    </div>
                    <div className="work-location-block">
                      <h4>Home Advanced</h4>
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
                    </div>
                  </div>

                  <div className="work-location-grid">
                    <div className="form-row">
                      <label>Auto work duration</label>
                      <div className="work-duration-row">
                        <input
                          type="number"
                          min="0"
                          max="12"
                          step="1"
                          value={autoDurationParts.hours}
                          onFocus={e => e.target.select()}
                          onChange={e => updateAutoDurationDraft('hours', e.target.value)}
                        />
                        <span className="work-duration-sep">h</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={autoDurationParts.minutes}
                          onFocus={e => e.target.select()}
                          onChange={e => updateAutoDurationDraft('minutes', e.target.value)}
                        />
                        <span className="work-duration-sep">m</span>
                      </div>
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
                </div>
              )}

              {geoMessage && <p className="section-note">{geoMessage}</p>}
              {geoStatus && geoStatus !== geoMessage && <p className="section-note">{geoStatus}</p>}
              <p className="section-note">
                Tracking mode: {nativeTrackingMode ? 'Native iOS (background-capable)' : 'Web (foreground-only)'}
              </p>
              {activeWorkLocation.enabled && geoLive.tracking && (
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
              {activeWorkLocation.enabled && geoLive.accuracyMeters !== null && (
                <p className="section-note">GPS accuracy: +/-{geoLive.accuracyMeters}m</p>
              )}
              {activeWorkLocation.lastAutoLogDate && (
                <p className="section-note">
                  Last auto log date: {activeWorkLocation.lastAutoLogDate}
                  {activeWorkLocation.lastAutoReason ? ` (${activeWorkLocation.lastAutoReason === 'work-zone' ? 'work zone' : 'away from home'})` : ''}
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
          )}
        </section>
      )}
    </div>
  )
}
