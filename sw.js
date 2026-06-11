// Biker Society Service Worker
const CACHE_NAME = 'biker-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// ── Install: cache all assets ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for HTML, cache-first for static assets ──────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Skip non-GET and cross-origin API calls (HeyValue)
  if (e.request.method !== 'GET') return;
  if (url.hostname !== location.hostname && !url.hostname.includes('unpkg')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        // Cache successful GETs for static assets
        if (res.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      // HTML: always try network first, fall back to cache
      return url.pathname.endsWith('/') || url.pathname.endsWith('.html') ? networkFetch : (cached || networkFetch);
    })
  );
});

// ── Background Sync: only runs when GPS is active ─────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'location-sync') {
    e.waitUntil(doLocationSync());
  }
});

// ── Push notification ────────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  self.registration.showNotification(data.title || 'Biker Society', {
    body: data.body || 'Nueva notificacion',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'biker-notif',
    vibrate: [200, 100, 200],
    data: data.url ? { url: data.url } : {}
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(clients.openWindow(url));
});

// ── Helpers ───────────────────────────────────────────────────────────────
async function doLocationSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
    });
    const { latitude: lat, longitude: lng } = pos.coords;
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
      client.postMessage({ type: 'BG_LOCATION', lat, lng });
    });
  } catch (err) {
    console.warn('BG location sync failed:', err);
  }
}
