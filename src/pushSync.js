import {
  cloudDisablePushSubscription,
  cloudUpsertPushSubscription,
  isCloudConfigured,
} from './cloudSync'

const PUSH_DEVICE_ID_KEY = 'peggy-push-device-id'
const PUSH_ENDPOINT_CACHE_KEY = 'peggy-push-endpoint'

function toBase64UrlUint8Array(base64) {
  const padded = `${base64}`.replace(/-/g, '+').replace(/_/g, '/')
  const safe = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')
  const raw = atob(safe)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readPublicVapidKey() {
  return String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim()
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getPushDeviceId() {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(PUSH_DEVICE_ID_KEY)
  if (existing) return existing
  const next = randomId()
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, next)
  return next
}

async function readCurrentSubscription() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function upsertCurrentPushSubscription(session, { notifEnabled = true } = {}) {
  if (!isCloudConfigured()) return { status: 'skipped', reason: 'cloud-not-configured' }
  if (!session?.accessToken || !session?.user?.id) return { status: 'skipped', reason: 'no-session' }
  if (!isPushSupported()) return { status: 'skipped', reason: 'push-not-supported' }
  if (Notification.permission !== 'granted') return { status: 'skipped', reason: 'permission-not-granted' }

  const publicVapidKey = readPublicVapidKey()
  if (!publicVapidKey) return { status: 'skipped', reason: 'missing-vapid-public-key' }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
    })
  }

  const data = subscription.toJSON()
  const endpoint = data?.endpoint || subscription.endpoint || ''
  const p256dh = data?.keys?.p256dh || ''
  const auth = data?.keys?.auth || ''
  if (!endpoint || !p256dh || !auth) {
    return { status: 'skipped', reason: 'invalid-subscription' }
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PUSH_ENDPOINT_CACHE_KEY, endpoint)
  }

  const result = await cloudUpsertPushSubscription({
    deviceId: getPushDeviceId(),
    notifEnabled: Boolean(notifEnabled),
    endpoint,
    p256dh,
    auth,
    subscription: data,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    appBaseUrl: import.meta.env.BASE_URL || '/',
  }, session)

  return { status: 'ok', result }
}

export async function disableCurrentPushSubscription(session, { unsubscribeLocal = false } = {}) {
  let subscription = null
  try {
    subscription = await readCurrentSubscription()
  } catch {
    subscription = null
  }

  const endpointFromSub = subscription?.endpoint || ''
  const endpointFromCache = typeof window !== 'undefined'
    ? window.localStorage.getItem(PUSH_ENDPOINT_CACHE_KEY) || ''
    : ''
  const endpoint = endpointFromSub || endpointFromCache
  const deviceId = getPushDeviceId()

  if (session?.accessToken && session?.user?.id) {
    await cloudDisablePushSubscription({ endpoint, deviceId }, session)
  }

  if (unsubscribeLocal && subscription) {
    try { await subscription.unsubscribe() } catch {}
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PUSH_ENDPOINT_CACHE_KEY)
  }

  return { status: 'ok' }
}
