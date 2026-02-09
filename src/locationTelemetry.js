export const GEO_TELEMETRY_EVENT = 'peggy-geo-telemetry'

const DEFAULT_LIVE = {
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

let geoTelemetry = {
  status: '',
  live: { ...DEFAULT_LIVE },
}

export function getGeoTelemetry() {
  return geoTelemetry
}

export function setGeoTelemetry(patch = {}) {
  const next = {
    ...geoTelemetry,
    ...patch,
    live: patch.live ? { ...geoTelemetry.live, ...patch.live } : geoTelemetry.live,
  }
  geoTelemetry = next

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GEO_TELEMETRY_EVENT, { detail: next }))
  }
}

