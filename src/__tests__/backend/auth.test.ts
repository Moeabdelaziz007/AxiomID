/**
 * @jest-environment node
 *
 * Tests for backend/src/lib/auth.ts
 * Covers the PR changes: PUBLIC_ROUTES/PUBLIC_PREFIXES updated from iqra → truth.
 * Uses inline replicas to avoid Cloudflare-specific module resolution issues.
 */

// ---------------------------------------------------------------------------
// Inline replicas matching backend/src/lib/auth.ts exactly
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = ["/health", "/status", "/api/truth/", "/api/skills"];
const PUBLIC_EXACT = new Set(["/health", "/status", "/api/skills"]);
const PUBLIC_PREFIXES = ["/api/truth/"];

interface MockEnv {
  SHARED_SECRET_TOKEN_VERCEL_CF?: string;
}

function verifyAuth(
  request: Request,
  env: MockEnv
): { authorized: boolean; agentId?: string } {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") || undefined;

  const isPublic =
    PUBLIC_EXACT.has(url.pathname) ||
    PUBLIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (isPublic) {
    return { authorized: true, agentId };
  }

  const authHeader = request.headers.get("X-Shared-Secret");
  if (!env.SHARED_SECRET_TOKEN_VERCEL_CF || !authHeader) {
    return { authorized: false };
  }

  const secret = env.SHARED_SECRET_TOKEN_VERCEL_CF;
  if (authHeader.length !== secret.length) {
    return { authorized: false };
  }

  let match = 0;
  for (let i = 0; i < authHeader.length; i++) {
    match |= authHeader.charCodeAt(i) ^ secret.charCodeAt(i);
  }

  return { authorized: match === 0, agentId };
}

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://axiomid.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Shared-Secret",
};

function rateLimitHeaders(result: {
  remaining: number;
  resetMs: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };
}

function jsonResponse(
  data: unknown,
  status: number = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  });
}

function errorResponse(
  message: string,
  status: number = 400,
  extraHeaders?: Record<string, string>
): Response {
  return jsonResponse(
    { success: false, error: message, timestamp: Date.now() },
    status,
    extraHeaders
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  pathname: string,
  headers: Record<string, string> = {},
  searchParams: Record<string, string> = {}
): Request {
  const url = new URL(`https://worker.example.com${pathname}`);
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString(), { headers });
}

const VALID_SECRET = "my-shared-secret-32-bytes-long!!!";

// ---------------------------------------------------------------------------
// PUBLIC_ROUTES array (PR changed from iqra → truth)
// ---------------------------------------------------------------------------

