import {
  cloudDisablePushSubscription,
  cloudUpsertPushSubscription,
  isCloudConfigured,
} from './cloudSync'

const PUSH_DEVICE_ID_KEY = 'peggy-push-device-id'
const PUSH_ENDPOINT_CACHE_KEY = 'peggy-push-endpoint'
const PUSH_TIMEOUT_MS = 12000
const SW_LOOKUP_TIMEOUT_MS = 2500
const SW_REGISTER_TIMEOUT_MS = 12000
const SW_READY_TIMEOUT_MS = 25000
const SW_ACTIVE_WAIT_MS = 30000
const PUSH_SUB_READ_TIMEOUT_MS = 5000
const PUSH_SUBSCRIBE_TIMEOUT_MS = 12000
const CLOUD_UPSERT_TIMEOUT_MS = 10000

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

function getBasePath() {
  return `${String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')}/`
}

function getSwUrl() {
  return `${getBasePath()}sw.js`
}

function hasPushManagerGlobalSupport() {
  if (typeof window === 'undefined') return false
  if ('PushManager' in window) return true
  try {
    return typeof ServiceWorkerRegistration !== 'undefined'
      && 'pushManager' in ServiceWorkerRegistration.prototype
  } catch {
    return false
  }
}

async function resolveServiceWorkerRegistration() {
  if (!isPushSupported()) return null
  const base = getBasePath()
  const swUrl = getSwUrl()

  const [byScope, anyScope] = await Promise.all([
    withTimeout(
      navigator.serviceWorker.getRegistration(base),
      SW_LOOKUP_TIMEOUT_MS,
      'service worker getRegistration(scope)',
    ).catch(() => null),
    withTimeout(
      navigator.serviceWorker.getRegistration(),
      SW_LOOKUP_TIMEOUT_MS,
      'service worker getRegistration',
    ).catch(() => null),
  ])
  if (byScope?.active) return byScope
  if (anyScope?.active) return anyScope

  const registered = await withTimeout(
    navigator.serviceWorker.register(swUrl, { scope: base }),
    SW_REGISTER_TIMEOUT_MS,
    'service worker register',
  ).catch(() => null)
  if (registered?.active) return registered

  const readyReg = await withTimeout(
    navigator.serviceWorker.ready,
    SW_READY_TIMEOUT_MS,
    'service worker ready',
  ).catch(() => null)
  if (readyReg?.active) return readyReg

  // Last fallback: return whichever registration exists, even if not active,
  // so caller can decide whether to retry or skip.
  return byScope || anyScope || registered || readyReg || null
}

async function waitForActiveServiceWorkerRegistration(maxMs = SW_ACTIVE_WAIT_MS) {
  if (!isPushSupported()) return null
  const base = getBasePath()
  const swUrl = getSwUrl()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const deadline = Date.now() + Math.max(3000, Number(maxMs) || SW_ACTIVE_WAIT_MS)
  let lastRegistration = null

  while (Date.now() < deadline) {
    const byScope = await withTimeout(
      navigator.serviceWorker.getRegistration(base),
      SW_LOOKUP_TIMEOUT_MS,
      'service worker getRegistration(scope) wait-active',
    ).catch(() => null)
    const all = await withTimeout(
      navigator.serviceWorker.getRegistrations(),
      SW_LOOKUP_TIMEOUT_MS,
      'service worker getRegistrations wait-active',
    ).catch(() => [])

    const scopedAll = Array.isArray(all)
      ? all.filter((reg) => {
        const scope = String(reg?.scope || '')
        if (!scope) return true
        if (!origin) return true
        return scope.startsWith(`${origin}${base}`)
      })
      : []

    const candidates = [byScope, ...scopedAll].filter(Boolean)
    const active = candidates.find(reg => reg?.active)
    if (active) return active

    lastRegistration = candidates[0] || lastRegistration

    if (!lastRegistration) {
      lastRegistration = await withTimeout(
        navigator.serviceWorker.register(swUrl, { scope: base }),
        SW_REGISTER_TIMEOUT_MS,
        'service worker register wait-active',
      ).catch(() => null)
    } else if (lastRegistration.waiting) {
      try {
        lastRegistration.waiting.postMessage({ type: 'peggy-skip-waiting' })
      } catch {
        // no-op
      }
    }

    await new Promise(resolve => setTimeout(resolve, 600))
  }

  const readyReg = await withTimeout(
    navigator.serviceWorker.ready,
    6000,
    'service worker ready final wait-active',
  ).catch(() => null)
  if (readyReg?.active) return readyReg

  if (lastRegistration?.active) return lastRegistration
  if (lastRegistration?.pushManager) return lastRegistration
  return null
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    hasPushManagerGlobalSupport()
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
  const baseRegistration = await resolveServiceWorkerRegistration()
  const registration = baseRegistration?.pushManager
    ? baseRegistration
    : await withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'service worker ready for readCurrentSubscription',
    ).catch(() => null)
  if (!registration?.pushManager) return null
  return withTimeout(
    registration.pushManager.getSubscription(),
    PUSH_SUB_READ_TIMEOUT_MS,
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
  let activeRegistration = registration?.active
    ? registration
    : await waitForActiveServiceWorkerRegistration()

  if (!activeRegistration && registration?.pushManager) {
    activeRegistration = registration
  }

  if (!activeRegistration) {
    return { status: 'skipped', reason: 'service-worker-unavailable' }
  }

  if (!activeRegistration?.pushManager) {
    const readyRegistration = await withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'service worker ready with push manager',
    ).catch(() => null)
    if (readyRegistration?.active && readyRegistration?.pushManager) {
      activeRegistration = readyRegistration
    }
  }

  if (!activeRegistration?.pushManager) {
    return { status: 'skipped', reason: 'push-manager-unavailable' }
  }

  let subscription = await withTimeout(
    activeRegistration.pushManager.getSubscription(),
    PUSH_SUB_READ_TIMEOUT_MS,
    'pushManager.getSubscription',
  ).catch(() => null)
  if (!subscription) {
    try {
      subscription = await withTimeout(
        activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        PUSH_SUBSCRIBE_TIMEOUT_MS,
        'pushManager.subscribe',
      )
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      const needsActiveWorker = msg.includes('active service worker')
      if (!needsActiveWorker) throw err

      // iOS/Safari can race here right after install/update. Wait for ready registration and retry once.
      const readyReg = await withTimeout(
        navigator.serviceWorker.ready,
        SW_READY_TIMEOUT_MS,
        'service worker ready retry',
      ).catch(() => null)
      const retryReg = readyReg?.active
        ? readyReg
        : await waitForActiveServiceWorkerRegistration(12000)
      if (!retryReg?.pushManager) throw err
      subscription = await withTimeout(
        retryReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        PUSH_SUBSCRIBE_TIMEOUT_MS,
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
    CLOUD_UPSERT_TIMEOUT_MS,
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
