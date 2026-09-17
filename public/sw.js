// v3 : handlers push / notificationclick (#392) — nouveau SW à déployer.
const CACHE_NAME = 'libre-v3';
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

// ─── Web Push (#392, spec 003 R11, contracts/events.md) ────────────────────
//
// La charge utile vient de src/lib/push/server.ts : { title, body, url, tag },
// jamais de contenu ni de nom. Si une fenêtre de Libre est visible ET au
// premier plan, on ne montre rien : la pastille in-app fait le travail (Q2).
// Le `tag` remplace une notification précédente du même sujet plutôt que
// d'empiler. Aucun setAppBadge ici : le badge d'icône est piloté par l'app.
self.addEventListener('push', (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    return; // charge illisible : on ne montre rien
  }
  if (!data || typeof data.title !== 'string' || !data.title) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        if (wins.some((c) => c.visibilityState === 'visible' && c.focused)) return;
        return self.registration.showNotification(data.title, {
          body: typeof data.body === 'string' ? data.body : '',
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          tag: typeof data.tag === 'string' ? data.tag : undefined,
          renotify: false,
          data: { url: typeof data.url === 'string' ? data.url : '/' },
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        // Une fenêtre non contrôlée par ce SW (rechargement forcé, premier
        // chargement avant claim) refuse navigate() : on ouvre alors une fenêtre.
        const win = wins.find((c) => c.frameType !== 'nested') || wins[0];
        if (win) {
          return Promise.resolve(win.focus())
            .then(() => (typeof win.navigate === 'function' ? win.navigate(url) : Promise.reject(new Error('no navigate'))))
            .catch(() => self.clients.openWindow(url));
        }
        return self.clients.openWindow(url);
      })
  );
});
