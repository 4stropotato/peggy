import { useEffect, useMemo, useRef } from 'react'
import { useApp } from '../AppContext'
import { startAppLocationWatcher } from '../native/locationBridge'
import { setGeoTelemetry } from '../locationTelemetry'

const MIN_WORK_RADIUS_METERS = 50
const DEFAULT_WORK_RADIUS_METERS = 180
const DEFAULT_HOME_RADIUS_METERS = 220
const DEFAULT_AUTO_HOURS = 8
const DEFAULT_AWAY_MINUTES = 90
const MAX_GEOFENCE_RADIUS_METERS = 3000
const MAX_AWAY_MINUTES = 720
const MAX_ALLOWED_ACCURACY_METERS = 60

function getTodayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

function toRad(value) {
  return (Number(value) * Math.PI) / 180
}

function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
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

export default function LocationAttendanceAgent({ personKey = 'naomi' }) {
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

  const isHusband = String(personKey || '').trim().toLowerCase() === 'husband'
  const channelKey = isHusband ? 'husband' : 'naomi'
  const activeAttendance = isHusband ? husbandAttendance : attendance
  const activeMarkAttendance = isHusband ? markHusbandAttendance : markAttendance
  const activeWorkLocation = isHusband ? husbandWorkLocation : workLocation
  const activeSetWorkLocation = isHusband ? setHusbandWorkLocation : setWorkLocation

  const stopWatcherRef = useRef(null)
  const awayStartRef = useRef(null)
  const attendanceRef = useRef(activeAttendance)
  const markAttendanceRef = useRef(activeMarkAttendance)
  const statusRef = useRef('')
  const wasEnabledRef = useRef(Boolean(activeWorkLocation.enabled))

  useEffect(() => {
    attendanceRef.current = activeAttendance
  }, [activeAttendance])

  useEffect(() => {
    markAttendanceRef.current = activeMarkAttendance
  }, [activeMarkAttendance])

  const setStatus = (nextStatus) => {
    const text = String(nextStatus || '')
    if (text === statusRef.current) return
    statusRef.current = text
    setGeoTelemetry({ status: text }, channelKey)
  }

  const activeLocationMemo = useMemo(() => ({
    enabled: Boolean(activeWorkLocation.enabled),
    lat: activeWorkLocation.lat,
    lng: activeWorkLocation.lng,
    radiusMeters: activeWorkLocation.radiusMeters,
    homeLat: activeWorkLocation.homeLat,
    homeLng: activeWorkLocation.homeLng,
    homeRadiusMeters: activeWorkLocation.homeRadiusMeters,
    homeName: activeWorkLocation.homeName,
    autoHours: activeWorkLocation.autoHours,
    awayMinutesForWork: activeWorkLocation.awayMinutesForWork,
    name: activeWorkLocation.name,
  }), [
    activeWorkLocation.enabled,
    activeWorkLocation.lat,
    activeWorkLocation.lng,
    activeWorkLocation.radiusMeters,
    activeWorkLocation.homeLat,
    activeWorkLocation.homeLng,
    activeWorkLocation.homeRadiusMeters,
    activeWorkLocation.homeName,
    activeWorkLocation.autoHours,
    activeWorkLocation.awayMinutesForWork,
    activeWorkLocation.name,
  ])

  useEffect(() => {
    const stopExistingWatcher = async () => {
      const stop = stopWatcherRef.current
      stopWatcherRef.current = null
      if (typeof stop !== 'function') return
      try {
        await stop()
      } catch {
        // ignore cleanup errors
      }
    }

    const disableLive = () => {
      setGeoTelemetry({
        live: {
          tracking: false,
          inside: false,
          insideWork: false,
          insideHome: false,
          distanceMeters: null,
          distanceWorkMeters: null,
          distanceHomeMeters: null,
          accuracyMeters: null,
          updatedAt: new Date().toISOString(),
        },
      }, channelKey)
    }

    if (!activeLocationMemo.enabled) {
      void stopExistingWatcher()
      awayStartRef.current = null
      disableLive()
      if (wasEnabledRef.current) {
        setStatus('Location tracker disabled.')
      } else {
        setStatus('')
      }
      wasEnabledRef.current = false
      return undefined
    }
    wasEnabledRef.current = true

    const workTargetValid = isValidLatLng(activeLocationMemo.lat, activeLocationMemo.lng)
    const homeTargetValid = isValidLatLng(activeLocationMemo.homeLat, activeLocationMemo.homeLng)
    if (!workTargetValid && !homeTargetValid) {
      void stopExistingWatcher()
      awayStartRef.current = null
      disableLive()
      setStatus('Tracker enabled, but no valid saved location found. Save Work or Home first.')
      return undefined
    }

    const workLat = Number(activeLocationMemo.lat)
    const workLng = Number(activeLocationMemo.lng)
    const homeLat = Number(activeLocationMemo.homeLat)
    const homeLng = Number(activeLocationMemo.homeLng)
    const workRadius = normalizeRadius(activeLocationMemo.radiusMeters, DEFAULT_WORK_RADIUS_METERS)
    const homeRadius = normalizeRadius(activeLocationMemo.homeRadiusMeters, DEFAULT_HOME_RADIUS_METERS)
    const autoHours = normalizeAutoHours(activeLocationMemo.autoHours)
    const awayMinutes = normalizeAwayMinutes(activeLocationMemo.awayMinutesForWork)

    awayStartRef.current = null
    void stopExistingWatcher()

    if (workTargetValid) {
      setStatus(`Location tracker active (work radius ${Math.round(workRadius)}m).`)
    } else {
      setStatus(`Location tracker active (home-away mode, ${Math.round(awayMinutes)} min).`)
    }

    let cancelled = false
    const startWatcher = async () => {
      try {
        const stopWatcher = await startAppLocationWatcher({
          distanceFilter: 15,
          background: true,
          onLocation: (loc) => {
            if (cancelled || !loc) return

            const lat = Number(loc.latitude)
            const lng = Number(loc.longitude)
            const accuracy = Number(loc.accuracy)
            const hasAcceptableAccuracy = !Number.isFinite(accuracy) || accuracy <= MAX_ALLOWED_ACCURACY_METERS
            const nowMs = Date.now()

            const distanceWork = workTargetValid ? calcDistanceMeters(lat, lng, workLat, workLng) : null
            const distanceHome = homeTargetValid ? calcDistanceMeters(lat, lng, homeLat, homeLng) : null
            const roundedDistanceWork = distanceWork === null ? null : Math.round(distanceWork)
            const roundedDistanceHome = distanceHome === null ? null : Math.round(distanceHome)
            const insideWork = roundedDistanceWork !== null && roundedDistanceWork <= workRadius
            const insideHome = roundedDistanceHome !== null && roundedDistanceHome <= homeRadius
            const inside = insideWork || insideHome

            setGeoTelemetry({
              live: {
                tracking: true,
                inside,
                insideWork,
                insideHome,
                distanceMeters: insideWork ? roundedDistanceWork : roundedDistanceHome,
                distanceWorkMeters: roundedDistanceWork,
                distanceHomeMeters: roundedDistanceHome,
                accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
                updatedAt: new Date().toISOString(),
              },
            }, channelKey)

            if (!hasAcceptableAccuracy) {
              setStatus('GPS accuracy is weak right now. Waiting for a stronger signal before auto logging.')
              return
            }

            if (insideHome) {
              awayStartRef.current = null
            }

            let autoReason = ''
            if (insideWork) {
              autoReason = 'work-zone'
            } else if (!workTargetValid && homeTargetValid) {
              if (!insideHome) {
                if (!awayStartRef.current) {
                  awayStartRef.current = nowMs
                }
                const awayDurationMinutes = (nowMs - awayStartRef.current) / 60000
                if (awayDurationMinutes >= awayMinutes) {
                  autoReason = 'away-from-home'
                }
              }
            }

            if (!autoReason) return

            const today = getTodayISO()
            const existing = attendanceRef.current[today]
            if (!existing?.worked) {
              const locationName = String(activeLocationMemo.name || 'work location').trim() || 'work location'
              const homeName = String(activeLocationMemo.homeName || 'home').trim() || 'home'
              const reasonText = autoReason === 'work-zone'
                ? `arrived at ${locationName}`
                : `away from ${homeName} for ${Math.round(awayMinutes)}+ min`
              const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              const prefix = existing?.note ? `${existing.note} | ` : ''
              const note = `${prefix}Auto logged: ${reasonText} (${stamp})`

              markAttendanceRef.current(today, { worked: true, hours: autoHours, note })

              if (autoReason === 'work-zone') {
                setStatus('Auto logged: marked Worked today after entering work zone.')
              } else {
                setStatus('Auto logged: marked Worked today after prolonged time away from home.')
              }
            }

            activeSetWorkLocation(prev => {
              if (prev.lastAutoLogDate === today && prev.lastAutoReason === autoReason) return prev
              return {
                ...prev,
                lastAutoLogDate: today,
                lastInsideAt: new Date().toISOString(),
                lastAutoReason: autoReason,
              }
            })
          },
          onError: (err) => {
            if (cancelled) return
            setGeoTelemetry({
              live: {
                tracking: false,
                inside: false,
                insideWork: false,
                insideHome: false,
                distanceMeters: null,
                distanceWorkMeters: null,
                distanceHomeMeters: null,
                accuracyMeters: null,
                updatedAt: new Date().toISOString(),
              },
            }, channelKey)
            const code = String(err?.code || '').toUpperCase()
            const msg = String(err?.message || '')
            if (
              code === 'NOT_AUTHORIZED' ||
              code === '1' ||
              msg.toLowerCase().includes('permission')
            ) {
              setStatus('Location permission denied. Enable location access to use auto work logging.')
            } else if (code === '3' || msg.toLowerCase().includes('timeout')) {
              setStatus('Location request timed out. Tracker will retry automatically.')
            } else {
              setStatus('Location unavailable right now. Tracker will retry automatically.')
            }
          },
        })

        if (cancelled) {
          try {
            await stopWatcher()
          } catch {
            // ignore cleanup errors
          }
          return
        }
        stopWatcherRef.current = stopWatcher
      } catch {
        if (cancelled) return
        setGeoTelemetry({
          live: {
            tracking: false,
            inside: false,
            insideWork: false,
            insideHome: false,
            distanceMeters: null,
            distanceWorkMeters: null,
            distanceHomeMeters: null,
            accuracyMeters: null,
            updatedAt: new Date().toISOString(),
          },
        }, channelKey)
        setStatus('Could not start location tracker on this device.')
      }
    }

    void startWatcher()

    return () => {
      cancelled = true
      void stopExistingWatcher()
    }
  }, [activeLocationMemo, activeSetWorkLocation, channelKey])

  return null
}
