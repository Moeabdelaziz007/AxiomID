/**
 * Additional unit tests for packages/sdk/src/client.ts
 *
 * These tests extend coverage beyond the baseline sdk.test.ts, focusing on:
 *  - Exact URL construction and encoding for every public method
 *  - Network-level fetch failures
 *  - JSON parse error on a successful HTTP response
 *  - Error-body fallback paths (missing "error" key, res.json() throws)
 *  - Custom baseUrl and testnet base URL propagation
 *  - Accept header on every request
 *  - getStamps provider details, unknown stamp types
 *  - AxiomIDError as an Error subclass with correct message
 *  - HTTP errors surfaced by resolveDID, getTrustScore, and searchSkills
 *  - Boundary / regression cases
 */

import { AxiomSDK, AxiomIDError } from "../client";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MAINNET_BASE = "https://axiomid.app";
const TESTNET_BASE = "https://testnet.axiomid.app";

const basePassport = {
  username: "alice",
  walletAddress: "GD5XABC",
  stellarAddress: "GA456DEF",
  did: "did:axiom:alice",
  tier: "Pioneer",
  xp: 100,
  trustScore: 70,
  kyaStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  stamps: [] as { type: string; provider: string }[],
  issuedDate: "2026-01-01T00:00:00.000Z",
  agentName: null as string | null,
  agentStatus: null as string | null,
  agentPublicKey: null as string | null,
};

function mockOk(body: unknown) {
  return { ok: true, status: 200, statusText: "OK", json: async () => body };
}

function mockErr(status: number, statusText: string, body?: unknown) {
  return {
    ok: false,
    status,
    statusText,
    json: async () => (body !== undefined ? body : { error: `HTTP ${status}` }),
  };
}

// ---------------------------------------------------------------------------
// AxiomIDError
// ---------------------------------------------------------------------------

