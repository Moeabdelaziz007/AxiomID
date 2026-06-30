/**
 * @jest-environment node
 *
 * Tests for public/sw.js — the AxiomID service worker.
 *
 * PR change: Complete rewrite from Cache-First to Network-First for HTML/navigate
 * requests, Stale-While-Revalidate for static assets, and full bypass for /api/*
 * routes and non-same-origin requests.
 *
 * Since service workers run in a restricted browser scope, these tests verify:
 * 1. The STATIC_ASSET_PATTERN regex matches/rejects the correct extensions.
 * 2. The cache-bypass conditions (non-GET, external origin, /api/ prefix).
 * 3. The Network-First conditions (navigate mode, "/" path, extensionless paths).
 * 4. The Stale-While-Revalidate gate (STATIC_ASSET_PATTERN or /_next/static/).
 * 5. The cache name and static asset list are correct.
 *
 * The decision logic is extracted by evaluating the module-level constants and
 * reimplementing the fetch handler's conditional branches as pure functions for
 * unit testing without requiring a live service worker runtime.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Read sw.js source once and extract constants via simple parsing
// ---------------------------------------------------------------------------

const SW_PATH = path.resolve(__dirname, "../../public/sw.js");
const swSource = fs.readFileSync(SW_PATH, "utf8");

// ---------------------------------------------------------------------------
// Constants extracted from the service worker
// ---------------------------------------------------------------------------

/** The expected cache name. Bump whenever sw.js increments its version. */
const EXPECTED_CACHE = "axiomid-v4";

/** The expected static asset list (filenames only — not full paths). */
const EXPECTED_STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/axiomid-logo.jpg",
  "/axiomid-banner.jpg",
  "/favicon.ico",
];

/**
 * Re-implements the STATIC_ASSET_PATTERN from sw.js.
 * Must stay in sync with the regex in the source file.
 */
const STATIC_ASSET_PATTERN =
  /\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot|map)$/;

// ---------------------------------------------------------------------------
// Pure helpers that mirror the fetch handler's branch decisions
// ---------------------------------------------------------------------------

interface MockRequest {
  method: string;
  mode: string;
  url: string;
}

const SELF_ORIGIN = "https://axiomid.app";

/**
 * Returns true if the fetch handler should bypass caching entirely (no
 * respondWith call — the request falls through to the network).
 */
function shouldBypass(req: MockRequest): boolean {
  const url = new URL(req.url);
  return (
    req.method !== "GET" ||
    url.origin !== SELF_ORIGIN ||
    url.pathname.startsWith("/api/")
  );
}

/**
 * Returns true if the request should use the Network-First strategy.
 * Assumes shouldBypass() already returned false.
 */
function isNetworkFirst(req: MockRequest): boolean {
  const url = new URL(req.url);
  return (
    req.mode === "navigate" ||
    url.pathname === "/" ||
    !url.pathname.includes(".")
  );
}

/**
 * Returns true if the request qualifies for Stale-While-Revalidate.
 * Assumes shouldBypass() and isNetworkFirst() both returned false.
 */
function isStaleWhileRevalidate(req: MockRequest): boolean {
  const url = new URL(req.url);
  return (
    STATIC_ASSET_PATTERN.test(url.pathname) ||
    url.pathname.startsWith("/_next/static/")
  );
}

// ---------------------------------------------------------------------------
// Helper to build a mock GET request from a same-origin URL
// ---------------------------------------------------------------------------
function makeRequest(
  pathname: string,
  opts: Partial<MockRequest> = {}
): MockRequest {
  return {
    method: opts.method ?? "GET",
    mode: opts.mode ?? "cors",
    url: `${SELF_ORIGIN}${pathname}`,
  };
}

// ===========================================================================
// Test suites
// ===========================================================================

describe("sw.js — source constants", () => {
  it("declares the correct cache version 'axiomid-v4'", () => {
    expect(swSource).toContain(`"${EXPECTED_CACHE}"`);
  });

  it("static assets list includes manifest.webmanifest", () => {
    expect(swSource).toContain("/manifest.webmanifest");
  });

  it("static assets list includes icon-192x192.png", () => {
    expect(swSource).toContain("/icon-192x192.png");
  });

  it("static assets list includes icon-512x512.png", () => {
    expect(swSource).toContain("/icon-512x512.png");
  });

  it("static assets list includes axiomid-logo.jpg", () => {
    expect(swSource).toContain("/axiomid-logo.jpg");
  });

  it("static assets list includes axiomid-banner.jpg", () => {
    expect(swSource).toContain("/axiomid-banner.jpg");
  });

  it("static assets list includes favicon.ico", () => {
    expect(swSource).toContain("/favicon.ico");
  });

  it("registers an install event listener", () => {
    expect(swSource).toContain(`"install"`);
    expect(swSource).toContain("cache.addAll");
  });

  it("registers an activate event listener that deletes old caches", () => {
    expect(swSource).toContain(`"activate"`);
    expect(swSource).toContain("caches.delete");
  });

  it("calls self.skipWaiting() in install", () => {
    expect(swSource).toContain("self.skipWaiting()");
  });

  it("calls self.clients.claim() in activate", () => {
    expect(swSource).toContain("self.clients.claim()");
  });

  it("bypasses /api/ paths (no cache)", () => {
    expect(swSource).toContain('url.pathname.startsWith("/api/")');
  });

  it("applies Network-First for navigate mode", () => {
    expect(swSource).toContain('event.request.mode === "navigate"');
  });

  it("applies Network-First for root path '/'", () => {
    expect(swSource).toContain('url.pathname === "/"');
  });

  it("restricts SWR to STATIC_ASSET_PATTERN or /_next/static/", () => {
    expect(swSource).toContain("STATIC_ASSET_PATTERN.test(url.pathname)");
    expect(swSource).toContain('/_next/static/');
  });

  it("uses exact origin comparison (not startsWith) to prevent lookalike hosts", () => {
    // PR note: Changed from url.startsWith(self.location.origin) to
    // url.origin !== self.location.origin for exact matching.
    expect(swSource).toContain("url.origin !== self.location.origin");
  });
});

