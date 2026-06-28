import type { AxiomSDK } from "../client";
import { AxiomAgentBootstrap } from "../integrations/agent-bootstrap";
import {
  createAxiomIDCrewAITools,
  type CrewAIToolDefinition,
} from "../integrations/crewai";

type CapturedTool<TInput, TOutput> = CrewAIToolDefinition<TInput, TOutput>;

const didDocument = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: "did:axiom:operator",
  verificationMethod: [],
  authentication: [],
};

const trustScore = {
  did: "did:axiom:operator",
  score: 82,
  tier: "Sovereign",
};

const passport = {
  username: "operator",
  walletAddress: "GD5TABC",
  stellarAddress: "GA123DEF",
  did: "did:axiom:operator",
  tier: "Sovereign",
  xp: 1200,
  trustScore: 82,
  kyaStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  stamps: [],
  issuedDate: "2026-01-01T00:00:00.000Z",
  agentName: null,
  agentStatus: null,
  agentPublicKey: null,
};

function createMockSdk(score = 82): AxiomSDK {
  return {
    resolveDID: jest.fn().mockResolvedValue(didDocument),
    getTrustScore: jest.fn().mockResolvedValue({ ...trustScore, score }),
    verifyPassport: jest
      .fn()
      .mockResolvedValue({ ...passport, trustScore: score }),
    getStamps: jest.fn(),
    searchSkills: jest.fn(),
  } as unknown as AxiomSDK;
}