describe("AxiomIDError", () => {
  it("is an instance of Error", () => {
    const err = new AxiomIDError("oops", "SOME_CODE", 503);
    expect(err).toBeInstanceOf(Error);
  });

  it("carries the supplied message", () => {
    const err = new AxiomIDError("something went wrong", "NETWORK_ERR", 0);
    expect(err.message).toBe("something went wrong");
  });

  it("sets name to AxiomIDError", () => {
    const err = new AxiomIDError("msg", "CODE", 400);
    expect(err.name).toBe("AxiomIDError");
  });

  it("stores code and status as readonly properties", () => {
    const err = new AxiomIDError("msg", "HTTP_403", 403);
    expect(err.code).toBe("HTTP_403");
    expect(err.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – URL construction
// ---------------------------------------------------------------------------

describe("AxiomSDK – URL construction", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("verifyPassport", () => {
    it("calls the mainnet base URL with correct path", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.verifyPassport("alice");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/passport/alice`,
        expect.any(Object)
      );
    });

    it("calls the testnet base URL with correct path", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
      const sdk = new AxiomSDK({ network: "testnet" });

      await sdk.verifyPassport("alice");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${TESTNET_BASE}/api/passport/alice`,
        expect.any(Object)
      );
    });

    it("uses custom baseUrl when provided", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
      const sdk = new AxiomSDK({
        network: "mainnet",
        baseUrl: "http://localhost:4000",
      });

      await sdk.verifyPassport("alice");

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:4000/api/passport/alice",
        expect.any(Object)
      );
    });

    it("URL-encodes a slug that contains special characters", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.verifyPassport("alice/bob");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/passport/alice%2Fbob`,
        expect.any(Object)
      );
    });
  });

  describe("resolveDID", () => {
    const mockDID = {
      "@context": "https://www.w3.org/ns/did/v1",
      id: "did:axiom:alice",
      verificationMethod: [],
      authentication: [],
    };

    it("calls the correct endpoint with encoded DID", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(mockDID));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.resolveDID("did:axiom:alice");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/did-document?did=did%3Aaxiom%3Aalice`,
        expect.any(Object)
      );
    });

    it("URL-encodes DIDs with special characters", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(mockDID));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.resolveDID("did:axiom:alice+bob");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/did-document?did=did%3Aaxiom%3Aalice%2Bbob`,
        expect.any(Object)
      );
    });
  });

  describe("getTrustScore", () => {
    const mockScore = {
      did: "did:axiom:alice",
      score: 75,
      tier: "Pioneer",
      breakdown: { kyc: 80, walletAge: 70, socialRecovery: 60, agentActivity: 90 },
    };

    it("calls the correct endpoint with encoded DID", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk(mockScore));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.getTrustScore("did:axiom:alice");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/trust-score?did=did%3Aaxiom%3Aalice`,
        expect.any(Object)
      );
    });
  });

  describe("searchSkills", () => {
    it("calls the correct endpoint with encoded query", async () => {
      fetchSpy.mockResolvedValueOnce(mockOk({ skills: [] }));
      const sdk = new AxiomSDK({ network: "mainnet" });

      await sdk.searchSkills("hello world");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${MAINNET_BASE}/api/skills?q=hello%20world`,
        expect.any(Object)
      );
    });
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – request headers
// ---------------------------------------------------------------------------

describe("AxiomSDK – request headers", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("always sends Accept: application/json", async () => {
    fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
    const sdk = new AxiomSDK({ network: "mainnet" });

    await sdk.verifyPassport("alice");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    );
  });

  it("sends Accept: application/json even with an apiKey", async () => {
    fetchSpy.mockResolvedValueOnce(mockOk(basePassport));
    const sdk = new AxiomSDK({ network: "mainnet", apiKey: "my-key" });

    await sdk.verifyPassport("alice");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer my-key",
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – error handling paths
// ---------------------------------------------------------------------------

describe("AxiomSDK – error handling", () => {
  let fetchSpy: jest.SpyInstance;
  let sdk: AxiomSDK;

  beforeEach(() => {
    sdk = new AxiomSDK({ network: "mainnet" });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("uses error body 'error' field as the AxiomIDError message", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockErr(404, "Not Found", { error: "Passport not found" })
    );

    let caught: AxiomIDError | undefined;
    try {
      await sdk.verifyPassport("ghost");
    } catch (e) {
      caught = e as AxiomIDError;
    }

    expect(caught).toBeInstanceOf(AxiomIDError);
    expect(caught?.message).toBe("Passport not found");
    expect(caught?.code).toBe("HTTP_404");
    expect(caught?.status).toBe(404);
  });

  it("falls back to statusText when error body has no 'error' field", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ reason: "not allowed" }),
    });

    let caught: AxiomIDError | undefined;
    try {
      await sdk.verifyPassport("alice");
    } catch (e) {
      caught = e as AxiomIDError;
    }

    expect(caught).toBeInstanceOf(AxiomIDError);
    expect(caught?.message).toBe("Forbidden");
    expect(caught?.status).toBe(403);
  });

  it("falls back to statusText when error body res.json() throws", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not JSON");
      },
    });

    let caught: AxiomIDError | undefined;
    try {
      await sdk.verifyPassport("alice");
    } catch (e) {
      caught = e as AxiomIDError;
    }

    expect(caught).toBeInstanceOf(AxiomIDError);
    expect(caught?.message).toBe("Internal Server Error");
    expect(caught?.status).toBe(500);
  });

  it("throws AxiomIDError with PARSE_ERROR code when successful response body is not JSON", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    let caught: AxiomIDError | undefined;
    try {
      await sdk.verifyPassport("alice");
    } catch (e) {
      caught = e as AxiomIDError;
    }

    expect(caught).toBeInstanceOf(AxiomIDError);
    expect(caught?.code).toBe("PARSE_ERROR");
    expect(caught?.message).toBe("Failed to parse JSON response");
    expect(caught?.status).toBe(200);
  });

  it("propagates network-level fetch rejection as a native Error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(sdk.verifyPassport("alice")).rejects.toThrow(
      "Failed to fetch"
    );
  });

  it("throws AxiomIDError on HTTP 401 for resolveDID", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockErr(401, "Unauthorized", { error: "Invalid token" })
    );

    await expect(
      sdk.resolveDID("did:axiom:alice")
    ).rejects.toBeInstanceOf(AxiomIDError);
  });

  it("throws AxiomIDError on HTTP 500 for getTrustScore", async () => {
    fetchSpy.mockResolvedValueOnce(mockErr(500, "Internal Server Error"));

    const err = await sdk
      .getTrustScore("did:axiom:alice")
      .catch((e: AxiomIDError) => e);

    expect(err).toBeInstanceOf(AxiomIDError);
    expect((err as AxiomIDError).code).toBe("HTTP_500");
  });

  it("throws AxiomIDError on HTTP 503 for searchSkills", async () => {
    fetchSpy.mockResolvedValueOnce(mockErr(503, "Service Unavailable"));

    await expect(sdk.searchSkills("bot")).rejects.toBeInstanceOf(AxiomIDError);
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – getStamps
// ---------------------------------------------------------------------------

describe("AxiomSDK – getStamps", () => {
  let fetchSpy: jest.SpyInstance;
  let sdk: AxiomSDK;

  beforeEach(() => {
    sdk = new AxiomSDK({ network: "mainnet" });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("includes provider in kycBound details", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({ ...basePassport, stamps: [{ type: "KYC_BOUND", provider: "pi" }] })
    );

    const stamps = await sdk.getStamps("alice");

    expect(stamps.kycBound.verified).toBe(true);
    expect(stamps.kycBound.details).toEqual({ provider: "pi" });
  });

  it("includes provider in walletAge details", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({
        ...basePassport,
        stamps: [{ type: "WALLET_AGE", provider: "stellar" }],
      })
    );

    const stamps = await sdk.getStamps("alice");

    expect(stamps.walletAge.verified).toBe(true);
    expect(stamps.walletAge.details).toEqual({ provider: "stellar" });
  });

  it("ignores unknown stamp types (kycBound and walletAge remain unverified)", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({
        ...basePassport,
        stamps: [{ type: "SOME_FUTURE_STAMP", provider: "unknown" }],
      })
    );

    const stamps = await sdk.getStamps("alice");

    expect(stamps.kycBound.verified).toBe(false);
    expect(stamps.walletAge.verified).toBe(false);
  });

  it("handles both stamps present with correct providers each", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockOk({
        ...basePassport,
        stamps: [
          { type: "KYC_BOUND", provider: "stripe" },
          { type: "WALLET_AGE", provider: "stellar" },
        ],
      })
    );

    const stamps = await sdk.getStamps("alice");

    expect(stamps.kycBound).toEqual({ verified: true, details: { provider: "stripe" } });
    expect(stamps.walletAge).toEqual({ verified: true, details: { provider: "stellar" } });
  });

  it("stamp type matching is case-insensitive (lowercase variant works)", async () => {
    // The implementation calls stamp.type?.toLowerCase() before comparing,
    // so "kyc_bound" and "wallet_age" (already lower) should match.
    fetchSpy.mockResolvedValueOnce(
      mockOk({
        ...basePassport,
        stamps: [
          { type: "kyc_bound", provider: "test-pi" },
          { type: "wallet_age", provider: "test-stellar" },
        ],
      })
    );

    const stamps = await sdk.getStamps("alice");

    expect(stamps.kycBound.verified).toBe(true);
    expect(stamps.walletAge.verified).toBe(true);
  });

  it("propagates verifyPassport errors", async () => {
    fetchSpy.mockResolvedValueOnce(mockErr(404, "Not Found", { error: "no passport" }));

    await expect(sdk.getStamps("ghost")).rejects.toBeInstanceOf(AxiomIDError);
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – searchSkills boundary
// ---------------------------------------------------------------------------

describe("AxiomSDK – searchSkills", () => {
  let fetchSpy: jest.SpyInstance;
  let sdk: AxiomSDK;

  beforeEach(() => {
    sdk = new AxiomSDK({ network: "mainnet" });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns an empty array when no skills match", async () => {
    fetchSpy.mockResolvedValueOnce(mockOk({ skills: [] }));

    const skills = await sdk.searchSkills("nonexistent");

    expect(skills).toEqual([]);
  });

  it("returns an empty array when the response omits skills", async () => {
    fetchSpy.mockResolvedValueOnce(mockOk({}));

    const skills = await sdk.searchSkills("nonexistent");

    expect(skills).toEqual([]);
  });

  it("returns all skill fields", async () => {
    const skill = {
      id: "skill-1",
      slug: "bot-42",
      name: "Bot42",
      description: "A helper bot",
      tier: "PRO",
      pricePi: 5,
      version: "1.0.0",
      installCount: 42,
      avgRating: 4.5,
      ratingCount: 10,
      authorId: "did:axiom:owner",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    fetchSpy.mockResolvedValueOnce(mockOk({ skills: [skill] }));

    const skills = await sdk.searchSkills("bot");

    expect(skills[0]).toEqual(skill);
  });
});

// ---------------------------------------------------------------------------
// AxiomSDK – verifyPassport null agent fields
// ---------------------------------------------------------------------------

describe("AxiomSDK – verifyPassport with null agent fields", () => {
  let fetchSpy: jest.SpyInstance;
  let sdk: AxiomSDK;

  beforeEach(() => {
    sdk = new AxiomSDK({ network: "mainnet" });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns null for agentName, agentStatus, agentPublicKey when not set", async () => {
    const passportWithNulls = { ...basePassport, stamps: [] };
    fetchSpy.mockResolvedValueOnce(mockOk(passportWithNulls));

    const passport = await sdk.verifyPassport("alice");

    expect(passport.agentName).toBeNull();
    expect(passport.agentStatus).toBeNull();
    expect(passport.agentPublicKey).toBeNull();
  });
});