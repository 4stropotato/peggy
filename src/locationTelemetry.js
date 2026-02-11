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

const DEFAULT_CHANNEL = 'naomi'
const CHANNELS = ['naomi', 'husband']

function createChannelState() {
  return {
    status: '',
    live: { ...DEFAULT_LIVE },
  }
}

function normalizeChannel(channel) {
  const raw = String(channel || '').trim().toLowerCase()
  return CHANNELS.includes(raw) ? raw : DEFAULT_CHANNEL
}

let geoTelemetry = {
  naomi: createChannelState(),
  husband: createChannelState(),
}

export function getGeoTelemetry(channel = DEFAULT_CHANNEL) {
  const key = normalizeChannel(channel)
  return geoTelemetry[key] || createChannelState()
}

export function setGeoTelemetry(patch = {}, channel = DEFAULT_CHANNEL) {
  const key = normalizeChannel(channel)
  const prev = geoTelemetry[key] || createChannelState()
  const next = {
    ...prev,
    ...patch,
    live: patch.live ? { ...prev.live, ...patch.live } : prev.live,
  }
  geoTelemetry = {
    ...geoTelemetry,
    [key]: next,
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GEO_TELEMETRY_EVENT, { detail: { channel: key, ...next } }))
  }
}
