var staticCacheName = 'mws-restaurant-stage-v1';
var allCaches = [
  staticCacheName
];

var urlsToCache = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/restaurant.html?id=1',
  '/css/styles.css',
  '/_assets/js/indexDB.js',
  '/_assets/js/dbHelper.js',
  '/_assets/js/main.js',
  '/_assets/js/restaurant_info.js',
  // 'js/main.js',
  // 'js/restaurant_info.js',
  '/img/1.webp',
  '/img/1-250px.webp',
  '/img/2.webp',
  '/img/2-250px.webp',
  '/img/3.webp',
  '/img/3-250px.webp',
  '/img/4.webp',
  '/img/4-250px.webp',
  '/img/5.webp',
  '/img/5-250px.webp',
  '/img/6.webp',
  '/img/6-250px.webp',
  '/img/7.webp',
  '/img/7-250px.webp',
  '/img/8.webp',
  '/img/8-250px.webp',
  '/img/9.webp',
  '/img/9-250px.webp',
  '/img/10.webp',
  '/img/image-placeholder.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css'
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

importScripts('/_assets/js/indexDB.js');
importScripts('/_assets/js/dbhelper.js');

self.addEventListener('sync', function(event) {
  console.log('sync from SW - send post');
      // do asynchronous tasks here
      if(event.tag == 'offlineSync') {
        event.waitUntil(
          DBHelper.addServerReview()
        );
      }
  })

