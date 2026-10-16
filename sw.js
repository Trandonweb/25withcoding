const CACHE_NAME = "coding-club-v3";
const ASSET_CACHE_ALLOWLIST = new Set([
  "/manifest.json",
  "/logo1.png"
]);

self.addEventListener("install", (event) => {
  // Replace the legacy worker immediately.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...ASSET_CACHE_ALLOWLIST]))
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

  // HTML navigations must always come from the network. Never cache or fall
  // back to a cached document: old versions once allowed COBY HTML to appear
  // at the domain root.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        new Response("인터넷 연결을 확인한 뒤 다시 시도해주세요.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        })
      )
    );
    return;
  }

  // Cache only the small, explicitly approved static assets. Do not cache
  // arbitrary same-origin pages, APIs, or HTML documents.
  if (
    url.origin === self.location.origin &&
    request.method === "GET" &&
    ASSET_CACHE_ALLOWLIST.has(url.pathname)
  ) {
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
