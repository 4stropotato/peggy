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
const SW_READY_TIMEOUT_MS = 10000
const SW_ACTIVE_WAIT_MS = 20000
const PUSH_SUB_READ_TIMEOUT_MS = 5000
const PUSH_SUBSCRIBE_TIMEOUT_MS = 25000
const CLOUD_UPSERT_TIMEOUT_MS = 15000

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

function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = String(navigator.userAgent || '').toLowerCase()
  const platform = String(navigator.platform || '').toLowerCase()
  return /iphone|ipad|ipod/.test(ua) || /iphone|ipad|ipod/.test(platform)
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = window.navigator?.standalone === true
  return Boolean(mediaStandalone || iosStandalone)
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

function hasRegistrationPushManager(registration) {
  return Boolean(
    registration?.pushManager
    && typeof registration.pushManager.subscribe === 'function'
    && typeof registration.pushManager.getSubscription === 'function',
  )
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

function waitForWorkerActive(worker, timeoutMs = 8000) {
  if (worker?.state === 'activated') return Promise.resolve(true)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs)
    const check = () => {
      if (worker?.state === 'activated') {
        clearTimeout(timer)
        resolve(true)
      }
    }
    try {
      worker.addEventListener('statechange', check)
    } catch {}
    check()
  })
}

async function waitForActiveServiceWorkerRegistration(maxMs = SW_ACTIVE_WAIT_MS, log) {
  if (!isPushSupported()) return null
  const base = getBasePath()
  const swUrl = getSwUrl()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const deadline = Date.now() + Math.max(3000, Number(maxMs) || SW_ACTIVE_WAIT_MS)
  const _log = typeof log === 'function' ? log : () => {}
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

    // Listen for installing/waiting worker to become active
    const pendingWorker = lastRegistration?.installing || lastRegistration?.waiting
    if (pendingWorker && pendingWorker.state !== 'activated') {
      _log('sw-wait-active', `Worker in state "${pendingWorker.state}", listening for statechange...`)
      const became = await waitForWorkerActive(pendingWorker, Math.min(4000, deadline - Date.now()))
      if (became) {
        _log('sw-wait-active', 'Worker became active via statechange')
        // Re-fetch the registration since the worker is now active
        const freshReg = await withTimeout(
          navigator.serviceWorker.getRegistration(base),
          SW_LOOKUP_TIMEOUT_MS,
          'service worker getRegistration after statechange',
        ).catch(() => null)
        if (freshReg?.active) return freshReg
      }
    }

    await new Promise(resolve => setTimeout(resolve, 600))
  }

  // If still not active, nuclear option: unregister everything and re-register fresh
  _log('sw-nuke', 'SW stuck non-active after timeout. Unregistering and re-registering...')
  try {
    const allRegs = await navigator.serviceWorker.getRegistrations()
    for (const reg of allRegs) {
      const scope = String(reg?.scope || '')
      if (scope.startsWith(`${origin}${base}`) || !scope) {
        await reg.unregister()
      }
    }
    _log('sw-nuke', 'Old registrations cleared. Registering fresh SW...')
    const freshReg = await withTimeout(
      navigator.serviceWorker.register(swUrl, { scope: base }),
      SW_REGISTER_TIMEOUT_MS,
      'service worker fresh register after nuke',
    )
    if (freshReg?.active) {
      _log('sw-nuke', 'Fresh registration immediately active')
      return freshReg
    }
    const pendingWorker = freshReg?.installing || freshReg?.waiting
    if (pendingWorker) {
      _log('sw-nuke', `Fresh SW in state "${pendingWorker.state}", waiting for activation...`)
      const became = await waitForWorkerActive(pendingWorker, 10000)
      if (became) {
        _log('sw-nuke', 'Fresh SW became active')
        const finalReg = await withTimeout(
          navigator.serviceWorker.getRegistration(base),
          SW_LOOKUP_TIMEOUT_MS,
          'service worker getRegistration after fresh activate',
        ).catch(() => null)
        if (finalReg?.active) return finalReg
      }
    }
    // Final fallback: navigator.serviceWorker.ready
    const readyReg = await withTimeout(
      navigator.serviceWorker.ready,
      8000,
      'service worker ready after nuke',
    ).catch(() => null)
    if (readyReg?.active) {
      _log('sw-nuke', 'Got active via navigator.serviceWorker.ready after nuke')
      return readyReg
    }
    _log('sw-nuke', 'Fresh registration still not active after nuke')
  } catch (nukeErr) {
    _log('sw-nuke', `Nuke failed: ${nukeErr?.message || 'unknown'}`)
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
  const registration = hasRegistrationPushManager(baseRegistration)
    ? baseRegistration
    : await withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'service worker ready for readCurrentSubscription',
    ).catch(() => null)
  if (!hasRegistrationPushManager(registration)) return null
  return withTimeout(
    registration.pushManager.getSubscription(),
    PUSH_SUB_READ_TIMEOUT_MS,
    'pushManager.getSubscription',
  )
}

