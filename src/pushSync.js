import {
  cloudDisablePushSubscription,
  cloudUpsertPushSubscription,
  isCloudConfigured,
} from './cloudSync'

const PUSH_DEVICE_ID_KEY = 'peggy-push-device-id'
const PUSH_ENDPOINT_CACHE_KEY = 'peggy-push-endpoint'
const PUSH_TIMEOUT_MS = 12000

function withTimeout(promise, timeoutMs = PUSH_TIMEOUT_MS, label = 'operation') {
  const ms = Math.max(1000, Number(timeoutMs) || PUSH_TIMEOUT_MS)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

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

async function resolveServiceWorkerRegistration() {
  if (!isPushSupported()) return null
  const base = import.meta.env.BASE_URL || '/'
  const swUrl = `${base.replace(/\/+$/, '/')}sw.js`

  const byScope = await withTimeout(
    navigator.serviceWorker.getRegistration(base),
    2500,
    'service worker getRegistration(scope)',
  ).catch(() => null)
  if (byScope?.active) return byScope

  const anyScope = await withTimeout(
    navigator.serviceWorker.getRegistration(),
    2500,
    'service worker getRegistration',
  ).catch(() => null)
  if (anyScope?.active) return anyScope

  const registered = await withTimeout(
    navigator.serviceWorker.register(swUrl),
    9000,
    'service worker register',
  ).catch(() => null)
  if (registered?.active) return registered

  const readyReg = await withTimeout(
    navigator.serviceWorker.ready,
    PUSH_TIMEOUT_MS,
    'service worker ready',
  ).catch(() => null)
  if (readyReg?.active) return readyReg

  // Last fallback: return whichever registration exists, even if not active,
  // so caller can decide whether to retry or skip.
  return byScope || anyScope || registered || readyReg || null
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
  const registration = await resolveServiceWorkerRegistration()
  if (!registration?.pushManager) return null
  return withTimeout(
    registration.pushManager.getSubscription(),
    8000,
    'pushManager.getSubscription',
  )
}

export async function upsertCurrentPushSubscription(session, { notifEnabled = true } = {}) {
  if (!isCloudConfigured()) return { status: 'skipped', reason: 'cloud-not-configured' }
  if (!session?.accessToken || !session?.user?.id) return { status: 'skipped', reason: 'no-session' }
  if (!isPushSupported()) return { status: 'skipped', reason: 'push-not-supported' }
  if (Notification.permission !== 'granted') return { status: 'skipped', reason: 'permission-not-granted' }

  const publicVapidKey = readPublicVapidKey()
  if (!publicVapidKey) return { status: 'skipped', reason: 'missing-vapid-public-key' }

  const registration = await resolveServiceWorkerRegistration()
  if (!registration?.pushManager) {
    return { status: 'skipped', reason: 'push-manager-unavailable' }
  }

  let subscription = await withTimeout(
    registration.pushManager.getSubscription(),
    8000,
    'pushManager.getSubscription',
  ).catch(() => null)
  if (!subscription) {
    try {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        12000,
        'pushManager.subscribe',
      )
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      const needsActiveWorker = msg.includes('active service worker')
      if (!needsActiveWorker) throw err

      // iOS/Safari can race here right after install/update. Wait for ready registration and retry once.
      const readyReg = await withTimeout(
        navigator.serviceWorker.ready,
        12000,
        'service worker ready retry',
      ).catch(() => null)
      if (!readyReg?.pushManager) throw err
      subscription = await withTimeout(
        readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        12000,
        'pushManager.subscribe retry',
      )
    }
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

  const result = await withTimeout(
    cloudUpsertPushSubscription({
      deviceId: getPushDeviceId(),
      notifEnabled: Boolean(notifEnabled),
      endpoint,
      p256dh,
      auth,
      subscription: data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      appBaseUrl: import.meta.env.BASE_URL || '/',
    }, session),
    15000,
    'cloudUpsertPushSubscription',
  )

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
