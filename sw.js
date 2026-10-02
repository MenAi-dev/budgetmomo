const CACHE_NAME = 'mon-budget-cache-v30';
const URLS_A_METTRE_EN_CACHE = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './css/modals.css',
  './css/responsive.css',
  './js/config.js',
  './js/helpers.js',
  './js/prevision.js',
  './js/storage.js',
  './js/budgets.js',
  './js/render.js',
  './js/historique.js',
  './js/modals.js',
  './js/donnees.js',
  './js/recurrentes.js',
  './js/objectif.js',
  './js/events.js',
  './js/app.js',
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
