/**
 * @jest-environment node
 *
 * Tests for public/service-worker.js
 *
 * PR change: new service worker with install, activate, and fetch event handlers.
 *
 * Strategy:
 * - Simulate the service worker's self global environment with mocks.
 * - Verify event listeners are registered (install, activate, fetch).
 * - Verify caching strategy logic: API routes use network-first, static assets use cache-first.
 * - Verify the CACHE_NAME and STATIC_ASSETS constants.
 */

// ---------------------------------------------------------------------------
// Service Worker mock environment
// ---------------------------------------------------------------------------

interface MockCache {
  addAll: jest.Mock;
  put: jest.Mock;
  match: jest.Mock;
}

interface MockCacheStorage {
  open: jest.Mock;
  keys: jest.Mock;
  match: jest.Mock;
  delete: jest.Mock;
}

let mockCacheStorage: MockCacheStorage;
let mockCache: MockCache;
let selfMock: Record<string, unknown>;
const eventListeners: Record<string, ((event: unknown) => void)[]> = {};

function setupServiceWorkerEnv() {
  mockCache = {
    addAll: jest.fn().mockResolvedValue(undefined),
    put: jest.fn().mockResolvedValue(undefined),
    match: jest.fn().mockResolvedValue(undefined),
  };

  mockCacheStorage = {
    open: jest.fn().mockResolvedValue(mockCache),
    keys: jest.fn().mockResolvedValue([]),
    match: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(true),
  };

  selfMock = {
    addEventListener: jest.fn((event: string, handler: (e: unknown) => void) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    }),
    skipWaiting: jest.fn().mockResolvedValue(undefined),
    clients: {
      claim: jest.fn().mockResolvedValue(undefined),
    },
    caches: mockCacheStorage,
  };

  // Reset event listeners
  for (const key of Object.keys(eventListeners)) {
    delete eventListeners[key];
  }

  // Set globals
  (global as Record<string, unknown>).self = selfMock;
  (global as Record<string, unknown>).caches = mockCacheStorage;
}

function loadServiceWorker() {
  // Clear require cache to reload the module fresh
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../public/service-worker.js");
  });
}

function fireEvent(eventName: string, eventData: unknown) {
  const handlers = eventListeners[eventName] || [];
  for (const handler of handlers) {
    handler(eventData);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  setupServiceWorkerEnv();
});

describe("service-worker.js — constants (PR change: new file)", () => {
  it("registers exactly 3 event listeners (install, activate, fetch)", () => {
    loadServiceWorker();
    const registeredEvents = Object.keys(eventListeners);
    expect(registeredEvents).toContain("install");
    expect(registeredEvents).toContain("activate");
    expect(registeredEvents).toContain("fetch");
    expect(registeredEvents).toHaveLength(3);
  });
});

describe("service-worker.js — install event", () => {
  it("opens the cache during install", async () => {
    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("install", { waitUntil: waitUntilFn });

    expect(waitUntilFn).toHaveBeenCalledTimes(1);
    // Await the promise passed to waitUntil
    await waitUntilFn.mock.calls[0][0];

    expect(mockCacheStorage.open).toHaveBeenCalledWith("axiomid-v1");
  });

  it("caches all static assets during install", async () => {
    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("install", { waitUntil: waitUntilFn });
    await waitUntilFn.mock.calls[0][0];

    expect(mockCache.addAll).toHaveBeenCalledTimes(1);
    const cachedAssets: string[] = mockCache.addAll.mock.calls[0][0];
    expect(cachedAssets).toContain("/");
    expect(cachedAssets).toContain("/icon-192x192.png");
    expect(cachedAssets).toContain("/icon-512x512.png");
    expect(cachedAssets).toContain("/manifest.json");
  });

  it("calls skipWaiting after caching assets during install", async () => {
    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("install", { waitUntil: waitUntilFn });
    await waitUntilFn.mock.calls[0][0];

    expect(selfMock.skipWaiting).toHaveBeenCalledTimes(1);
  });
});

describe("service-worker.js — activate event", () => {
  it("calls clients.claim() during activation", async () => {
    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("activate", { waitUntil: waitUntilFn });
    await waitUntilFn.mock.calls[0][0];

    expect((selfMock.clients as { claim: jest.Mock }).claim).toHaveBeenCalledTimes(1);
  });

  it("deletes old caches during activation", async () => {
    // Simulate old cache names
    mockCacheStorage.keys.mockResolvedValue(["axiomid-v0", "old-cache", "axiomid-v1"]);

    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("activate", { waitUntil: waitUntilFn });
    await waitUntilFn.mock.calls[0][0];

    // Should delete old caches but not the current one (axiomid-v1)
    expect(mockCacheStorage.delete).toHaveBeenCalledWith("axiomid-v0");
    expect(mockCacheStorage.delete).toHaveBeenCalledWith("old-cache");
    expect(mockCacheStorage.delete).not.toHaveBeenCalledWith("axiomid-v1");
  });

  it("does not delete current cache during activation", async () => {
    mockCacheStorage.keys.mockResolvedValue(["axiomid-v1"]);

    loadServiceWorker();

    const waitUntilFn = jest.fn();
    fireEvent("activate", { waitUntil: waitUntilFn });
    await waitUntilFn.mock.calls[0][0];

    expect(mockCacheStorage.delete).not.toHaveBeenCalled();
  });
});

