/**
 * @jest-environment node
 */

jest.mock("@/lib/jwks", () => ({
  exportJwks: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { NextRequest } from "next/server";
import { GET as getJwks } from "@/app/.well-known/jwks.json/route";
import { GET as getOauthProtectedResource } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as getOauthAuthorizationServer } from "@/app/.well-known/oauth-authorization-server/route";
import { exportJwks } from "@/lib/jwks";

const mockExportJwks = exportJwks as jest.Mock;

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// ─── JWKS Endpoint ───────────────────────────────────────────────────────────

describe("GET /.well-known/jwks.json", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportJwks.mockReturnValue({
      keys: [
        {
          kty: "OKP",
          crv: "Ed25519",
          x: "abc123base64url",
          kid: "did:axiom:axiomid.app:pi:test#key-1",
          alg: "EdDSA",
          use: "sig",
        },
      ],
    });
  });

  it("returns 200 with JWKS payload", async () => {
    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    const res = await getJwks(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("keys");
    expect(Array.isArray(data.keys)).toBe(true);
  });

  it("calls exportJwks with wildcard '*'", async () => {
    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    await getJwks(req);

    expect(mockExportJwks).toHaveBeenCalledWith("*");
  });

  it("includes Cache-Control header", async () => {
    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    const res = await getJwks(req);

    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
  });

  it("returns correct JWK structure in keys array", async () => {
    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    const res = await getJwks(req);
    const data = await res.json();

    expect(data.keys[0]).toMatchObject({
      kty: "OKP",
      crv: "Ed25519",
      alg: "EdDSA",
      use: "sig",
    });
  });

  it("returns 500 when exportJwks throws", async () => {
    mockExportJwks.mockImplementation(() => {
      throw new Error("Key derivation failed");
    });

    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    const res = await getJwks(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.code).toBe("INTERNAL_ERROR");
  });

  it("returns empty keys array when no DIDs are known", async () => {
    mockExportJwks.mockReturnValue({ keys: [] });

    const req = makeGetRequest("http://localhost/.well-known/jwks.json");
    const res = await getJwks(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.keys).toHaveLength(0);
  });
});

// ─── OAuth Protected Resource Metadata ───────────────────────────────────────

describe("GET /.well-known/oauth-protected-resource", () => {
  it("returns 200", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);

    expect(res.status).toBe(200);
  });

  it("returns correct resource field", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);
    const data = await res.json();

    expect(data.resource).toBe("https://axiomid.app");
  });

  it("returns authorization_servers array containing axiomid.app", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);
    const data = await res.json();

    expect(Array.isArray(data.authorization_servers)).toBe(true);
    expect(data.authorization_servers).toContain("https://axiomid.app");
  });

  it("returns all supported scopes", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);
    const data = await res.json();

    expect(data.scopes_supported).toContain("api.read");
    expect(data.scopes_supported).toContain("api.write");
    expect(data.scopes_supported).toContain("agent.sign");
  });

  it("returns bearer_methods_supported", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);
    const data = await res.json();

    expect(data.bearer_methods_supported).toContain("header");
  });

  it("includes Cache-Control header", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-protected-resource");
    const res = await getOauthProtectedResource(req);

    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
  });
});

// ─── OAuth Authorization Server Metadata ─────────────────────────────────────

describe("GET /.well-known/oauth-authorization-server", () => {
  it("returns 200", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);

    expect(res.status).toBe(200);
  });

  it("returns correct issuer", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.issuer).toBe("https://axiomid.app");
  });

  it("returns correct token_endpoint", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.token_endpoint).toBe("https://axiomid.app/api/oauth2/token");
  });

  it("returns correct revocation_endpoint", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.revocation_endpoint).toBe("https://axiomid.app/api/oauth2/revoke");
  });

  it("returns correct jwks_uri", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.jwks_uri).toBe("https://axiomid.app/.well-known/jwks.json");
  });

  it("returns both supported grant types", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.grant_types_supported).toContain("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(data.grant_types_supported).toContain("claim");
  });

  it("returns all supported scopes", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.scopes_supported).toContain("api.read");
    expect(data.scopes_supported).toContain("api.write");
    expect(data.scopes_supported).toContain("agent.sign");
  });

  it("includes agent_auth block with required fields", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.agent_auth).toBeDefined();
    expect(data.agent_auth.type).toBe("oidc");
    expect(Array.isArray(data.agent_auth.claims_supported)).toBe(true);
    expect(data.agent_auth.claims_supported).toContain("sub");
    expect(data.agent_auth.claims_supported).toContain("iss");
    expect(data.agent_auth.claims_supported).toContain("exp");
  });

  it("includes authorization_endpoint", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);
    const data = await res.json();

    expect(data.authorization_endpoint).toBe("https://axiomid.app/api/agent/identity");
  });

  it("includes Cache-Control header", async () => {
    const req = makeGetRequest("http://localhost/.well-known/oauth-authorization-server");
    const res = await getOauthAuthorizationServer(req);

    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
  });
});