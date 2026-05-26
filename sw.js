const CACHE_NAME = "coding-club-v1";

const urlsToCache = [
  "/",
  "/manifest.json",
  "/2025/logo.png"
];

self.addEventListener("install", (event) => {

  console.log("Service Worker 설치됨");

  event.waitUntil(

    caches.open(CACHE_NAME).then((cache) => {

      return cache.addAll(urlsToCache);

    })

  );

});

self.addEventListener("fetch", (event) => {

  event.respondWith(

    caches.match(event.request).then((response) => {

      return response || fetch(event.request);

    })

  );

});

self.addEventListener("activate", (event) => {

  console.log("Service Worker 활성화됨");

});
