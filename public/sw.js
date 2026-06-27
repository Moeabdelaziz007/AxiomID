const CACHE = "axiomid-v3";
const STATIC_ASSETS = [
  "/icon-192x192.png",
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
      .catch((err) => {
        console.error("[SW] Precaching failed", err);
      })
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

// Static immutable assets that are safe to serve Stale-While-Revalidate.
const STATIC_ASSET_PATTERN = /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/i;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass caching for non-GET requests, APIs, and external origins.
  // Use an exact origin comparison so lookalike hosts are never matched.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
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

  // Stale-While-Revalidate strategy, restricted to static immutable assets
  // and the Next.js static chunk directory. Everything else bypasses the cache.
  if (
    !STATIC_ASSET_PATTERN.test(url.pathname) &&
    !url.pathname.startsWith("/_next/static/")
  ) {
    return;
  }

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
        .catch((err) => { if (cached) return cached; throw err; });

      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }
      return fetchPromise;
    })
  );
});
