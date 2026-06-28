import type { AxiomSDK } from "../client";
import {
  createAxiomIDMastraTools,
  type MastraToolDefinition,
} from "../integrations/mastra";

type CapturedTool<TInput, TOutput> = MastraToolDefinition<TInput, TOutput>;

const didDocument = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: "did:axiom:alice",
  verificationMethod: [],
  authentication: [],
};

const trustScore = {
  did: "did:axiom:alice",
  score: 88,
  tier: "Sovereign",
};

const passport = {
  username: "alice",
  walletAddress: "GD5XABC",
  stellarAddress: "GA456DEF",
  did: "did:axiom:alice",
  tier: "Sovereign",
  xp: 1000,
  trustScore: 88,
  kyaStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  stamps: [],
  issuedDate: "2026-01-01T00:00:00.000Z",
  agentName: "alice-agent",
  agentStatus: "ACTIVE",
  agentPublicKey: "z6MkAlice",
};

const schemas = {
  verifyDidInput: { name: "verifyDidInput" },
  soulGateInput: { name: "soulGateInput" },
  attestationDraftInput: { name: "attestationDraftInput" },
  objectOutput: { name: "objectOutput" },
};

function createMockSdk(): AxiomSDK {
  return {
    resolveDID: jest.fn().mockResolvedValue(didDocument),
    getTrustScore: jest.fn().mockResolvedValue(trustScore),
    verifyPassport: jest.fn().mockResolvedValue(passport),
  } as unknown as AxiomSDK;
}

describe("createAxiomIDMastraTools", () => {
  it("registers the Mastra tool set with stable AxiomID tool ids", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);

    const tools = createAxiomIDMastraTools({ sdk, createTool, schemas });

    expect(Object.keys(tools)).toEqual([
      "verifyDid",
      "enforceSoulGate",
      "createAttestationDraft",
    ]);
    expect(createTool).toHaveBeenCalledTimes(3);
    expect(tools.verifyDid.id).toBe("axiomid.verifyDid");
    expect(tools.enforceSoulGate.id).toBe("axiomid.enforceSoulGate");
    expect(tools.createAttestationDraft.id).toBe(
      "axiomid.createAttestationDraft"
    );
    expect(tools.verifyDid.inputSchema).toBe(schemas.verifyDidInput);
    expect(tools.enforceSoulGate.inputSchema).toBe(schemas.soulGateInput);
    expect(tools.createAttestationDraft.inputSchema).toBe(
      schemas.attestationDraftInput
    );
  });

  it("hydrates DID, trust, passport, and Soul Gate context", async () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDMastraTools({ sdk, createTool, schemas });
    const verifyDid = tools.verifyDid as CapturedTool<
      { did: string; passportSlug?: string; purpose?: string },
      unknown
    >;

    const result = await verifyDid.execute({
      did: "did:axiom:alice",
      passportSlug: "alice",
      purpose: "delegate research task",
    });

    expect(sdk.resolveDID).toHaveBeenCalledWith("did:axiom:alice");
    expect(sdk.getTrustScore).toHaveBeenCalledWith("did:axiom:alice");
    expect(sdk.verifyPassport).toHaveBeenCalledWith("alice");
    expect(result).toMatchObject({
      did: "did:axiom:alice",
      didDocument,
      trustScore,
      passport,
      soulGate: {
        allowed: true,
        score: 88,
        tier: "Sovereign",
        minimumTrustScore: 50,
      },
    });
  });

  it("blocks Soul Gate decisions when trust score is below threshold", async () => {
    const sdk = createMockSdk();
    jest.spyOn(sdk, "getTrustScore").mockResolvedValue({
      did: "did:axiom:bob",
      score: 35,
      tier: "Citizen",
    });
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDMastraTools({
      sdk,
      createTool,
      schemas,
      minimumTrustScore: 70,
    });
    const soulGate = tools.enforceSoulGate as CapturedTool<
      { did: string; purpose?: string },
      unknown
    >;

    const result = await soulGate.execute({
      did: "did:axiom:bob",
      purpose: "release payment",
    });

    expect(result).toMatchObject({
      did: "did:axiom:bob",
      allowed: false,
      score: 35,
      tier: "Citizen",
      minimumTrustScore: 70,
      purpose: "release payment",
    });
  });

  it("creates deterministic unsigned attestation drafts for host signing", () => {
    const sdk = createMockSdk();
    const createTool = jest.fn((definition) => definition);
    const tools = createAxiomIDMastraTools({
      sdk,
      createTool,
      schemas,
      agentDid: "did:axiom:agent",
      now: () => new Date("2026-06-28T00:00:00.000Z"),
    });
    const attest = tools.createAttestationDraft as CapturedTool<
      { subjectDid: string; claim: string; evidence?: Record<string, unknown> },
      unknown
    >;

    const result = attest.execute({
      subjectDid: "did:axiom:alice",
      claim: "Completed delegated review",
      evidence: { taskId: "review-1" },
    });

    expect(result).toEqual({
      id: "urn:axiomid:attestation:2026-06-28T00:00:00.000Z",
      type: ["VerifiableCredential", "AxiomAgentAttestation"],
      issuer: "did:axiom:agent",
      issuanceDate: "2026-06-28T00:00:00.000Z",
      credentialSubject: {
        id: "did:axiom:alice",
        claim: "Completed delegated review",
        evidence: { taskId: "review-1" },
      },
      status: "unsigned",
      proofPurpose: "agent-attestation-draft",
    });
  });
});