describe("createAxiomIDCrewAITools", () => {
  it("registers stable CrewAI tool names", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);

    const tools = createAxiomIDCrewAITools({ sdk, createTool });

    expect(Object.keys(tools)).toEqual([
      "verifyIdentity",
      "enforceSoulGate",
      "createAttestationDraft",
    ]);
    expect(createTool).toHaveBeenCalledTimes(3);
    expect(createTool.mock.calls.map(([definition]) => definition.name)).toEqual([
      "axiomid_verify_identity",
      "axiomid_enforce_soul_gate",
      "axiomid_create_attestation_draft",
    ]);
  });

  it("creates identity context for a CrewAI task", async () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const now = () => new Date("2026-06-28T00:00:00.000Z");
    const tools = createAxiomIDCrewAITools({
      sdk,
      createTool,
      agentDid: "did:axiom:crewai-agent",
      now,
    });
    const verifyIdentity = tools.verifyIdentity as CapturedTool<
      { did: string; passportSlug?: string; purpose?: string },
      unknown
    >;

    const context = await verifyIdentity.run({
      did: "did:axiom:operator",
      passportSlug: "operator",
      purpose: "CrewAI task bootstrap",
    });

    expect(context).toEqual({
      did: "did:axiom:operator",
      didDocument,
      trustScore,
      passport,
      agentDid: "did:axiom:crewai-agent",
      purpose: "CrewAI task bootstrap",
      createdAt: "2026-06-28T00:00:00.000Z",
    });
    expect(sdk.resolveDID).toHaveBeenCalledWith("did:axiom:operator");
    expect(sdk.getTrustScore).not.toHaveBeenCalled();
    expect(sdk.verifyPassport).toHaveBeenCalledWith("operator");
  });

  it("denies Soul Gate when trust score is below the CrewAI task threshold", async () => {
    const sdk = createMockSdk(41);
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({
      sdk,
      createTool,
      minimumTrustScore: 70,
    });
    const soulGate = tools.enforceSoulGate as CapturedTool<
      { did: string; minimumTrustScore?: number },
      unknown
    >;

    const result = await soulGate.run({ did: "did:axiom:operator" });

    expect(result).toMatchObject({
      allowed: false,
      minimumTrustScore: 70,
      reason: "Trust score 41 is below required minimum 70",
    });
  });

  it("allows per-task trust thresholds to override the default", async () => {
    const sdk = createMockSdk(60);
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({
      sdk,
      createTool,
      minimumTrustScore: 70,
    });
    const soulGate = tools.enforceSoulGate as CapturedTool<
      { did: string; minimumTrustScore?: number },
      unknown
    >;

    const result = await soulGate.run({
      did: "did:axiom:operator",
      minimumTrustScore: 55,
    });

    expect(result).toMatchObject({
      allowed: true,
      minimumTrustScore: 55,
    });
  });

  it("defaults Soul Gate to a zero threshold when none is configured", async () => {
    const sdk = createMockSdk(0);
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const soulGate = tools.enforceSoulGate as CapturedTool<
      { did: string; minimumTrustScore?: number },
      unknown
    >;

    const result = await soulGate.run({ did: "did:axiom:operator" });

    expect(result).toMatchObject({
      allowed: true,
      minimumTrustScore: 0,
    });
  });

  it("uses passport-derived trust context for Soul Gate when passportSlug is provided", async () => {
    const sdk = createMockSdk(64);
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({
      sdk,
      createTool,
      minimumTrustScore: 70,
    });
    const soulGate = tools.enforceSoulGate as CapturedTool<
      { did: string; passportSlug?: string },
      unknown
    >;

    const result = await soulGate.run({
      did: "did:axiom:operator",
      passportSlug: "operator",
    });

    expect(result).toMatchObject({
      allowed: false,
      minimumTrustScore: 70,
      reason: "Trust score 64 is below required minimum 70",
    });
    expect(sdk.getTrustScore).not.toHaveBeenCalled();
    expect(sdk.verifyPassport).toHaveBeenCalledWith("operator");
  });

  it("rejects passport DID mismatches before returning agent context", async () => {
    const sdk = createMockSdk();
    jest.mocked(sdk.verifyPassport).mockResolvedValueOnce({
      ...passport,
      did: "did:axiom:different-operator",
    });
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const verifyIdentity = tools.verifyIdentity as CapturedTool<
      { did: string; passportSlug?: string },
      unknown
    >;

    await expect(
      verifyIdentity.run({
        did: "did:axiom:operator",
        passportSlug: "operator",
      })
    ).rejects.toThrow(
      "Passport DID did:axiom:different-operator does not match requested DID did:axiom:operator"
    );
  });

  it("creates unsigned attestation drafts from CrewAI task output", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const now = () => new Date("2026-06-28T00:01:00.000Z");
    const tools = createAxiomIDCrewAITools({
      sdk,
      createTool,
      agentDid: "did:axiom:crewai-agent",
      now,
    });
    const createAttestationDraft = tools.createAttestationDraft as CapturedTool<
      {
        subjectDid: string;
        claim: string;
        evidence?: Record<string, unknown>;
      },
      unknown
    >;

    const draft = createAttestationDraft.run({
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
      evidence: { taskId: "research-42" },
    });

    expect(draft).toEqual({
      type: "AxiomIDAttestationDraft",
      issuerDid: "did:axiom:crewai-agent",
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
      evidence: { taskId: "research-42" },
      issuedAt: "2026-06-28T00:01:00.000Z",
    });
  });

  it("allows a CrewAI task to provide an explicit attestation issuer DID", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const createAttestationDraft = tools.createAttestationDraft as CapturedTool<
      {
        subjectDid: string;
        claim: string;
        issuerDid: string;
      },
      unknown
    >;

    const draft = createAttestationDraft.run({
      issuerDid: "did:axiom:crew-manager",
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
    });

    expect(draft).toMatchObject({
      issuerDid: "did:axiom:crew-manager",
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
    });
  });

  it("treats null optional fields from LLM tool calls as omitted", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const createAttestationDraft =
      tools.createAttestationDraft as CapturedTool<unknown, unknown>;

    const draft = createAttestationDraft.run({
      issuerDid: "did:axiom:crew-manager",
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
      purpose: null,
      evidence: null,
    });

    expect(draft).toMatchObject({
      issuerDid: "did:axiom:crew-manager",
      subjectDid: "did:axiom:operator",
      claim: "CrewAI task completed",
      evidence: {},
    });
  });

  it("fails fast when CrewAI passes malformed tool input", async () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const verifyIdentity = tools.verifyIdentity as CapturedTool<unknown, unknown>;
    const createAttestationDraft =
      tools.createAttestationDraft as CapturedTool<unknown, unknown>;

    await expect(verifyIdentity.run({ did: "" })).rejects.toThrow(
      "did must be a non-empty string"
    );
    expect(() =>
      createAttestationDraft.run({
        subjectDid: "did:axiom:operator",
        claim: "CrewAI task completed",
        evidence: "bad-evidence",
      })
    ).toThrow("evidence must be an object");
    expect(() =>
      createAttestationDraft.run({
        subjectDid: "did:axiom:operator",
        claim: "CrewAI task completed",
        issuerDid: "",
      })
    ).toThrow("issuerDid must be a non-empty string");
    expect(sdk.resolveDID).not.toHaveBeenCalled();
  });

  it("rejects empty issuer DIDs for direct bootstrap calls", () => {
    const sdk = createMockSdk();
    const bootstrap = new AxiomAgentBootstrap({
      sdk,
      agentDid: "did:axiom:crewai-agent",
    });

    expect(() =>
      bootstrap.createAttestationDraft({
        issuerDid: "",
        subjectDid: "did:axiom:operator",
        claim: "CrewAI task completed",
      })
    ).toThrow("issuerDid must be a non-empty string");
  });

  it("propagates SDK/API failures to the CrewAI host", async () => {
    const sdk = createMockSdk();
    jest
      .mocked(sdk.resolveDID)
      .mockRejectedValueOnce(new Error("DID endpoint unavailable"));
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDCrewAITools({ sdk, createTool });
    const verifyIdentity = tools.verifyIdentity as CapturedTool<
      { did: string },
      unknown
    >;

    await expect(
      verifyIdentity.run({ did: "did:axiom:operator" })
    ).rejects.toThrow("DID endpoint unavailable");
  });
});
