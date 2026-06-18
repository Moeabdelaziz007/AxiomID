const CACHE_NAME = "axiomid-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/axiomid-logo.png",
  "/axiomid-banner.png",
  "/favicon.ico",
];

// Only cache truly public API routes (no auth headers)
const PUBLIC_API_ROUTES = ["/api/status", "/api/health"];

/**
 * Stores a response in the cache for a given request.
 * @param {Request} request - The request to use as the cache key.
 * @param {Response} response - The response to cache.
 */
function cacheResponse(request, response) {
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and local requests
  if (
    request.method !== "GET" ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // API routes: network-first, only cache public routes
  if (url.pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_API_ROUTES.some((route) => url.pathname.startsWith(route));
    if (!isPublicApi) return; // Don't intercept authenticated API calls

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            cacheResponse(event, request, response);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "Service unavailable" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          cacheResponse(request, response);
        }
        return response;
      });
    })
  );
});
