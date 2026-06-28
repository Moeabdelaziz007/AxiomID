import type { AxiomSDK } from "../client";
import {
  AxiomIDAutoGenGateError,
  createAxiomIDAutoGenAdapter,
  createAxiomIDAutoGenToolDefinitions,
} from "../integrations/autogen";

const didDocument = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: "did:axiom:agent:alice",
  verificationMethod: [],
  authentication: [],
};

const trustScore = {
  did: "did:axiom:agent:alice",
  score: 82,
  tier: "Sovereign",
};

const lowTrustScore = {
  did: "did:axiom:agent:alice",
  score: 35,
  tier: "Observer",
};

const passport = {
  username: "alice",
  walletAddress: "GD5XABC",
  stellarAddress: "GA456DEF",
  did: "did:axiom:agent:alice",
  tier: "Sovereign",
  xp: 1000,
  trustScore: 82,
  kyaStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  stamps: [],
  issuedDate: "2026-01-01T00:00:00.000Z",
  agentName: "alice-agent",
  agentStatus: "ACTIVE",
  agentPublicKey: "z6MkAlice",
};

function createMockSdk(score = trustScore): AxiomSDK {
  return {
    resolveDID: jest.fn().mockResolvedValue(didDocument),
    getTrustScore: jest.fn().mockResolvedValue(score),
    verifyPassport: jest.fn().mockResolvedValue(passport),
  } as unknown as AxiomSDK;
}

