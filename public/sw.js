const CACHE_NAME = 'libre-v2';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Only cache-first these immutable static assets. Everything else (HTML
// navigations, and especially /api/ responses) must hit the network so the
// PWA never serves a stale profile list. See the "ghost user" bug: API GET
// responses are same-origin (type 'basic') and were being cached forever.
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.json' ||
    /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?|ttf|otf)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never serve /api/ (or any non-asset) from cache — always go to network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return; // let the browser handle it (network)
  }

  // Network-first for navigations, with cache fallback for offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first only for immutable static assets.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
  // Anything else: default network handling (no respondWith).
});
