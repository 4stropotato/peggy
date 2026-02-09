import { Capacitor, registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')

const DEFAULT_WEB_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 60000,
}

function toNumberOrNull(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeLocation(raw) {
  if (!raw) return null
  const latitude = toNumberOrNull(raw.latitude)
  const longitude = toNumberOrNull(raw.longitude)
  if (latitude === null || longitude === null) return null

  const accuracy = toNumberOrNull(raw.accuracy)
  const timestamp = toNumberOrNull(raw.time) || Date.now()
  return {
    latitude,
    longitude,
    accuracy,
    timestamp,
    raw,
  }
}

function normalizeLocationError(error) {
  if (!error) {
    return { code: 'UNKNOWN', message: 'Unknown location error.' }
  }

  if (typeof error === 'string') {
    return { code: 'ERROR', message: error }
  }

  const code = error.code || error.errorCode || 'ERROR'
  const message = error.message || error.error || String(error)
  return { code: String(code), message: String(message) }
}

export function isNativeLocationTrackingAvailable() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}

export function isNativeIos() {
  try {
    return Capacitor?.getPlatform?.() === 'ios' && isNativeLocationTrackingAvailable()
  } catch {
    return false
  }
}

export async function getCurrentAppLocation() {
  if (isNativeLocationTrackingAvailable()) {
    await Geolocation.requestPermissions()
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30000,
    })
    return normalizeLocation({
      latitude: pos?.coords?.latitude,
      longitude: pos?.coords?.longitude,
      accuracy: pos?.coords?.accuracy,
      time: pos?.timestamp,
    })
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Location services are not available on this device/browser.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const normalized = normalizeLocation({
          latitude: pos?.coords?.latitude,
          longitude: pos?.coords?.longitude,
          accuracy: pos?.coords?.accuracy,
          time: pos?.timestamp,
        })
        if (!normalized) {
          reject(new Error('Could not parse device location.'))
          return
        }
        resolve(normalized)
      },
      (err) => reject(new Error(err?.message || 'Could not get current location.')),
      { ...DEFAULT_WEB_OPTIONS, timeout: 15000, maximumAge: 30000 }
    )
  })
}

async function startNativeWatcher({ onLocation, onError, distanceFilter, background }) {
  const watcherId = await BackgroundGeolocation.addWatcher(
    {
      requestPermissions: true,
      stale: false,
      distanceFilter: Math.max(1, Number(distanceFilter) || 20),
      backgroundMessage: background ? 'Peggy is tracking location for auto attendance.' : undefined,
      backgroundTitle: background ? 'Peggy Auto Attendance' : undefined,
    },
    (location, error) => {
      if (error) {
        onError?.(normalizeLocationError(error))
        return
      }
      const normalized = normalizeLocation(location)
      if (!normalized) return
      onLocation(normalized)
    }
  )

  return async () => {
    if (!watcherId) return
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId })
    } catch {
      // ignore cleanup errors to keep app flow resilient
    }
  }
}

async function startWebWatcher({ onLocation, onError }) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Location services are not available on this device/browser.')
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const normalized = normalizeLocation({
        latitude: pos?.coords?.latitude,
        longitude: pos?.coords?.longitude,
        accuracy: pos?.coords?.accuracy,
        time: pos?.timestamp,
      })
      if (!normalized) return
      onLocation(normalized)
    },
    (error) => onError?.(normalizeLocationError(error)),
    DEFAULT_WEB_OPTIONS
  )

  return async () => {
    navigator.geolocation.clearWatch(watchId)
  }
}

export async function startAppLocationWatcher({
  onLocation,
  onError,
  distanceFilter = 20,
  background = true,
} = {}) {
  if (typeof onLocation !== 'function') {
    throw new Error('startAppLocationWatcher requires an onLocation callback.')
  }

  if (isNativeLocationTrackingAvailable()) {
    return startNativeWatcher({ onLocation, onError, distanceFilter, background })
  }
  return startWebWatcher({ onLocation, onError })
}
