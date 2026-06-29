// service-worker.js
const CACHE_NAME = 'mysemsem-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/search.html',
  '/profile.html',
  '/admin.html',
  '/css/style.css',
  '/js/api.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
