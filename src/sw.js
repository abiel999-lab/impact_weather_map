/* Impact Weather Map SW – basic offline + SWR for forecast */
const VER = 'v1';
const APP_SHELL = `iwm-app-${VER}`;
const RUNTIME = `iwm-rt-${VER}`;
const FORECAST = `iwm-forecast-${VER}`;
const TILES = `iwm-tiles-${VER}`;

// App shell minimal (Vite asset hashed akan tercache runtime otomatis)
const APP_FILES = ['/', '/index.html', '/manifest.webmanifest'];

// Utils
const staleWhileRevalidate = async (event, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const net = fetch(event.request)
    .then(async (res) => {
      if (res && res.ok) {
        await cache.put(event.request, res.clone());
      }
      return res;
    })
    .catch(() => cached); // if offline
  return cached ? cached : net;
};

const cacheFirst = async (event, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const res = await fetch(event.request);
  if (res && res.ok) cache.put(event.request, res.clone());
  return res;
};

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(APP_SHELL).then((c) => c.addAll(APP_FILES)));
});

self.addEventListener('activate', (e) => {
  clients.claim();
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_SHELL, RUNTIME, FORECAST, TILES].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET
  if (event.request.method !== 'GET') return;

  // Open-Meteo forecast -> Stale-While-Revalidate
  if (url.hostname.endsWith('open-meteo.com')) {
    event.respondWith(staleWhileRevalidate(event, FORECAST));
    return;
  }

  // OSM tiles -> Cache-First (hemat jaringan; offline map ringan)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(event, TILES));
    return;
  }

  // App assets (same-origin) -> SWR agar cepat & selalu update belakang layar
  if (url.origin === self.location.origin) {
    // navigasi SPA: fallback ke index.html saat offline
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match('/index.html'))
      );
      return;
    }
    event.respondWith(staleWhileRevalidate(event, RUNTIME));
    return;
  }

  // default: biarkan jaringan
});
