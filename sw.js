/**
 * Service Worker — Offline support for festas-builds.com
 * Network-first with cache fallback strategy for all resources.
 * CACHE_NAME is stamped with the deploy hash by the CI pipeline.
 */

var CACHE_NAME = 'festas-__DEPLOY_HASH__';
var ASSETS = [
  '/',
  '/index.html',
  '/assets/favicon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. YouTube embeds, fonts)
  if (!request.url.startsWith(self.location.origin)) return;

  // Network-first with cache fallback for all resources
  event.respondWith(
    fetch(request).then(function (response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, clone);
      });
      return response;
    }).catch(function () {
      return caches.match(request);
    })
  );
});