describe("service-worker.js — fetch event: API routes (network-first)", () => {
  it("fetches from network for API routes", async () => {
    const networkResponse = new Response("{}", { status: 200 });
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue(networkResponse);

    loadServiceWorker();

    const respondWithFn = jest.fn();
    fireEvent("fetch", {
      request: new Request("https://axiomid.app/api/status"),
      respondWith: respondWithFn,
    });

    expect(respondWithFn).toHaveBeenCalledTimes(1);
    const responsePromise = respondWithFn.mock.calls[0][0];
    const response = await responsePromise;

    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://axiomid.app/api/status" })
    );
    expect(response.status).toBe(200);
  });

  it("caches GET API responses when ok", async () => {
    const networkResponse = new Response("{}", { status: 200 });
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue(networkResponse);

    loadServiceWorker();

    const respondWithFn = jest.fn();
    const request = new Request("https://axiomid.app/api/status", { method: "GET" });
    fireEvent("fetch", {
      request,
      respondWith: respondWithFn,
    });

    await respondWithFn.mock.calls[0][0];

    expect(mockCacheStorage.open).toHaveBeenCalledWith("axiomid-v1");
  });

  it("does NOT cache POST API responses", async () => {
    const networkResponse = new Response("{}", { status: 200 });
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue(networkResponse);

    loadServiceWorker();

    const respondWithFn = jest.fn();
    const putSpy = jest.fn();
    mockCache.put = putSpy;
    mockCacheStorage.open.mockResolvedValue(mockCache);

    const request = new Request("https://axiomid.app/api/status", { method: "POST" });
    fireEvent("fetch", {
      request,
      respondWith: respondWithFn,
    });

    // Service worker only handles GET — POST should not call respondWith
    expect(respondWithFn).not.toHaveBeenCalled();
  });

  it("falls back to cache when API network request fails", async () => {
    (global as Record<string, unknown>).fetch = jest.fn().mockRejectedValue(new Error("Network error"));
    const cachedResponse = new Response("cached", { status: 200 });
    mockCacheStorage.match.mockResolvedValue(cachedResponse);

    // Override global caches.match
    (global as Record<string, unknown>).caches = mockCacheStorage;

    loadServiceWorker();

    const respondWithFn = jest.fn();
    fireEvent("fetch", {
      request: new Request("https://axiomid.app/api/status"),
      respondWith: respondWithFn,
    });

    const response = await respondWithFn.mock.calls[0][0];

    expect(response).toBe(cachedResponse);
  });
});

describe("service-worker.js — fetch event: static assets (cache-first)", () => {
  it("returns cached response for static assets when available", async () => {
    const cachedResponse = new Response("cached html", { status: 200 });
    mockCache.match = jest.fn().mockResolvedValue(cachedResponse);
    mockCacheStorage.match = jest.fn().mockResolvedValue(cachedResponse);

    // Use global caches.match which is used in static asset handler
    const globalCachesMock = {
      ...mockCacheStorage,
      match: jest.fn().mockResolvedValue(cachedResponse),
    };
    (global as Record<string, unknown>).caches = globalCachesMock;

    loadServiceWorker();

    const respondWithFn = jest.fn();
    fireEvent("fetch", {
      request: new Request("https://axiomid.app/"),
      respondWith: respondWithFn,
    });

    const response = await respondWithFn.mock.calls[0][0];

    expect(response).toBe(cachedResponse);
  });

  it("fetches from network for static assets when not cached", async () => {
    // No cached response
    const globalCachesMock = {
      ...mockCacheStorage,
      match: jest.fn().mockResolvedValue(undefined),
    };
    (global as Record<string, unknown>).caches = globalCachesMock;

    const networkResponse = new Response("<html>", { status: 200 });
    (global as Record<string, unknown>).fetch = jest.fn().mockResolvedValue(networkResponse);

    loadServiceWorker();

    const respondWithFn = jest.fn();
    fireEvent("fetch", {
      request: new Request("https://axiomid.app/"),
      respondWith: respondWithFn,
    });

    const response = await respondWithFn.mock.calls[0][0];

    expect(global.fetch).toHaveBeenCalled();
    expect(response).toBe(networkResponse);
  });
});