export async function upsertCurrentPushSubscription(session, { notifEnabled = true, onStep } = {}) {
  const log = typeof onStep === 'function' ? onStep : () => {}
  log('prechecks', 'Running prechecks...')
  if (!isCloudConfigured()) return { status: 'skipped', reason: 'cloud-not-configured' }
  if (!session?.accessToken || !session?.user?.id) return { status: 'skipped', reason: 'no-session' }
  if (!isPushSupported()) return { status: 'skipped', reason: 'push-not-supported' }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return { status: 'skipped', reason: 'insecure-context' }
  }
  if (isIosDevice() && !isStandaloneMode()) {
    return { status: 'skipped', reason: 'ios-home-screen-required' }
  }
  if (Notification.permission !== 'granted') return { status: 'skipped', reason: 'permission-not-granted' }

  const publicVapidKey = readPublicVapidKey()
  if (!publicVapidKey) return { status: 'skipped', reason: 'missing-vapid-public-key' }
  log('prechecks', 'All prechecks passed')

  log('sw-resolve', 'Resolving service worker registration...')
  const registration = await resolveServiceWorkerRegistration()
  log('sw-resolve', `SW resolved: active=${!!registration?.active}, scope=${registration?.scope || 'none'}`)

  let activeRegistration = registration?.active
    ? registration
    : null
  if (!activeRegistration) {
    log('sw-wait-active', 'Waiting for active service worker...')
    activeRegistration = await waitForActiveServiceWorkerRegistration(SW_ACTIVE_WAIT_MS, log)
    log('sw-wait-active', `Wait result: active=${!!activeRegistration?.active}`)
  }

  if (!activeRegistration && hasRegistrationPushManager(registration)) {
    log('sw-fallback', 'Using non-active registration with pushManager')
    activeRegistration = registration
  }

  if (!activeRegistration) {
    log('sw-fail', 'No service worker registration available')
    return { status: 'skipped', reason: 'service-worker-unavailable' }
  }

  if (!hasRegistrationPushManager(activeRegistration)) {
    log('pm-ready', 'pushManager missing, waiting for navigator.serviceWorker.ready...')
    const readyRegistration = await withTimeout(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'service worker ready with push manager',
    ).catch(() => null)
    if (readyRegistration?.active && hasRegistrationPushManager(readyRegistration)) {
      activeRegistration = readyRegistration
      log('pm-ready', 'Got pushManager from ready registration')
    }
  }

  if (!hasRegistrationPushManager(activeRegistration)) {
    log('pm-scan', 'pushManager still missing; scanning all registrations for compatible scope...')
    const allRegs = await withTimeout(
      navigator.serviceWorker.getRegistrations(),
      SW_LOOKUP_TIMEOUT_MS,
      'service worker getRegistrations pushManager scan',
    ).catch(() => [])
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = getBasePath()
    const candidate = Array.isArray(allRegs)
      ? allRegs.find((reg) => {
        if (!hasRegistrationPushManager(reg)) return false
        const scope = String(reg?.scope || '')
        if (!scope || !currentOrigin) return true
        return scope.startsWith(`${currentOrigin}${base}`)
      })
      : null
    if (candidate) {
      activeRegistration = candidate
      log('pm-scan', `Found pushManager via registration scan, scope=${candidate.scope || 'n/a'}`)
    }
  }

  if (!hasRegistrationPushManager(activeRegistration)) {
    log('pm-fail', 'pushManager still unavailable after all attempts')
    return { status: 'skipped', reason: 'push-manager-unavailable' }
  }
  log('pm-ok', `pushManager available, scope=${activeRegistration.scope || 'n/a'}`)

  log('get-sub', 'Calling pushManager.getSubscription()...')
  let subscription = await withTimeout(
    activeRegistration.pushManager.getSubscription(),
    PUSH_SUB_READ_TIMEOUT_MS,
    'pushManager.getSubscription',
  ).catch(() => null)
  log('get-sub', subscription ? 'Existing subscription found' : 'No existing subscription')

  if (!subscription) {
    log('subscribe', 'Calling pushManager.subscribe()...')
    try {
      subscription = await withTimeout(
        activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        PUSH_SUBSCRIBE_TIMEOUT_MS,
        'pushManager.subscribe',
      )
      log('subscribe', 'Subscribe succeeded')
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase()
      const needsActiveWorker = msg.includes('active service worker')
      log('subscribe', `Subscribe failed: ${err?.message || 'unknown'}`)
      if (!needsActiveWorker) throw err

      log('subscribe-retry', 'Needs active worker, retrying after ready...')
      const readyReg = await withTimeout(
        navigator.serviceWorker.ready,
        SW_READY_TIMEOUT_MS,
        'service worker ready retry',
      ).catch(() => null)
      const retryReg = readyReg?.active
        ? readyReg
        : await waitForActiveServiceWorkerRegistration(12000, log)
      if (!retryReg?.pushManager) throw err
      subscription = await withTimeout(
        retryReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBase64UrlUint8Array(publicVapidKey),
        }),
        PUSH_SUBSCRIBE_TIMEOUT_MS,
        'pushManager.subscribe retry',
      )
      log('subscribe-retry', 'Subscribe retry succeeded')
    }
  }

  const data = subscription.toJSON()
  const endpoint = data?.endpoint || subscription.endpoint || ''
  const p256dh = data?.keys?.p256dh || ''
  const auth = data?.keys?.auth || ''
  if (!endpoint || !p256dh || !auth) {
    log('validate', `Invalid subscription data: endpoint=${!!endpoint}, p256dh=${!!p256dh}, auth=${!!auth}`)
    return { status: 'skipped', reason: 'invalid-subscription' }
  }
  log('validate', `Subscription valid, endpoint hash: ...${endpoint.slice(-20)}`)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PUSH_ENDPOINT_CACHE_KEY, endpoint)
  }

  log('upsert', 'Sending subscription to server...')
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
  log('upsert', 'Server upsert complete')

  return { status: 'ok', result }
}

