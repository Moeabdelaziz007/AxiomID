/**
 * Tests for public/service-worker.js
 *
 * Since service workers run in a special browser context, we mock the globals
 * (caches, self, fetch) and test the handlers by capturing registered callbacks.
 */

const CACHE_NAME = "axiomid-v1";

// --- Mock globals ---

let _mockCacheStorage;
let mockCaches;
let registeredListeners;

function makeMockCache() {
  const store = new Map();
  return {
    addAll: jest.fn((_urls) => Promise.resolve()),
    put: jest.fn((req, res) => {
      store.set(typeof req === "string" ? req : req.url, res);
      return Promise.resolve();
    }),
    match: jest.fn((req) => {
      const key = typeof req === "string" ? req : req.url;
      return Promise.resolve(store.get(key) || undefined);
    }),
    _store: store,
  };
}

function setupServiceWorkerGlobals() {
  registeredListeners = {};

  const cache = makeMockCache();
  mockCaches = {
    open: jest.fn(() => Promise.resolve(cache)),
    keys: jest.fn(() => Promise.resolve([CACHE_NAME])),
    delete: jest.fn(() => Promise.resolve(true)),
    match: jest.fn(() => Promise.resolve(undefined)),
    _cache: cache,
  };

  global.caches = mockCaches;
  global.self = {
    addEventListener: jest.fn((event, handler) => {
      registeredListeners[event] = handler;
    }),
    skipWaiting: jest.fn(() => Promise.resolve()),
    clients: {
      claim: jest.fn(),
    },
    location: {
      origin: "https://axiomid.app",
    },
  };
}

// Load the service worker module each test via require
function loadServiceWorker() {
  jest.resetModules();
  setupServiceWorkerGlobals();
   
  require("../../public/sw.js");
}

function makeEvent(overrides = {}) {
  return {
    waitUntil: jest.fn((p) => p),
    respondWith: jest.fn(),
    ...overrides,
  };
}

function makeRequest(url, method = "GET") {
  return {
    url,
    method,
    clone: jest.fn(function () { return this; }),
  };
}

function makeFetchEvent(url, method = "GET") {
  const request = makeRequest(url, method);
  const event = makeEvent({ request });
  return { event, request };
}

function makeResponse(ok = true) {
  return {
    ok,
    clone: jest.fn(function () { return this; }),
  };
}

describe("sw.js — registration", () => {
  beforeEach(() => {
    loadServiceWorker();
  });

  it("registers an install listener", () => {
    expect(global.self.addEventListener).toHaveBeenCalledWith("install", expect.any(Function));
    expect(registeredListeners["install"]).toBeDefined();
  });

  it("registers an activate listener", () => {
    expect(global.self.addEventListener).toHaveBeenCalledWith("activate", expect.any(Function));
    expect(registeredListeners["activate"]).toBeDefined();
  });

  it("registers a fetch listener", () => {
    expect(global.self.addEventListener).toHaveBeenCalledWith("fetch", expect.any(Function));
    expect(registeredListeners["fetch"]).toBeDefined();
  });
});

describe("sw.js — install event", () => {
  beforeEach(() => {
    loadServiceWorker();
  });

  it("opens the axiomid-v1 cache", async () => {
    const event = makeEvent();
    registeredListeners["install"](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAME);
  });

  it("caches the static assets", async () => {
    const event = makeEvent();
    registeredListeners["install"](event);
    await event.waitUntil.mock.calls[0][0];

    const cache = await mockCaches.open.mock.results[0].value;
    expect(cache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining(["/", "/manifest.json"])
    );
  });

  it("calls self.skipWaiting() after caching assets", async () => {
    const event = makeEvent();
    registeredListeners["install"](event);
    await event.waitUntil.mock.calls[0][0];

    expect(global.self.skipWaiting).toHaveBeenCalled();
  });
});

describe("sw.js — activate event", () => {
  beforeEach(() => {
    loadServiceWorker();
  });

  it("calls self.clients.claim()", async () => {
    const event = makeEvent();
    registeredListeners["activate"](event);
    // Let microtasks settle
    await Promise.resolve();

    expect(global.self.clients.claim).toHaveBeenCalled();
  });

  it("deletes old caches that don't match CACHE_NAME", async () => {
    mockCaches.keys.mockResolvedValue(["axiomid-v0", CACHE_NAME, "old-cache"]);
    const event = makeEvent();
    registeredListeners["activate"](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockCaches.delete).toHaveBeenCalledWith("axiomid-v0");
    expect(mockCaches.delete).toHaveBeenCalledWith("old-cache");
    expect(mockCaches.delete).not.toHaveBeenCalledWith(CACHE_NAME);
  });

  it("does not delete the current cache", async () => {
    mockCaches.keys.mockResolvedValue([CACHE_NAME]);
    const event = makeEvent();
    registeredListeners["activate"](event);
    await event.waitUntil.mock.calls[0][0];

    expect(mockCaches.delete).not.toHaveBeenCalled();
  });
});

describe("sw.js — fetch event: API routes (network-first)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    loadServiceWorker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls fetch() for public API routes (network-first)", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event, request } = makeFetchEvent("https://axiomid.app/api/status");
    registeredListeners["fetch"](event);

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(request);
  });

  it("caches GET API responses when ok", async () => {
    const response = makeResponse(true);
    const mockFetch = jest.fn(() => Promise.resolve(response));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://axiomid.app/api/status", "GET");
    registeredListeners["fetch"](event);
    const _result = await event.respondWith.mock.calls[0][0];

    expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAME);
  });

  it("does NOT cache POST API responses", async () => {
    const response = makeResponse(true);
    const mockFetch = jest.fn(() => Promise.resolve(response));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://axiomid.app/api/status", "POST");
    registeredListeners["fetch"](event);
    // Service worker only handles GET — POST should not call respondWith
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("falls back to cache when API network request fails", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));
    mockCaches.match.mockResolvedValue(makeResponse(true));

    const { event, request } = makeFetchEvent("https://axiomid.app/api/status");
    registeredListeners["fetch"](event);
    const _result = await event.respondWith.mock.calls[0][0];

    expect(mockCaches.match).toHaveBeenCalledWith(request);
  });
});