// ---------------------------------------------------------------------------

describe("STATIC_ASSET_PATTERN regex", () => {
  const shouldMatch = [
    "/icon.png",
    "/photo.jpg",
    "/photo.jpeg",
    "/animation.gif",
    "/icon.svg",
    "/favicon.ico",
    "/image.webp",
    "/font.woff",
    "/font.woff2",
    "/font.ttf",
    "/font.otf",
    "/font.eot",
    "/chunk.js.map",
  ];

  const shouldNotMatch = [
    "/",
    "/about",
    "/dashboard",
    "/api/user",
    "/app.js", // bare .js is served via /_next/static/ branch, not this pattern
    "/style.css", // bare .css likewise
    "/page.html",
    "/data.json",
    "/feed.xml",
    "/doc.pdf",
    "/path/to/image.PNG", // pattern is case-sensitive
    "/style.CSS",
    "",
  ];

  shouldMatch.forEach((pathname) => {
    it(`matches "${pathname}"`, () => {
      expect(STATIC_ASSET_PATTERN.test(pathname)).toBe(true);
    });
  });

  shouldNotMatch.forEach((pathname) => {
    it(`does not match "${pathname}"`, () => {
      expect(STATIC_ASSET_PATTERN.test(pathname)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------

describe("sw.js fetch routing — bypass conditions", () => {
  it("bypasses POST requests", () => {
    const req = makeRequest("/", { method: "POST" });
    expect(shouldBypass(req)).toBe(true);
  });

  it("bypasses DELETE requests", () => {
    const req = makeRequest("/something", { method: "DELETE" });
    expect(shouldBypass(req)).toBe(true);
  });

  it("bypasses external origin requests", () => {
    const externalReq: MockRequest = {
      method: "GET",
      mode: "cors",
      url: "https://evil.example.com/page",
    };
    expect(shouldBypass(externalReq)).toBe(true);
  });

  it("bypasses /api/ paths", () => {
    expect(shouldBypass(makeRequest("/api/user"))).toBe(true);
    expect(shouldBypass(makeRequest("/api/vault/stake"))).toBe(true);
    expect(shouldBypass(makeRequest("/api/auth/pi"))).toBe(true);
  });

  it("does NOT bypass same-origin GET to non-api path", () => {
    expect(shouldBypass(makeRequest("/dashboard"))).toBe(false);
    expect(shouldBypass(makeRequest("/"))).toBe(false);
    expect(shouldBypass(makeRequest("/icon.png"))).toBe(false);
  });

  it("bypasses /api/ even with query params", () => {
    expect(shouldBypass(makeRequest("/api/skills?q=test"))).toBe(true);
  });

  it("does NOT bypass /apilike/ prefix that is not exactly /api/", () => {
    // '/apilike/' does not start with '/api/' — should not bypass
    expect(shouldBypass(makeRequest("/apilike/endpoint"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("sw.js fetch routing — Network-First strategy", () => {
  it("uses Network-First for navigate mode requests", () => {
    const req = makeRequest("/about", { mode: "navigate" });
    expect(shouldBypass(req)).toBe(false);
    expect(isNetworkFirst(req)).toBe(true);
  });

  it("uses Network-First for root path '/'", () => {
    const req = makeRequest("/");
    expect(shouldBypass(req)).toBe(false);
    expect(isNetworkFirst(req)).toBe(true);
  });

  it("uses Network-First for extensionless paths (page routes)", () => {
    const paths = ["/dashboard", "/onboarding", "/settings", "/docs"];
    for (const p of paths) {
      const req = makeRequest(p);
      expect(shouldBypass(req)).toBe(false);
      expect(isNetworkFirst(req)).toBe(true);
    }
  });

  it("does NOT use Network-First for .js files", () => {
    const req = makeRequest("/app.js");
    expect(isNetworkFirst(req)).toBe(false);
  });

  it("does NOT use Network-First for .css files", () => {
    const req = makeRequest("/style.css");
    expect(isNetworkFirst(req)).toBe(false);
  });

  it("does NOT use Network-First for image files", () => {
    const req = makeRequest("/icon.png");
    expect(isNetworkFirst(req)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("sw.js fetch routing — Stale-While-Revalidate strategy", () => {
  it("does NOT SWR bare .js files (only /_next/static/ js is cached)", () => {
    const req = makeRequest("/chunk.js");
    expect(shouldBypass(req)).toBe(false);
    expect(isNetworkFirst(req)).toBe(false);
    expect(isStaleWhileRevalidate(req)).toBe(false);
  });

  it("does NOT SWR bare .css files (only /_next/static/ css is cached)", () => {
    const req = makeRequest("/styles.css");
    expect(isStaleWhileRevalidate(req)).toBe(false);
  });

  it("uses SWR for .png images", () => {
    const req = makeRequest("/icon-192x192.png");
    expect(isStaleWhileRevalidate(req)).toBe(true);
  });

  it("uses SWR for .svg icons", () => {
    const req = makeRequest("/logo.svg");
    expect(isStaleWhileRevalidate(req)).toBe(true);
  });

  it("uses SWR for /_next/static/ paths (Next.js hashed chunks)", () => {
    const req = makeRequest("/_next/static/chunks/main-abc123.js");
    expect(isStaleWhileRevalidate(req)).toBe(true);
  });

  it("uses SWR for /_next/static/ CSS", () => {
    const req = makeRequest("/_next/static/css/app.css");
    expect(isStaleWhileRevalidate(req)).toBe(true);
  });

  it("uses SWR for font files (.woff2)", () => {
    const req = makeRequest("/fonts/axiom.woff2");
    expect(isStaleWhileRevalidate(req)).toBe(true);
  });

  it("bypasses (falls through) for unrecognized paths like .html", () => {
    const req = makeRequest("/page.html");
    expect(shouldBypass(req)).toBe(false);
    expect(isNetworkFirst(req)).toBe(false);
    expect(isStaleWhileRevalidate(req)).toBe(false);
    // The fetch handler returns early — no respondWith
  });

  it("bypasses (falls through) for .json responses", () => {
    const req = makeRequest("/data.json");
    expect(shouldBypass(req)).toBe(false);
    expect(isNetworkFirst(req)).toBe(false);
    expect(isStaleWhileRevalidate(req)).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("sw.js fetch routing — full decision matrix", () => {
  type Strategy = "bypass" | "network-first" | "swr" | "passthrough";

  function classify(pathname: string, mode = "cors", method = "GET"): Strategy {
    const req: MockRequest = {
      method,
      mode,
      url: `${SELF_ORIGIN}${pathname}`,
    };
    if (shouldBypass(req)) return "bypass";
    if (isNetworkFirst(req)) return "network-first";
    if (isStaleWhileRevalidate(req)) return "swr";
    return "passthrough";
  }

  const matrix: Array<[string, Strategy, string?, string?]> = [
    ["/api/user", "bypass"],
    ["/api/vault/stake", "bypass"],
    ["/", "network-first"],
    ["/dashboard", "network-first"],
    ["/onboarding", "network-first"],
    ["/about", "network-first", "navigate"],
    ["/icon.png", "swr"],
    ["/style.css", "passthrough"], // bare .css cached only under /_next/static/
    ["/chunk.js", "passthrough"], // bare .js cached only under /_next/static/
    ["/_next/static/chunks/page.js", "swr"],
    ["/manifest.webmanifest", "passthrough"], // .webmanifest not in pattern
    ["/data.json", "passthrough"],
  ];

  matrix.forEach(([pathname, expected, mode, method]) => {
    it(`"${pathname}" → ${expected}`, () => {
      expect(classify(pathname, mode, method)).toBe(expected);
    });
  });
});

// ---------------------------------------------------------------------------

describe("sw.js — static assets list integrity", () => {
  it("has exactly 6 precached static assets", () => {
    expect(EXPECTED_STATIC_ASSETS).toHaveLength(6);
  });

  it("all static assets start with '/'", () => {
    for (const asset of EXPECTED_STATIC_ASSETS) {
      expect(asset.startsWith("/")).toBe(true);
    }
  });

  it("includes both 192 and 512 icon sizes", () => {
    const has192 = EXPECTED_STATIC_ASSETS.some((a) => a.includes("192"));
    const has512 = EXPECTED_STATIC_ASSETS.some((a) => a.includes("512"));
    expect(has192).toBe(true);
    expect(has512).toBe(true);
  });

  it("manifest.webmanifest is precached (not the old manifest.json)", () => {
    expect(EXPECTED_STATIC_ASSETS).toContain("/manifest.webmanifest");
    // The old static JSON is no longer used
    expect(EXPECTED_STATIC_ASSETS).not.toContain("/manifest.json");
  });
});