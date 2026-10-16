const CACHE_NAME = "coding-club-v2";
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo1.png"
];

self.addEventListener("install", (event) => {
  // Activate the updated worker promptly so an old cached homepage is replaced.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never serve a stale cached document for the homepage or other HTML navigation.
  // This prevents an old COBY page from appearing at the domain root.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response && response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (url.pathname === "/") {
            const home = await caches.match("/");
            if (home) return home;
          }
          return new Response("네트워크에 연결할 수 없습니다. 인터넷 연결 후 다시 시도해주세요.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        })
    );
    return;
  }

  // Use the network first for same-origin files, while retaining a cache fallback.
  if (url.origin === self.location.origin && request.method === "GET") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );
  }
});
