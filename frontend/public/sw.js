const CACHE_NAME = 'ironchords-forge-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ironchords_inox_icon.png',
  '/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
