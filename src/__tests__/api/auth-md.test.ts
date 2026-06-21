/**
 * @jest-environment node
 */

import { GET } from "@/app/auth.md/route";
import { NextRequest } from "next/server";

describe("GET /auth.md", () => {
  it("returns auth.md as text/markdown", async () => {
    const req = new Request("http://localhost/auth.md") as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("AxiomID");
    expect(body).toContain("Agent Verified");
    expect(body).toContain("User Claimed");
  });

  it("includes Cache-Control header with long TTL", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);

    const cacheControl = res.headers.get("cache-control");
    expect(cacheControl).not.toBeNull();
    expect(cacheControl).toContain("s-maxage=86400");
  });

  it("includes stale-while-revalidate in Cache-Control", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);

    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate");
  });

  it("returns charset=utf-8 in content-type", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);

    expect(res.headers.get("content-type")).toContain("charset=utf-8");
  });

  it("documents /api/agent/identity endpoint", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);
    const body = await res.text();

    expect(body).toContain("/api/agent/identity");
  });

  it("documents /api/oauth2/token endpoint", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);
    const body = await res.text();

    expect(body).toContain("/api/oauth2/token");
  });

  it("documents the DID format", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);
    const body = await res.text();

    expect(body).toContain("did:axiom:");
  });

  it("documents supported scopes", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);
    const body = await res.text();

    expect(body).toContain("api.read");
    expect(body).toContain("api.write");
    expect(body).toContain("agent.sign");
  });

  it("returns non-empty content", async () => {
    const req = new NextRequest("http://localhost/auth.md");
    const res = await GET(req);
    const body = await res.text();

    expect(body.length).toBeGreaterThan(100);
  });
});
