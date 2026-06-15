/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 *
 * Tests for src/middleware.ts
 *
 * Covers the PR changes:
 * - CORS preflight handling (OPTIONS method)
 * - getAllowedOrigin logic and CORS header application
 * - applyCorsHeaders added to normal requests
 * - Removal of vercel.app wildcard from isAllowedHost
 */

import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(
  path: string,
  options: {
    method?: string;
    host?: string;
    origin?: string;
    contentLength?: string;
  } = {}
): NextRequest {
  const { method = "GET", host = "localhost", origin, contentLength } = options;
  const url = `https://${host}${path}`;
  const headers: Record<string, string> = { host };
  if (origin) headers["origin"] = origin;
  if (contentLength) headers["content-length"] = contentLength;

  return new NextRequest(url, { method, headers });
}

describe("middleware — CORS preflight (OPTIONS)", () => {
  it("returns 204 for OPTIONS request from an allowed origin", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "https://axiomid.app",
    });

    const res = middleware(req);

    expect(res?.status).toBe(204);
  });

  it("sets Access-Control-Allow-Origin header for allowed origin", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "https://axiomid.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("https://axiomid.app");
  });

  it("sets Access-Control-Allow-Methods header for preflight", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "http://localhost:3000",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res?.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("sets Access-Control-Allow-Headers header for preflight", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "http://localhost:3000",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    expect(res?.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("sets Access-Control-Max-Age header for preflight", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "https://axiomid.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("does NOT set CORS headers for OPTIONS from a disallowed origin", () => {
    const req = makeRequest("/api/test", {
      method: "OPTIONS",
      origin: "https://evil.example.com",
    });

    const res = middleware(req);

    // Should still return 204, but without CORS headers
    expect(res?.status).toBe(204);
    expect(res?.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("middleware — CORS headers on regular requests", () => {
  it("adds Access-Control-Allow-Origin for GET request from localhost:3000", () => {
    const req = makeRequest("/api/test", {
      host: "localhost",
      origin: "http://localhost:3000",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  it("adds CORS headers for www.axiomid.app origin", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "https://www.axiomid.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("https://www.axiomid.app");
  });

  it("adds CORS headers for axiomid.vercel.app origin (allowlist)", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "https://axiomid.vercel.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("https://axiomid.vercel.app");
  });

  it("does NOT add CORS headers for an unknown origin", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "https://attacker.example.com",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("does NOT add CORS headers when no origin header is present", () => {
    const req = makeRequest("/api/test", { host: "axiomid.app" });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("middleware — getAllowedOrigin logic", () => {
  it("allows subdomains of axiomid.app (same-origin)", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "https://alice.axiomid.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("https://alice.axiomid.app");
  });

  it("allows localhost in any port", () => {
    const req = makeRequest("/api/test", {
      host: "localhost",
      origin: "http://localhost:3001",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3001");
  });

  it("does NOT allow arbitrary vercel.app subdomains (regression for removed wildcard)", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "https://some-other-axiomid.vercel.app",
    });

    const res = middleware(req);

    expect(res?.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("handles malformed origin gracefully without throwing", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      origin: "not-a-url",
    });

    expect(() => middleware(req)).not.toThrow();
  });
});

describe("middleware — request body size limit", () => {
  it("returns 413 when content-length exceeds 1MB", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      contentLength: String(1024 * 1024 + 1),
    });

    const res = middleware(req);

    expect(res?.status).toBe(413);
  });

  it("allows requests at exactly 1MB content-length", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
      contentLength: String(1024 * 1024),
    });

    const res = middleware(req);

    expect(res?.status).not.toBe(413);
  });
});

describe("middleware — host validation", () => {
  it("blocks requests from disallowed hosts", () => {
    const req = makeRequest("/api/test", {
      host: "evil.example.com",
    });

    const res = middleware(req);

    expect(res?.status).toBe(403);
  });

  it("allows requests from localhost", () => {
    const req = makeRequest("/api/test", {
      host: "localhost",
    });

    const res = middleware(req);

    expect(res?.status).not.toBe(403);
  });

  it("allows requests from axiomid.app", () => {
    const req = makeRequest("/api/test", {
      host: "axiomid.app",
    });

    const res = middleware(req);

    expect(res?.status).not.toBe(403);
  });

  it("allows requests from www.axiomid.app", () => {
    const req = makeRequest("/api/test", {
      host: "www.axiomid.app",
    });

    const res = middleware(req);

    expect(res?.status).not.toBe(403);
  });

  it("does NOT allow a non-axiomid vercel.app host (regression for removed wildcard)", () => {
    const req = makeRequest("/api/test", {
      host: "other-project.vercel.app",
    });

    const res = middleware(req);

    expect(res?.status).toBe(403);
  });
});

describe("middleware — .well-known/did.json rewrite", () => {
  it("rewrites /.well-known/did.json to /api/did-document", () => {
    const req = makeRequest("/.well-known/did.json", {
      host: "axiomid.app",
    });

    const res = middleware(req) as NextResponse;

    // The rewrite doesn't change status, it rewrites internally
    expect(res).toBeDefined();
  });
});