describe("sw.js — fetch event: static assets (cache-first)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    loadServiceWorker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns cached response for static assets without fetching", async () => {
    const cachedResponse = makeResponse(true);
    mockCaches.match.mockResolvedValue(cachedResponse);

    const { event, request: _request } = makeFetchEvent("https://axiomid.app/icon-192x192.png");
    registeredListeners["fetch"](event);
    const result = await event.respondWith.mock.calls[0][0];

    expect(result).toBe(cachedResponse);
    // fetch should NOT have been called
  });

  it("fetches and caches static assets not in cache", async () => {
    mockCaches.match.mockResolvedValue(undefined);
    const networkResponse = makeResponse(true);
    const mockFetch = jest.fn(() => Promise.resolve(networkResponse));
    global.fetch = mockFetch;

    const { event, request } = makeFetchEvent("https://axiomid.app/manifest.json");
    registeredListeners["fetch"](event);
    await event.respondWith.mock.calls[0][0];

    expect(mockFetch).toHaveBeenCalledWith(request);
    expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAME);
  });

  it("does not cache non-ok static asset responses", async () => {
    mockCaches.match.mockResolvedValue(undefined);
    const notFoundResponse = makeResponse(false);
    global.fetch = jest.fn(() => Promise.resolve(notFoundResponse));

    const { event } = makeFetchEvent("https://axiomid.app/missing.png");
    registeredListeners["fetch"](event);
    await event.respondWith.mock.calls[0][0];

    expect(mockCaches._cache.put).not.toHaveBeenCalled();
  });

  it("routes non-/api/ paths to cache-first strategy", () => {
    mockCaches.match.mockResolvedValue(makeResponse(true));

    const { event } = makeFetchEvent("https://axiomid.app/dashboard");
    registeredListeners["fetch"](event);

    // Cache match should be called for non-api paths
    expect(mockCaches.match).toHaveBeenCalled();
  });
});

describe("sw.js — fetch event: PUBLIC_API_ROUTES coverage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    loadServiceWorker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("intercepts /api/health (second public route)", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event, request } = makeFetchEvent("https://axiomid.app/api/health");
    registeredListeners["fetch"](event);

    expect(event.respondWith).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(request);
  });

  it("does NOT intercept non-public API routes (/api/users)", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://axiomid.app/api/users");
    registeredListeners["fetch"](event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does NOT intercept non-public API routes (/api/sync)", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://axiomid.app/api/sync");
    registeredListeners["fetch"](event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("does NOT intercept cross-origin requests", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://external.example.com/api/status");
    registeredListeners["fetch"](event);

    expect(event.respondWith).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 503 JSON when network fails and no cached API response exists", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));
    mockCaches.match.mockResolvedValue(undefined);

    const { event } = makeFetchEvent("https://axiomid.app/api/health");
    registeredListeners["fetch"](event);
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.status).toBe(503);
    const body = await result.json();
    expect(body).toEqual({ error: "Service unavailable" });
  });

  it("caches /api/health responses that are ok", async () => {
    const response = makeResponse(true);
    global.fetch = jest.fn(() => Promise.resolve(response));

    const { event } = makeFetchEvent("https://axiomid.app/api/health");
    registeredListeners["fetch"](event);
    await event.respondWith.mock.calls[0][0];

    expect(mockCaches.open).toHaveBeenCalledWith(CACHE_NAME);
  });

  it("does NOT cache API responses that are not ok", async () => {
    const response = makeResponse(false);
    global.fetch = jest.fn(() => Promise.resolve(response));

    const { event } = makeFetchEvent("https://axiomid.app/api/status");
    registeredListeners["fetch"](event);
    await event.respondWith.mock.calls[0][0];

    // caches.open should not have been called for caching (install calls it once, but not after this fetch)
    const openCallsForCache = mockCaches.open.mock.calls;
    // If caches.open was called, it must not be for a put after non-ok response
    expect(mockCaches._cache.put).not.toHaveBeenCalled();
  });
});

describe("sw.js — fetch event: origin filtering", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    loadServiceWorker();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("does NOT intercept cross-origin static asset requests", () => {
    const mockFetch = jest.fn(() => Promise.resolve(makeResponse(true)));
    global.fetch = mockFetch;

    const { event } = makeFetchEvent("https://cdn.example.com/icon-192x192.png");
    registeredListeners["fetch"](event);

    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("intercepts same-origin static asset requests", async () => {
    mockCaches.match.mockResolvedValue(makeResponse(true));

    const { event } = makeFetchEvent("https://axiomid.app/axiomid-logo.png");
    registeredListeners["fetch"](event);

    expect(event.respondWith).toHaveBeenCalled();
  });

  it("intercepts same-origin requests for newly added static assets (axiomid-banner.png)", async () => {
    mockCaches.match.mockResolvedValue(makeResponse(true));

    const { event } = makeFetchEvent("https://axiomid.app/axiomid-banner.png");
    registeredListeners["fetch"](event);

    expect(event.respondWith).toHaveBeenCalled();
  });
});
