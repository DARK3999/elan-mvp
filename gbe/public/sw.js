// GBÈ — service worker : rend l'application utilisable HORS-LIGNE.
// On met en cache la "coquille" de l'app (HTML/CSS/JS/manifest/icône) pour
// qu'elle s'ouvre même sans aucune connexion. Les appels /api/ ne sont jamais
// mis en cache : c'est le client (app.js) qui gère la file d'attente et la
// synchronisation.

const CACHE = 'gbe-shell-v1';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne jamais intercepter l'API : laisser passer au réseau.
  if (url.pathname.startsWith('/api/')) return;

  // Navigation : cache-first avec repli sur index (app autonome).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) =>
        cached || fetch(request).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // Ressources : cache d'abord, puis réseau (et on met à jour le cache).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && request.method === 'GET') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
