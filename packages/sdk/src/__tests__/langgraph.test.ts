import { AxiomIDError } from "../client";
import {
  assertLangGraphSoulGate,
  AxiomLangGraphDelegationStep,
  bootstrapLangGraphAgentContext,
  createAxiomLangGraphNodes,
  streamLangGraphBootstrap,
} from "../langgraph";

const didDocument = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: "did:axiom:pioneer.username",
  verificationMethod: [
    {
      id: "did:axiom:pioneer.username#key-1",
      type: "Ed25519VerificationKey2020",
      controller: "did:axiom:pioneer.username",
      publicKeyMultibase: "z6Mk...",
    },
  ],
  authentication: ["did:axiom:pioneer.username#key-1"],
};

function createMockSdk(score = 88) {
  return {
    resolveDID: jest.fn().mockResolvedValue(didDocument),
    getTrustScore: jest.fn().mockResolvedValue({
      did: "did:axiom:pioneer.username",
      score,
      tier: "Sovereign",
    }),
  };
}

describe("LangGraph integration helpers", () => {
  it("bootstraps DID document, trust score, and an allowed Soul Gate", async () => {
    const sdk = createMockSdk(91);

    const context = await bootstrapLangGraphAgentContext(
      { did: "did:axiom:pioneer.username" },
      { sdk, minimumTrustScore: 80 }
    );

    expect(sdk.resolveDID).toHaveBeenCalledWith("did:axiom:pioneer.username");
    expect(sdk.getTrustScore).toHaveBeenCalledWith("did:axiom:pioneer.username");
    expect(context.didDocument).toEqual(didDocument);
    expect(context.trustScore.score).toBe(91);
    expect(context.gate).toEqual({ allowed: true, minimumTrustScore: 80 });
  });

  it("marks Soul Gate denied when trust score is too low", async () => {
    const context = await bootstrapLangGraphAgentContext(
      { did: "did:axiom:pioneer.username" },
      { sdk: createMockSdk(42), minimumTrustScore: 70 }
    );

    expect(context.gate.allowed).toBe(false);
    expect(context.gate.reason).toContain("below required minimum 70");
  });

  it("rejects invalid Soul Gate thresholds", async () => {
    await expect(
      bootstrapLangGraphAgentContext(
        { did: "did:axiom:pioneer.username" },
        { sdk: createMockSdk(91), minimumTrustScore: Number.NaN }
      )
    ).rejects.toMatchObject({
      code: "LANGGRAPH_TRUST_THRESHOLD_INVALID",
      status: 400,
    });
  });

  it("rejects invalid Soul Gate thresholds when graph nodes are created", () => {
    try {
      createAxiomLangGraphNodes({
        sdk: createMockSdk(91),
        minimumTrustScore: 150,
      });
      throw new Error("Expected invalid LangGraph threshold to throw");
    } catch (err) {
      expect(err).toMatchObject({
        code: "LANGGRAPH_TRUST_THRESHOLD_INVALID",
        status: 400,
      });
    }
  });

  it("throws a typed AxiomIDError when denied context is asserted", async () => {
    const context = await bootstrapLangGraphAgentContext(
      { did: "did:axiom:pioneer.username" },
      { sdk: createMockSdk(10), minimumTrustScore: 70 }
    );

    let caught: AxiomIDError | undefined;
    try {
      assertLangGraphSoulGate(context);
    } catch (err) {
      caught = err as AxiomIDError;
    }

    expect(caught).toBeInstanceOf(AxiomIDError);
    expect(caught?.code).toBe("SOUL_GATE_DENIED");
    expect(caught?.status).toBe(403);
  });

  it("does not throw when an allowed context is asserted", async () => {
    const context = await bootstrapLangGraphAgentContext(
      { did: "did:axiom:pioneer.username" },
      { sdk: createMockSdk(99), minimumTrustScore: 70 }
    );

    expect(() => assertLangGraphSoulGate(context)).not.toThrow();
  });

  it("creates an attestation draft with deterministic time and metadata", async () => {
    const context = await bootstrapLangGraphAgentContext(
      {
        did: "did:axiom:pioneer.username",
        attestationSubjectDid: "did:axiom:delegate",
        metadata: { graph: "kyc-review" },
      },
      {
        sdk: createMockSdk(94),
        includeAttestationDraft: true,
        now: () => new Date("2026-06-28T00:00:00.000Z"),
      }
    );

    expect(context.attestationDraft).toEqual({
      issuerDid: "did:axiom:pioneer.username",
      subjectDid: "did:axiom:delegate",
      type: "AxiomIDLangGraphContext",
      issuedAt: "2026-06-28T00:00:00.000Z",
      evidence: {
        trustScore: 94,
        tier: "Sovereign",
        gateAllowed: true,
      },
      metadata: { graph: "kyc-review" },
    });
  });

  it("does not call now when no attestation draft is requested", async () => {
    const now = jest.fn(() => new Date("2026-06-28T00:00:00.000Z"));

    await bootstrapLangGraphAgentContext(
      { did: "did:axiom:pioneer.username" },
      { sdk: createMockSdk(94), now }
    );

    expect(now).not.toHaveBeenCalled();
  });

  it("records a delegation chain in the attestation draft", async () => {
    const delegationChain: AxiomLangGraphDelegationStep[] = [
      {
        fromDid: "did:axiom:agent-a",
        toDid: "did:axiom:agent-b",
        capability: "research",
      },
      {
        fromDid: "did:axiom:agent-b",
        toDid: "did:axiom:agent-c",
        capability: "attest",
      },
    ];

    const context = await bootstrapLangGraphAgentContext(
      {
        did: "did:axiom:agent-a",
        delegationChain,
        attestationSubjectDid: "did:axiom:agent-c",
      },
      {
        sdk: createMockSdk(86),
        includeAttestationDraft: true,
        now: () => new Date("2026-06-28T01:00:00.000Z"),
      }
    );

    expect(context.attestationDraft?.evidence.delegationChain).toEqual(
      delegationChain
    );
  });

  it("creates a bootstrap node that writes context back into LangGraph state", async () => {
    const nodes = createAxiomLangGraphNodes({
      sdk: createMockSdk(82),
      minimumTrustScore: 80,
    });

    const state = await nodes.bootstrapAgentContext({
      did: "did:axiom:pioneer.username",
      task: "review",
    });

    expect(state.task).toBe("review");
    expect(state.axiom.gate.allowed).toBe(true);
    expect(state.axiom.trustScore.score).toBe(82);
  });

  it("supports custom DID field and context key names for graph state", async () => {
    const nodes = createAxiomLangGraphNodes({
      sdk: createMockSdk(81),
      didField: "agentDid",
      contextKey: "identity",
    });

    const state = await nodes.bootstrapAgentContext({
      agentDid: "did:axiom:pioneer.username",
    });

    expect(state.identity.did).toBe("did:axiom:pioneer.username");
  });

  it("passes attestation fields from graph state into node bootstrap", async () => {
    const delegationChain: AxiomLangGraphDelegationStep[] = [
      {
        fromDid: "did:axiom:agent-a",
        toDid: "did:axiom:agent-b",
        capability: "research",
      },
    ];
    const nodes = createAxiomLangGraphNodes({
      sdk: createMockSdk(88),
      includeAttestationDraft: true,
      now: () => new Date("2026-06-28T02:00:00.000Z"),
    });

    const state = await nodes.bootstrapAgentContext({
      did: "did:axiom:agent-a",
      attestationSubjectDid: "did:axiom:agent-b",
      delegationChain,
      metadata: { task: "delegated-review" },
    });

    expect(state.axiom.attestationDraft).toMatchObject({
      issuerDid: "did:axiom:agent-a",
      subjectDid: "did:axiom:agent-b",
      issuedAt: "2026-06-28T02:00:00.000Z",
      evidence: {
        trustScore: 88,
        delegationChain,
      },
      metadata: { task: "delegated-review" },
    });
  });

  it("enforceSoulGate returns state unchanged when context is allowed", async () => {
    const nodes = createAxiomLangGraphNodes({ sdk: createMockSdk(90) });
    const state = await nodes.bootstrapAgentContext({
      did: "did:axiom:pioneer.username",
    });

    expect(nodes.enforceSoulGate(state)).toBe(state);
  });

  it("enforceSoulGate throws when context is denied", async () => {
    const nodes = createAxiomLangGraphNodes({
      sdk: createMockSdk(20),
      minimumTrustScore: 80,
    });
    const state = await nodes.bootstrapAgentContext({
      did: "did:axiom:pioneer.username",
    });

    expect(() => nodes.enforceSoulGate(state)).toThrow(AxiomIDError);
  });

  it("throws a typed error when graph state has no DID", async () => {
    const nodes = createAxiomLangGraphNodes({ sdk: createMockSdk(90) });

    await expect(nodes.bootstrapAgentContext({ task: "review" })).rejects.toMatchObject({
      code: "LANGGRAPH_DID_MISSING",
      status: 400,
    });
  });

  it("throws a typed error when graph state is not an object", async () => {
    const nodes = createAxiomLangGraphNodes({ sdk: createMockSdk(90) });

    await expect(nodes.bootstrapAgentContext(null as never)).rejects.toMatchObject({
      code: "LANGGRAPH_STATE_INVALID",
      status: 400,
    });
  });

  it("throws a typed error when enforcement runs before bootstrap", () => {
    const nodes = createAxiomLangGraphNodes();

    try {
      nodes.enforceSoulGate({ did: "did:axiom:pioneer.username" });
      throw new Error("Expected missing AxiomID context to throw");
    } catch (err) {
      expect(err).toMatchObject({
        code: "LANGGRAPH_CONTEXT_MISSING",
        status: 400,
      });
    }
  });

  it("rejects forged AxiomID context before trusting gate.allowed", () => {
    const nodes = createAxiomLangGraphNodes();

    try {
      nodes.enforceSoulGate({ axiom: { gate: { allowed: true } } } as never);
      throw new Error("Expected invalid AxiomID context to throw");
    } catch (err) {
      expect(err).toMatchObject({
        code: "LANGGRAPH_CONTEXT_INVALID",
        status: 400,
      });
    }
  });

  it("throws a typed error when enforcement receives invalid state", () => {
    const nodes = createAxiomLangGraphNodes();

    try {
      nodes.enforceSoulGate([] as never);
      throw new Error("Expected invalid LangGraph state to throw");
    } catch (err) {
      expect(err).toMatchObject({
        code: "LANGGRAPH_STATE_INVALID",
        status: 400,
      });
    }
  });

  it("streams async bootstrap progress events in graph-friendly order", async () => {
    const events = [];

    for await (const event of streamLangGraphBootstrap(
      { did: "did:axiom:pioneer.username" },
      { sdk: createMockSdk(77), minimumTrustScore: 75 }
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      "did:resolving",
      "did:resolved",
      "trust:loaded",
      "gate:checked",
      "bootstrap:complete",
    ]);
    expect(events[3]).toMatchObject({
      type: "gate:checked",
      gate: { allowed: true, minimumTrustScore: 75 },
    });
    expect(events[4]).toMatchObject({
      type: "bootstrap:complete",
      context: {
        did: "did:axiom:pioneer.username",
        gate: { allowed: true, minimumTrustScore: 75 },
      },
    });
  });

  it("propagates SDK resolution failures to the graph runner", async () => {
    const sdk = {
      resolveDID: jest.fn().mockRejectedValue(new Error("resolver down")),
      getTrustScore: jest.fn(),
    };

    await expect(
      bootstrapLangGraphAgentContext(
        { did: "did:axiom:pioneer.username" },
        { sdk }
      )
    ).rejects.toThrow("resolver down");
    expect(sdk.getTrustScore).toHaveBeenCalledWith("did:axiom:pioneer.username");
  });
});