export function getPushDiagnostics() {
  const ios = isIosDevice()
  const standalone = isStandaloneMode()
  const secure = typeof window !== 'undefined' ? window.isSecureContext : null
  const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  const pmGlobal = hasPushManagerGlobalSupport()
  const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'unavailable'
  const vapid = readPublicVapidKey()
  const deviceId = getPushDeviceId()
  const cachedEndpoint = typeof window !== 'undefined'
    ? window.localStorage.getItem(PUSH_ENDPOINT_CACHE_KEY) || ''
    : ''
  const displayMode = typeof window !== 'undefined' && window.matchMedia
    ? (window.matchMedia('(display-mode: standalone)').matches ? 'standalone'
      : window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen'
      : 'browser')
    : 'unknown'
  const basePath = getBasePath()
  const swUrl = getSwUrl()

  return {
    ios,
    standalone,
    secure,
    swSupported,
    pmGlobal,
    notifPerm,
    vapidPresent: !!vapid,
    deviceId,
    cachedEndpoint: cachedEndpoint ? `...${cachedEndpoint.slice(-25)}` : 'none',
    displayMode,
    basePath,
    swUrl,
  }
}

export async function getPushDiagnosticsAsync() {
  const sync = getPushDiagnostics()
  let swState = 'unknown'
  let swScope = 'none'
  let subEndpoint = 'none'
  let scopedRegistrations = 0
  try {
    const allRegs = await navigator.serviceWorker.getRegistrations().catch(() => [])
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    const scoped = Array.isArray(allRegs)
      ? allRegs.filter((reg) => {
        const scope = String(reg?.scope || '')
        if (!scope || !currentOrigin) return true
        return scope.startsWith(`${currentOrigin}${sync.basePath}`)
      })
      : []
    scopedRegistrations = scoped.length

    const byScope = await navigator.serviceWorker.getRegistration(sync.basePath)
    const reg = byScope || scoped[0] || null
    if (reg) {
      swScope = reg.scope || 'none'
      swState = reg.active ? 'active' : reg.waiting ? 'waiting' : reg.installing ? 'installing' : 'no-worker'
      try {
        const sub = await reg.pushManager?.getSubscription()
        if (sub?.endpoint) subEndpoint = `...${sub.endpoint.slice(-25)}`
      } catch {}
    } else {
      swState = 'not-registered'
    }
  } catch (e) {
    swState = `error: ${e?.message || 'unknown'}`
  }
  return { ...sync, swState, swScope, subEndpoint, scopedRegistrations }
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
