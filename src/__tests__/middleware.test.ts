/**
 * @jest-environment node
 *
 * Tests for src/middleware.ts — CORS handling, host validation, and preflight (PR changes).
 *
 * PR changes covered:
 * - OPTIONS preflight handler returning 204 with CORS headers
 * - getAllowedOrigin logic (same-origin, explicit allowlist, localhost)
 * - applyCorsHeaders applied to all responses
 * - isAllowedHost: removed .vercel.app wildcard support
 * - CORS_ALLOWED_ORIGINS allowlist introduced
 *
 * NOTE: src/middleware.ts as written in this PR contains a syntax error —
 * a missing closing brace `}` for the inner `if (isSubdomain)` block at line 114.
 * These tests document the intended behavior; they will pass once that bug is fixed.
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Helper to create a mock NextRequest
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    contentLength?: number;
  } = {}
): NextRequest {
  const { method = "GET", headers = {}, contentLength } = options;
  const reqHeaders: Record<string, string> = { ...headers };
  if (contentLength !== undefined) {
    reqHeaders["content-length"] = String(contentLength);
  }
  return new NextRequest(url, { method, headers: reqHeaders });
}

describe("middleware — CORS preflight (PR change: OPTIONS handler)", () => {
  it("responds with 204 for OPTIONS request from allowed origin", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "https://axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).toBe(204);
  });

  it("sets Access-Control-Allow-Origin header for allowed origin in preflight", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "https://axiomid.app" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://axiomid.app");
  });

  it("sets Access-Control-Allow-Methods in preflight response", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS"
    );
  });

  it("sets Access-Control-Allow-Headers in preflight response", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type, Authorization, X-Shared-Secret"
    );
  });

  it("sets Access-Control-Max-Age to 86400 in preflight response", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("does NOT set CORS headers for disallowed origin in preflight", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "OPTIONS",
      headers: { origin: "https://evil.com" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("middleware — CORS headers on normal responses (PR change: applyCorsHeaders)", () => {
  it("applies CORS headers for axiomid.app origin on regular GET", () => {
    const req = makeRequest("https://axiomid.app/dashboard", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "https://axiomid.app" },
    });
    const res = middleware(req);
    // NextResponse.next() with CORS headers applied
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://axiomid.app");
  });

  it("applies CORS headers for localhost:3000 in development", () => {
    const req = makeRequest("http://localhost:3000/dashboard", {
      method: "GET",
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  it("applies CORS headers for explicit allowlist origin (axiomid.vercel.app)", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "https://axiomid.vercel.app" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://axiomid.vercel.app"
    );
  });

  it("does NOT apply CORS headers when origin is absent", () => {
    const req = makeRequest("https://axiomid.app/dashboard", {
      method: "GET",
      headers: { host: "axiomid.app" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("does NOT apply CORS headers for unknown origin", () => {
    const req = makeRequest("https://axiomid.app/dashboard", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "https://attacker.example.com" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("middleware — getAllowedOrigin via CORS behavior (PR change)", () => {
  it("allows subdomains of axiomid.app as origin", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "https://sub.axiomid.app" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://sub.axiomid.app"
    );
  });

  it("allows www.axiomid.app as origin via explicit allowlist", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "https://www.axiomid.app" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://www.axiomid.app"
    );
  });

  it("allows localhost:3001 via explicit allowlist", () => {
    const req = makeRequest("http://localhost:3001/api/test", {
      method: "GET",
      headers: { host: "localhost:3001", origin: "http://localhost:3001" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3001"
    );
  });

  it("rejects invalid origin string gracefully (no CORS header set)", () => {
    const req = makeRequest("https://axiomid.app/dashboard", {
      method: "GET",
      headers: { host: "axiomid.app", origin: "not-a-valid-url" },
    });
    const res = middleware(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("middleware — isAllowedHost (PR change: removed vercel.app wildcard)", () => {
  it("returns 403 for disallowed host", () => {
    const req = makeRequest("https://evil.com/api/test", {
      headers: { host: "evil.com" },
    });
    const res = middleware(req);
    expect(res.status).toBe(403);
  });

  it("allows localhost host", () => {
    const req = makeRequest("http://localhost:3000/dashboard", {
      headers: { host: "localhost:3000" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows axiomid.app host", () => {
    const req = makeRequest("https://axiomid.app/dashboard", {
      headers: { host: "axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("allows subdomains of axiomid.app", () => {
    const req = makeRequest("https://alice.axiomid.app/profile", {
      headers: { host: "alice.axiomid.app" },
    });
    // Subdomains may trigger rewrite logic, but should not return 403
    const res = middleware(req);
    expect(res.status).not.toBe(403);
  });

  it("rejects random vercel.app host that includes 'axiomid' in name (PR change: removed vercel wildcard)", () => {
    // In the old code, 'axiomid.vercel.app' as a HOST was allowed.
    // In the new code, the wildcard .vercel.app host check was removed.
    const req = makeRequest("https://axiomid.vercel.app/dashboard", {
      headers: { host: "axiomid.vercel.app" },
    });
    const res = middleware(req);
    expect(res.status).toBe(403);
  });
});

describe("middleware — request body size limit", () => {
  it("returns 413 when content-length exceeds 1MB", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "POST",
      headers: { host: "axiomid.app" },
      contentLength: 1024 * 1024 + 1,
    });
    const res = middleware(req);
    expect(res.status).toBe(413);
  });

  it("allows requests exactly at 1MB content-length", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "POST",
      headers: { host: "axiomid.app" },
      contentLength: 1024 * 1024,
    });
    const res = middleware(req);
    expect(res.status).not.toBe(413);
  });

  it("allows requests with no content-length header", () => {
    const req = makeRequest("https://axiomid.app/api/test", {
      method: "POST",
      headers: { host: "axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).not.toBe(413);
  });
});

describe("middleware — well-known DID rewrite", () => {
  it("rewrites /.well-known/did.json to /api/did-document", () => {
    const req = makeRequest("https://axiomid.app/.well-known/did.json", {
      headers: { host: "axiomid.app" },
    });
    const res = middleware(req);
    // NextResponse.rewrite returns a 200 (the rewritten response)
    // We can verify the response isn't an error
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(413);
  });
});

describe("middleware — invalid subdomain rejection", () => {
  it("returns 400 for subdomain with invalid characters", () => {
    const req = makeRequest("https://_invalid_.axiomid.app/profile", {
      headers: { host: "_invalid_.axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for subdomain with leading hyphen", () => {
    const req = makeRequest("https://-bad.axiomid.app/profile", {
      headers: { host: "-bad.axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for subdomain with trailing hyphen", () => {
    const req = makeRequest("https://bad-.axiomid.app/profile", {
      headers: { host: "bad-.axiomid.app" },
    });
    const res = middleware(req);
    expect(res.status).toBe(400);
  });
});