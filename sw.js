const CACHE_NAME = 'mon-budget-cache-v7';
const URLS_A_METTRE_EN_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_A_METTRE_EN_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(noms =>
      Promise.all(
        noms.filter(nom => nom !== CACHE_NAME).map(nom => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(reponse => reponse || fetch(event.request))
  );
});