describe("createAxiomIDAutoGenAdapter", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("bootstraps DID, trust, passport, system message, and tool context", async () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({
      sdk,
      agentDid: "did:axiom:agent:reviewer",
      minimumTrustScore: 70,
    });

    const context = await adapter.bootstrapAgent({
      did: "did:axiom:agent:alice",
      passportSlug: "alice",
      purpose: "Review a delegated pull request",
      metadata: { threadId: "task-123" },
    });

    expect(sdk.resolveDID).toHaveBeenCalledWith("did:axiom:agent:alice");
    expect(sdk.getTrustScore).toHaveBeenCalledWith("did:axiom:agent:alice");
    expect(sdk.verifyPassport).toHaveBeenCalledWith("alice");
    expect(context).toMatchObject({
      framework: "autogen",
      did: "did:axiom:agent:alice",
      didDocument,
      trustScore,
      passport,
      soulGate: {
        allowed: true,
        score: 82,
        minimumTrustScore: 70,
        purpose: "Review a delegated pull request",
      },
      metadata: { threadId: "task-123" },
    });
    expect(context.systemMessage).toContain("AxiomID identity context");
    expect(context.systemMessage).toContain("did:axiom:agent:alice");
    expect(context.toolContext).toMatchObject({
      framework: "autogen",
      did: "did:axiom:agent:alice",
      trust: { score: 82, tier: "Sovereign" },
      passport: {
        username: "alice",
        tier: "Sovereign",
        kyaStatus: "VERIFIED",
        kycStatus: "VERIFIED",
      },
    });
    expect((context.toolContext as { soulGate: unknown }).soulGate).toEqual(
      context.soulGate
    );
    expect((context.toolContext as { soulGate: unknown }).soulGate).not.toBe(
      context.soulGate
    );
  });

  it("validates adapter options before creating tools", () => {
    expect(() =>
      createAxiomIDAutoGenAdapter(
        undefined as unknown as Parameters<typeof createAxiomIDAutoGenAdapter>[0]
      )
    ).toThrow("options.sdk is required");

    expect(() =>
      createAxiomIDAutoGenAdapter({
        sdk: {
          resolveDID: jest.fn(),
          getTrustScore: jest.fn(),
        },
      } as unknown as Parameters<typeof createAxiomIDAutoGenAdapter>[0])
    ).toThrow("options.sdk must implement resolveDID, getTrustScore, and verifyPassport");
  });

  it("throws a gate error when requireSoulGate sees a low trust score", async () => {
    const sdk = createMockSdk(lowTrustScore);
    const adapter = createAxiomIDAutoGenAdapter({
      sdk,
      minimumTrustScore: 60,
    });

    await expect(
      adapter.requireSoulGate({
        did: "did:axiom:agent:alice",
        purpose: "Run sensitive AutoGen task",
      })
    ).rejects.toMatchObject({
      name: "AxiomIDAutoGenGateError",
      decision: {
        allowed: false,
        score: 35,
        minimumTrustScore: 60,
      },
    });
  });

  it("returns denied Soul Gate context without throwing from bootstrapAgent", async () => {
    const sdk = createMockSdk(lowTrustScore);
    const adapter = createAxiomIDAutoGenAdapter({ sdk });

    const context = await adapter.bootstrapAgent({
      did: "did:axiom:agent:alice",
      minimumTrustScore: 50,
    });

    expect(sdk.verifyPassport).not.toHaveBeenCalled();
    expect(context.soulGate).toMatchObject({
      allowed: false,
      score: 35,
      minimumTrustScore: 50,
    });
    expect(context.systemMessage).toContain("Soul Gate: denied");
  });

  it("rejects missing bootstrap input and mismatched passports", async () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({ sdk });

    await expect(
      adapter.bootstrapAgent(
        undefined as unknown as Parameters<typeof adapter.bootstrapAgent>[0]
      )
    ).rejects.toThrow("input is required");

    const mismatchSdk = createMockSdk({ ...trustScore, score: 95 });
    (mismatchSdk.verifyPassport as jest.Mock).mockResolvedValue({
      ...passport,
      did: "did:axiom:agent:bob",
    });
    const mismatchAdapter = createAxiomIDAutoGenAdapter({ sdk: mismatchSdk });

    await expect(
      mismatchAdapter.bootstrapAgent({
        did: "did:axiom:agent:alice",
        passportSlug: " alice ",
      })
    ).rejects.toThrow("passportSlug does not belong to the requested did");
    expect(mismatchSdk.verifyPassport).toHaveBeenCalledWith("alice");
  });

  it("creates unsigned AutoGen attestation drafts with stable issuer defaults", () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({
      sdk,
      agentDid: "did:axiom:agent:issuer",
      defaultPurpose: "AutoGen task completion",
      now: () => new Date("2026-06-28T00:00:00.000Z"),
    });

    const draft = adapter.createAttestationDraft({
      subjectDid: "did:axiom:agent:alice",
      claim: "AutoGen agent completed a gated research task",
      evidence: { taskId: "task-123", score: 82 },
    });

    expect(draft).toEqual({
      type: "AxiomIDAttestationDraft",
      issuerDid: "did:axiom:agent:issuer",
      subjectDid: "did:axiom:agent:alice",
      claim: "AutoGen agent completed a gated research task",
      evidence: { taskId: "task-123", score: 82 },
      issuedAt: "2026-06-28T00:00:00.000Z",
      expiresAt: undefined,
      unsigned: true,
      framework: "autogen",
      purpose: "AutoGen task completion",
    });
  });

  it("builds a system message from a context seed", () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({ sdk });

    const message = adapter.buildSystemMessage({
      framework: "autogen",
      did: "did:axiom:agent:alice",
      didDocument,
      trustScore,
      soulGate: {
        allowed: true,
        score: 82,
        minimumTrustScore: 60,
        reason: "Trust score 82 meets minimum 60",
        purpose: "Prepare delegated work",
      },
      metadata: { taskId: "task-123" },
    });

    expect(message).toContain("did:axiom:agent:alice");
    expect(message).toContain("Trust: 82 (Sovereign)");
    expect(message).toContain("Purpose: Prepare delegated work");
  });

  it("normalizes valid attestation expirations and rejects malformed ones", () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({
      sdk,
      agentDid: "did:axiom:agent:issuer",
      now: () => new Date("2026-06-28T00:00:00.000Z"),
    });

    const draft = adapter.createAttestationDraft({
      subjectDid: "did:axiom:agent:alice",
      claim: "AutoGen task completed",
      expiresAt: "2026-06-29T12:30:00+0200",
    });

    expect(draft.expiresAt).toBe("2026-06-29T10:30:00.000Z");
    expect(() =>
      adapter.createAttestationDraft({
        subjectDid: "did:axiom:agent:alice",
        claim: "AutoGen task completed",
        expiresAt: "2026-06-27T23:59:59Z",
      })
    ).toThrow("expiresAt must be later than issuedAt");
    expect(() =>
      adapter.createAttestationDraft({
        subjectDid: "did:axiom:agent:alice",
        claim: "AutoGen task completed",
        expiresAt: "2026-06-29",
      })
    ).toThrow("expiresAt must be a valid ISO-8601 date-time timestamp");
  });

  it("exposes AutoGen function tool definitions that delegate to the adapter", async () => {
    const sdk = createMockSdk();
    const tools = createAxiomIDAutoGenToolDefinitions({
      sdk,
      agentDid: "did:axiom:agent:issuer",
    });

    expect(Object.keys(tools)).toEqual([
      "bootstrapIdentity",
      "enforceSoulGate",
      "createAttestationDraft",
    ]);
    expect(tools.bootstrapIdentity.name).toBe("axiomid_bootstrap_identity");
    expect(tools.enforceSoulGate.name).toBe("axiomid_enforce_soul_gate");
    expect(tools.createAttestationDraft.name).toBe(
      "axiomid_create_attestation_draft"
    );
    expect(tools.bootstrapIdentity.parameters).toMatchObject({
      type: "object",
      required: ["did"],
    });

    const context = await tools.bootstrapIdentity.run({
      did: "did:axiom:agent:alice",
    });
    expect(context.did).toBe("did:axiom:agent:alice");

    const draft = await tools.createAttestationDraft.run({
      subjectDid: "did:axiom:agent:alice",
      claim: "AutoGen task completed",
    });
    expect(draft.issuerDid).toBe("did:axiom:agent:issuer");

    await expect(
      tools.enforceSoulGate.run({
        did: "did:axiom:agent:alice",
        minimumTrustScore: 90,
      })
    ).rejects.toMatchObject({
      name: "AxiomIDAutoGenGateError",
      decision: {
        allowed: false,
        score: 82,
        minimumTrustScore: 90,
      },
    });
  });

  it("validates required fields before creating attestation drafts", () => {
    const sdk = createMockSdk();
    const adapter = createAxiomIDAutoGenAdapter({ sdk });

    expect(() =>
      adapter.createAttestationDraft(
        undefined as unknown as Parameters<typeof adapter.createAttestationDraft>[0]
      )
    ).toThrow("input is required");

    expect(() =>
      adapter.createAttestationDraft({
        subjectDid: "did:axiom:agent:alice",
        claim: "AutoGen task completed",
      })
    ).toThrow("issuerDid is required");

    expect(() =>
      adapter.createAttestationDraft({
        issuerDid: "did:axiom:agent:issuer",
        subjectDid: "",
        claim: "AutoGen task completed",
      })
    ).toThrow("subjectDid is required");
  });

  it("propagates SDK failures from DID resolution", async () => {
    const sdk = {
      resolveDID: jest.fn().mockRejectedValue(new Error("DID not found")),
      getTrustScore: jest.fn().mockResolvedValue(trustScore),
      verifyPassport: jest.fn().mockResolvedValue(passport),
    } as unknown as AxiomSDK;
    const adapter = createAxiomIDAutoGenAdapter({ sdk });

    await expect(
      adapter.bootstrapAgent({ did: "did:axiom:missing" })
    ).rejects.toThrow("DID not found");
  });

  it("exposes the gate decision on AxiomIDAutoGenGateError", () => {
    const error = new AxiomIDAutoGenGateError({
      allowed: false,
      score: 1,
      minimumTrustScore: 90,
      reason: "Trust score 1 is below minimum 90",
      purpose: "test",
    });

    expect(error.name).toBe("AxiomIDAutoGenGateError");
    expect(error.decision.score).toBe(1);
  });
});
