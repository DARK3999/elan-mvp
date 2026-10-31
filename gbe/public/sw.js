// GBÈ — service worker : rend l'app utilisable HORS-LIGNE.
// On met en cache la coquille (HTML/CSS/JS/manifest/icône). Les appels /api/ et
// /audio/ ne sont jamais mis en cache : app.js gère la file d'attente et la synchro.

const CACHE = 'gbe-shell-v2';
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/audio/')) return; // réseau direct
  if (request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((c) => c || fetch(request).catch(() => caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(request).then((cached) => {
    const net = fetch(request).then((res) => {
      if (res.ok && request.method === 'GET') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});
