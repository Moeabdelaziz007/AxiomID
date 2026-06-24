import { AxiomSDK, AxiomIDError } from "../client";

const mockPassport = {
  username: "pioneer.username",
  walletAddress: "GD5TABC",
  stellarAddress: "GA123DEF",
  did: "did:axiom:pioneer.username",
  tier: "Sovereign",
  xp: 1250,
  trustScore: 98,
  kyaStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  stamps: [
    { type: "KYC_BOUND", provider: "pi" },
    { type: "WALLET_AGE", provider: "stellar" },
  ],
  issuedDate: "2026-01-01T00:00:00.000Z",
  agentName: "MyAgent",
  agentStatus: "ACTIVE",
  agentPublicKey: "z6Mk...",
};

const mockDID = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: "did:axiom:pioneer.username",
  verificationMethod: [
    {
      id: "did:axiom:pioneer.username#keys-1",
      type: "Ed25519VerificationKey2020",
      controller: "did:axiom:pioneer.username",
      publicKeyMultibase: "z6Mk...",
    },
  ],
  authentication: ["did:axiom:pioneer.username#keys-1"],
};

const mockTrustScore = {
  did: "did:axiom:pioneer.username",
  score: 98,
  tier: "Sovereign",
  breakdown: {
    kyc: 100,
    walletAge: 90,
    socialRecovery: 85,
    agentActivity: 95,
  },
};

const mockSkillsResponse = {
  skills: [
    {
      id: "skill-1",
      slug: "research-bot",
      name: "ResearchBot",
      description: "Automated research agent",
      tier: "PRO",
      pricePi: 5,
      version: "1.0.0",
      installCount: 42,
      avgRating: 4.5,
      ratingCount: 10,
      authorId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
  hasMore: false,
};

describe("@axiomid/sdk", () => {
  let sdk: AxiomSDK;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    sdk = new AxiomSDK({ network: "mainnet" });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("constructor", () => {
    it("uses mainnet URL by default", () => {
      const s = new AxiomSDK({ network: "mainnet" });
      expect(s).toBeDefined();
    });

    it("uses testnet URL", () => {
      const s = new AxiomSDK({ network: "testnet" });
      expect(s).toBeDefined();
    });

    it("accepts custom baseUrl", () => {
      const s = new AxiomSDK({ network: "mainnet", baseUrl: "http://localhost:3000" });
      expect(s).toBeDefined();
    });
  });

  describe("verifyPassport", () => {
    it("returns a passport for a valid slug", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPassport,
      });

      const passport = await sdk.verifyPassport("pioneer.username");
      expect(passport.username).toBe("pioneer.username");
      expect(passport.trustScore).toBe(98);
      expect(passport.tier).toBe("Sovereign");
      expect(passport.stamps).toHaveLength(2);
      expect(passport.agentStatus).toBe("ACTIVE");
    });

    it("throws AxiomIDError on 404", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Passport not found" }),
      });

      await expect(sdk.verifyPassport("nonexistent")).rejects.toThrow(AxiomIDError);
    });

    it("passes Authorization header when apiKey is set", async () => {
      const authedSdk = new AxiomSDK({ network: "mainnet", apiKey: "test-key" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPassport,
      });

      await authedSdk.verifyPassport("pioneer.username");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );
    });

    it("omits Authorization header when no apiKey", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPassport,
      });

      await sdk.verifyPassport("pioneer.username");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });
  });

  describe("getStamps", () => {
    it("parses stamps from passport", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPassport,
      });

      const stamps = await sdk.getStamps("pioneer.username");
      expect(stamps.kycBound.verified).toBe(true);
      expect(stamps.walletAge.verified).toBe(true);
    });

    it("returns unverified stamps when passport has none", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockPassport, stamps: [] }),
      });

      const stamps = await sdk.getStamps("pioneer.username");
      expect(stamps.kycBound.verified).toBe(false);
      expect(stamps.walletAge.verified).toBe(false);
    });
  });

  describe("resolveDID", () => {
    it("returns a DID document", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDID,
      });

      const did = await sdk.resolveDID("did:axiom:pioneer.username");
      expect(did.id).toBe("did:axiom:pioneer.username");
      expect(did.verificationMethod).toHaveLength(1);
      expect(did.verificationMethod[0].publicKeyMultibase).toBe("z6Mk...");
    });
  });

  describe("getTrustScore", () => {
    it("returns a trust score", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrustScore,
      });

      const score = await sdk.getTrustScore("did:axiom:pioneer.username");
      expect(score.score).toBe(98);
      expect(score.tier).toBe("Sovereign");
      expect(score.breakdown.kyc).toBe(100);
    });
  });

  describe("searchSkills", () => {
    it("returns matching skills", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSkillsResponse,
      });

      const skills = await sdk.searchSkills("research");
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe("ResearchBot");
    });
  });

  describe("error handling", () => {
    it("AxiomIDError has code and status", () => {
      const err = new AxiomIDError("test", "HTTP_500", 500);
      expect(err.code).toBe("HTTP_500");
      expect(err.status).toBe(500);
      expect(err.name).toBe("AxiomIDError");
    });
  });
});
