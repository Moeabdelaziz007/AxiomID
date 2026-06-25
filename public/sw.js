const CACHE = "axiomid-v3";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/axiomid-logo.png",
  "/axiomid-banner.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass caching for non-GET requests, APIs, and external origins
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin) ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Network-First strategy for HTML document requests and homepage
  if (
    event.request.mode === "navigate" ||
    url.pathname === "/" ||
    !url.pathname.includes(".")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(event.request, clone))
            );
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate strategy for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(event.request, clone))
            );
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
