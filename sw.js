var staticCacheName = 'mws-restaurant-stage-v1';
var allCaches = [
  staticCacheName
];

var urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/css/styles.css',
  '/_assets/js/indexDB.js',
  '/_assets/js/dbhelper.js',
  '/_assets/js/main.js',
  '/_assets/js/restaurant_info.js',
  '/img/1.webp',
  '/img/2.webp',
  '/img/3.webp',
  '/img/4.webp',
  '/img/5.webp',
  '/img/6.webp',
  '/img/7.webp',
  '/img/8.webp',
  '/img/9.webp',
  '/img/10.webp',
  '/img/image-placeholder.webp'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('mws-restaurant-stage-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response !== undefined) {
        return response;
      } else {
        return fetch(event.request).then(function (response) {
          let responseClone = response.clone();
          return response;
        }).catch(function (error) {
          console.log(error);
        });
      }
    })
  );
});