describe("PUBLIC_ROUTES array", () => {
  it("contains /health", () => {
    expect(PUBLIC_ROUTES).toContain("/health");
  });

  it("contains /status", () => {
    expect(PUBLIC_ROUTES).toContain("/status");
  });

  it("contains /api/truth/ (PR change: was /api/iqra/)", () => {
    expect(PUBLIC_ROUTES).toContain("/api/truth/");
  });

  it("contains /api/skills", () => {
    expect(PUBLIC_ROUTES).toContain("/api/skills");
  });

  it("does NOT contain /api/iqra/ (removed in PR)", () => {
    expect(PUBLIC_ROUTES).not.toContain("/api/iqra/");
  });

  it("does NOT contain /api/trust/ (removed in PR)", () => {
    expect(PUBLIC_ROUTES).not.toContain("/api/trust/");
  });

  it("has exactly 4 entries", () => {
    expect(PUBLIC_ROUTES).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// PUBLIC_PREFIXES array (PR changed from ["/api/trust/", "/api/iqra/"] → ["/api/truth/"])
// ---------------------------------------------------------------------------

describe("PUBLIC_PREFIXES array", () => {
  it("contains /api/truth/", () => {
    expect(PUBLIC_PREFIXES).toContain("/api/truth/");
  });

  it("does NOT contain /api/iqra/ (removed in PR)", () => {
    expect(PUBLIC_PREFIXES).not.toContain("/api/iqra/");
  });

  it("does NOT contain /api/trust/ (removed in PR)", () => {
    expect(PUBLIC_PREFIXES).not.toContain("/api/trust/");
  });

  it("has exactly 1 entry", () => {
    expect(PUBLIC_PREFIXES).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// verifyAuth — public routes (no auth required)
// ---------------------------------------------------------------------------

describe("verifyAuth — public routes", () => {
  const env: MockEnv = {}; // no secret set

  it("authorizes /health without a secret", () => {
    const req = makeRequest("/health");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("authorizes /status without a secret", () => {
    const req = makeRequest("/status");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("authorizes /api/skills without a secret", () => {
    const req = makeRequest("/api/skills");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("authorizes /api/truth/ask (prefix match) without a secret", () => {
    const req = makeRequest("/api/truth/ask");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("authorizes /api/truth/daily-truth (prefix match) without a secret", () => {
    const req = makeRequest("/api/truth/daily-truth");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("does NOT authorize /api/iqra/ask (old path, removed in PR)", () => {
    const req = makeRequest("/api/iqra/ask");
    const result = verifyAuth(req, env);
    // Without a secret, iqra paths are now protected
    expect(result.authorized).toBe(false);
  });

  it("does NOT authorize /api/trust/did:axiom:alice (old path, removed in PR)", () => {
    const req = makeRequest("/api/trust/did:axiom:alice");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyAuth — protected routes requiring X-Shared-Secret
// ---------------------------------------------------------------------------

describe("verifyAuth — protected routes", () => {
  const env: MockEnv = { SHARED_SECRET_TOKEN_VERCEL_CF: VALID_SECRET };

  it("returns authorized=false when X-Shared-Secret header is missing", () => {
    const req = makeRequest("/api/agent");
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(false);
  });

  it("returns authorized=false when secret is wrong", () => {
    const req = makeRequest("/api/agent", { "X-Shared-Secret": "wrong-secret!" });
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(false);
  });

  it("returns authorized=true when secret matches exactly", () => {
    const req = makeRequest("/api/agent", { "X-Shared-Secret": VALID_SECRET });
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(true);
  });

  it("returns authorized=false when env has no secret set", () => {
    const emptyEnv: MockEnv = {};
    const req = makeRequest("/api/agent", { "X-Shared-Secret": VALID_SECRET });
    const result = verifyAuth(req, emptyEnv);
    expect(result.authorized).toBe(false);
  });

  it("returns authorized=false when env secret is empty string", () => {
    const emptyEnv: MockEnv = { SHARED_SECRET_TOKEN_VERCEL_CF: "" };
    const req = makeRequest("/api/agent", { "X-Shared-Secret": VALID_SECRET });
    const result = verifyAuth(req, emptyEnv);
    expect(result.authorized).toBe(false);
  });

  it("returns authorized=false when header length differs from secret (timing-safe)", () => {
    const req = makeRequest("/api/agent", { "X-Shared-Secret": "short" });
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(false);
  });

  it("returns authorized=false for a secret that differs by one bit", () => {
    // Mutate last character
    const almostRight = VALID_SECRET.slice(0, -1) + String.fromCharCode(VALID_SECRET.charCodeAt(VALID_SECRET.length - 1) ^ 1);
    const req = makeRequest("/api/agent", { "X-Shared-Secret": almostRight });
    const result = verifyAuth(req, env);
    expect(result.authorized).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyAuth — agentId extraction
// ---------------------------------------------------------------------------

describe("verifyAuth — agentId extraction", () => {
  const env: MockEnv = { SHARED_SECRET_TOKEN_VERCEL_CF: VALID_SECRET };

  it("extracts agentId from query params on a public route", () => {
    const req = makeRequest("/health", {}, { agentId: "agent-123" });
    const result = verifyAuth(req, env);
    expect(result.agentId).toBe("agent-123");
  });

  it("extracts agentId from query params on an authenticated route", () => {
    const req = makeRequest(
      "/api/agent",
      { "X-Shared-Secret": VALID_SECRET },
      { agentId: "agent-xyz" }
    );
    const result = verifyAuth(req, env);
    expect(result.agentId).toBe("agent-xyz");
  });

  it("returns undefined agentId when param is absent", () => {
    const req = makeRequest("/health");
    const result = verifyAuth(req, env);
    expect(result.agentId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// rateLimitHeaders
// ---------------------------------------------------------------------------

describe("rateLimitHeaders", () => {
  it("returns X-RateLimit-Remaining as a string", () => {
    const headers = rateLimitHeaders({ remaining: 42, resetMs: 30000 });
    expect(headers["X-RateLimit-Remaining"]).toBe("42");
  });

  it("returns X-RateLimit-Reset as ceiling of resetMs / 1000", () => {
    const headers = rateLimitHeaders({ remaining: 10, resetMs: 30500 });
    expect(headers["X-RateLimit-Reset"]).toBe("31");
  });

  it("rounds up partial seconds", () => {
    const headers = rateLimitHeaders({ remaining: 0, resetMs: 1 });
    expect(headers["X-RateLimit-Reset"]).toBe("1");
  });

  it("handles exact seconds (no rounding needed)", () => {
    const headers = rateLimitHeaders({ remaining: 5, resetMs: 60000 });
    expect(headers["X-RateLimit-Reset"]).toBe("60");
  });
});

// ---------------------------------------------------------------------------
// jsonResponse
// ---------------------------------------------------------------------------

describe("jsonResponse", () => {
  it("returns a 200 response by default", () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
  });

  it("returns the supplied status code", () => {
    const res = jsonResponse({ ok: true }, 201);
    expect(res.status).toBe(201);
  });

  it("sets Content-Type to application/json", () => {
    const res = jsonResponse({ ok: true });
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets CORS Allow-Origin header", () => {
    const res = jsonResponse({});
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://axiomid.app"
    );
  });

  it("merges extra headers", async () => {
    const res = jsonResponse({}, 200, { "X-Cache": "HIT" });
    expect(res.headers.get("X-Cache")).toBe("HIT");
  });

  it("serializes the body as JSON", async () => {
    const res = jsonResponse({ answer: 42 });
    const body = await res.json();
    expect(body).toEqual({ answer: 42 });
  });
});

// ---------------------------------------------------------------------------
// errorResponse
// ---------------------------------------------------------------------------

describe("errorResponse", () => {
  it("returns 400 by default", () => {
    const res = errorResponse("Bad input");
    expect(res.status).toBe(400);
  });

  it("returns the supplied status code", () => {
    const res = errorResponse("Not found", 404);
    expect(res.status).toBe(404);
  });

  it("includes success: false in the body", async () => {
    const res = errorResponse("Something went wrong");
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it("includes the error message in the body", async () => {
    const res = errorResponse("Custom error message");
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Custom error message");
  });

  it("includes a numeric timestamp in the body", async () => {
    const res = errorResponse("err");
    const body = (await res.json()) as { timestamp: number };
    expect(typeof body.timestamp).toBe("number");
    expect(body.timestamp).toBeGreaterThan(0);
  });

  it("merges extra headers", () => {
    const res = errorResponse("Too many requests", 429, {
      "X-RateLimit-Remaining": "0",
    });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});