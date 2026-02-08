const CACHE_NAME = 'baby-prep-v8';

function resolveBasePath() {
  const swPath = self.location?.pathname || '/sw.js';
  if (swPath.endsWith('/sw.js')) return swPath.slice(0, -6) || '/';
  return '/';
}

const BASE = resolveBasePath();
const PRECACHE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}apple-touch-icon-180.png`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`
];

function toAbsoluteUrl(url) {
  try {
    return new URL(url, self.location.origin).toString();
  } catch {
    return `${self.location.origin}${BASE}`;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match(`${BASE}index.html`);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? String(event.data.text()) : '' };
  }

  const icon = `${BASE}icon-192.png`;
  const title = payload.title || 'Peggy reminder';
  const body = payload.body || 'Open Peggy to check your latest reminders.';
  const targetUrl = toAbsoluteUrl(payload.url || BASE);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon || icon,
      badge: payload.badge || icon,
      tag: payload.tag || 'peggy-push',
      renotify: Boolean(payload.renotify),
      requireInteraction: Boolean(payload.requireInteraction),
      data: {
        url: targetUrl,
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = toAbsoluteUrl(event.notification?.data?.url || BASE);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          const clientUrl = toAbsoluteUrl(client.url || BASE);
          const samePath = clientUrl === targetUrl || clientUrl.startsWith(toAbsoluteUrl(BASE));
          if (samePath) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
