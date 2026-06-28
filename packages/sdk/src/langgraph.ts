import { AxiomIDError, AxiomSDK } from "./client";
import { AxiomSDKConfig, DIDDocument, TrustScore } from "./types";

export type LangGraphAxiomSDK = Pick<AxiomSDK, "resolveDID" | "getTrustScore">;

export interface AxiomLangGraphGate {
  allowed: boolean;
  minimumTrustScore: number;
  reason?: string;
}

export interface AxiomLangGraphDelegationStep {
  fromDid: string;
  toDid: string;
  capability: string;
}

export interface AxiomLangGraphAttestationDraft {
  issuerDid: string;
  subjectDid: string;
  type: "AxiomIDLangGraphContext";
  issuedAt: string;
  evidence: {
    trustScore: number;
    tier: string;
    gateAllowed: boolean;
    delegationChain?: AxiomLangGraphDelegationStep[];
  };
  metadata?: Record<string, unknown>;
}

export interface AxiomLangGraphContext {
  did: string;
  didDocument: DIDDocument;
  trustScore: TrustScore;
  gate: AxiomLangGraphGate;
  attestationDraft?: AxiomLangGraphAttestationDraft;
}

export interface AxiomLangGraphBootstrapInput {
  did: string;
  attestationSubjectDid?: string;
  delegationChain?: AxiomLangGraphDelegationStep[];
  metadata?: Record<string, unknown>;
}

export interface AxiomLangGraphOptions {
  sdk?: LangGraphAxiomSDK;
  sdkConfig?: AxiomSDKConfig;
  minimumTrustScore?: number;
  includeAttestationDraft?: boolean;
  now?: () => Date;
}

export interface AxiomLangGraphNodeOptions extends AxiomLangGraphOptions {
  didField?: string;
  contextKey?: string;
}

export type LangGraphState = Record<string, unknown>;

export interface AxiomLangGraphNodes {
  bootstrapAgentContext: <TState extends LangGraphState>(
    state: TState
  ) => Promise<TState & Record<string, AxiomLangGraphContext>>;
  enforceSoulGate: <TState extends LangGraphState>(state: TState) => TState;
}

export type AxiomLangGraphStreamEvent =
  | { type: "did:resolving"; did: string }
  | { type: "did:resolved"; did: string; didDocument: DIDDocument }
  | { type: "trust:loaded"; did: string; trustScore: TrustScore }
  | { type: "gate:checked"; did: string; gate: AxiomLangGraphGate }
  | { type: "bootstrap:complete"; did: string; context: AxiomLangGraphContext };

const DEFAULT_MINIMUM_TRUST_SCORE = 70;
const DEFAULT_DID_FIELD = "did";
const DEFAULT_CONTEXT_KEY = "axiom";

function getSdk(options: AxiomLangGraphOptions): LangGraphAxiomSDK {
  if (options.sdk) {
    return options.sdk;
  }

  return new AxiomSDK(options.sdkConfig ?? { network: "mainnet" });
}

function getMinimumTrustScore(options: AxiomLangGraphOptions): number {
  const minimumTrustScore =
    options.minimumTrustScore ?? DEFAULT_MINIMUM_TRUST_SCORE;

  if (
    !Number.isFinite(minimumTrustScore) ||
    minimumTrustScore < 0 ||
    minimumTrustScore > 100
  ) {
    throw new AxiomIDError(
      "LangGraph minimumTrustScore must be a finite number between 0 and 100",
      "LANGGRAPH_TRUST_THRESHOLD_INVALID",
      400
    );
  }

  return minimumTrustScore;
}

function evaluateSoulGate(
  trustScore: TrustScore,
  minimumTrustScore: number
): AxiomLangGraphGate {
  if (trustScore.score >= minimumTrustScore) {
    return { allowed: true, minimumTrustScore };
  }

  return {
    allowed: false,
    minimumTrustScore,
    reason: `Trust score ${trustScore.score} is below required minimum ${minimumTrustScore}`,
  };
}

function createAttestationDraft(
  input: AxiomLangGraphBootstrapInput,
  trustScore: TrustScore,
  gate: AxiomLangGraphGate,
  issuedAt: string
): AxiomLangGraphAttestationDraft {
  return {
    issuerDid: input.did,
    subjectDid: input.attestationSubjectDid ?? input.did,
    type: "AxiomIDLangGraphContext",
    issuedAt,
    evidence: {
      trustScore: trustScore.score,
      tier: trustScore.tier,
      gateAllowed: gate.allowed,
      ...(input.delegationChain ? { delegationChain: input.delegationChain } : {}),
    },
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertLangGraphState(state: unknown): asserts state is LangGraphState {
  if (!isRecord(state)) {
    throw new AxiomIDError(
      "LangGraph state must be a valid object",
      "LANGGRAPH_STATE_INVALID",
      400
    );
  }
}

function readDidFromState(state: LangGraphState, didField: string): string {
  assertLangGraphState(state);

  const did = state[didField];

  if (typeof did !== "string" || did.trim() === "") {
    throw new AxiomIDError(
      `LangGraph state must include a non-empty string DID at "${didField}"`,
      "LANGGRAPH_DID_MISSING",
      400
    );
  }

  return did;
}

function readOptionalStringField(
  state: LangGraphState,
  field: string,
  code: string
): string | undefined {
  const value = state[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    throw new AxiomIDError(
      `LangGraph state field "${field}" must be a non-empty string`,
      code,
      400
    );
  }

  return value;
}

function isDelegationStep(value: unknown): value is AxiomLangGraphDelegationStep {
  return (
    isRecord(value) &&
    typeof value.fromDid === "string" &&
    value.fromDid.trim() !== "" &&
    typeof value.toDid === "string" &&
    value.toDid.trim() !== "" &&
    typeof value.capability === "string" &&
    value.capability.trim() !== ""
  );
}

function readDelegationChainFromState(
  state: LangGraphState
): AxiomLangGraphDelegationStep[] | undefined {
  const value = state.delegationChain;

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every(isDelegationStep)) {
    throw new AxiomIDError(
      'LangGraph state field "delegationChain" must contain delegation steps',
      "LANGGRAPH_DELEGATION_INVALID",
      400
    );
  }

  return value;
}

function readMetadataFromState(
  state: LangGraphState
): Record<string, unknown> | undefined {
  const value = state.metadata;

  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new AxiomIDError(
      'LangGraph state field "metadata" must be an object',
      "LANGGRAPH_METADATA_INVALID",
      400
    );
  }

  return value;
}

function readBootstrapInputFromState(
  state: LangGraphState,
  didField: string
): AxiomLangGraphBootstrapInput {
  const did = readDidFromState(state, didField);
  const attestationSubjectDid = readOptionalStringField(
    state,
    "attestationSubjectDid",
    "LANGGRAPH_ATTESTATION_SUBJECT_INVALID"
  );
  const delegationChain = readDelegationChainFromState(state);
  const metadata = readMetadataFromState(state);

  return {
    did,
    ...(attestationSubjectDid ? { attestationSubjectDid } : {}),
    ...(delegationChain ? { delegationChain } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function isValidTrustScore(value: unknown): value is TrustScore {
  return (
    isRecord(value) &&
    typeof value.did === "string" &&
    value.did.trim() !== "" &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    typeof value.tier === "string" &&
    value.tier.trim() !== ""
  );
}

function isValidGate(value: unknown): value is AxiomLangGraphGate {
  return (
    isRecord(value) &&
    typeof value.allowed === "boolean" &&
    typeof value.minimumTrustScore === "number" &&
    Number.isFinite(value.minimumTrustScore) &&
    value.minimumTrustScore >= 0 &&
    value.minimumTrustScore <= 100 &&
    (value.reason === undefined || typeof value.reason === "string")
  );
}

function isValidLangGraphContext(value: unknown): value is AxiomLangGraphContext {
  return (
    isRecord(value) &&
    typeof value.did === "string" &&
    value.did.trim() !== "" &&
    isRecord(value.didDocument) &&
    isValidTrustScore(value.trustScore) &&
    isValidGate(value.gate)
  );
}

function readContextFromState(
  state: LangGraphState,
  contextKey: string
): AxiomLangGraphContext {
  assertLangGraphState(state);

  const context = state[contextKey];

  if (context === undefined) {
    throw new AxiomIDError(
      `LangGraph state must include AxiomID context at "${contextKey}"`,
      "LANGGRAPH_CONTEXT_MISSING",
      400
    );
  }

  if (!isValidLangGraphContext(context)) {
    throw new AxiomIDError(
      `LangGraph state includes invalid AxiomID context at "${contextKey}"`,
      "LANGGRAPH_CONTEXT_INVALID",
      400
    );
  }

  return context;
}

function createLangGraphContext(
  input: AxiomLangGraphBootstrapInput,
  didDocument: DIDDocument,
  trustScore: TrustScore,
  gate: AxiomLangGraphGate,
  options: AxiomLangGraphOptions
): AxiomLangGraphContext {
  const attestationDraft = options.includeAttestationDraft
    ? createAttestationDraft(
        input,
        trustScore,
        gate,
        (options.now ?? (() => new Date()))().toISOString()
      )
    : undefined;

  return {
    did: input.did,
    didDocument,
    trustScore,
    gate,
    ...(attestationDraft ? { attestationDraft } : {}),
  };
}

export async function bootstrapLangGraphAgentContext(
  input: AxiomLangGraphBootstrapInput,
  options: AxiomLangGraphOptions = {}
): Promise<AxiomLangGraphContext> {
  const sdk = getSdk(options);
  const minimumTrustScore = getMinimumTrustScore(options);
  const [didDocument, trustScore] = await Promise.all([
    sdk.resolveDID(input.did),
    sdk.getTrustScore(input.did),
  ]);
  const gate = evaluateSoulGate(trustScore, minimumTrustScore);

  return createLangGraphContext(input, didDocument, trustScore, gate, options);
}

export function assertLangGraphSoulGate(context: AxiomLangGraphContext): void {
  if (context.gate.allowed) {
    return;
  }

  throw new AxiomIDError(
    context.gate.reason ?? "AxiomID Soul Gate denied LangGraph execution",
    "SOUL_GATE_DENIED",
    403
  );
}

export function createAxiomLangGraphNodes(
  options: AxiomLangGraphNodeOptions = {}
): AxiomLangGraphNodes {
  const didField = options.didField ?? DEFAULT_DID_FIELD;
  const contextKey = options.contextKey ?? DEFAULT_CONTEXT_KEY;
  const sdk = getSdk(options);
  const minimumTrustScore = getMinimumTrustScore(options);
  const bootstrapOptions: AxiomLangGraphOptions = {
    sdk,
    sdkConfig: options.sdkConfig,
    minimumTrustScore,
    includeAttestationDraft: options.includeAttestationDraft,
    now: options.now,
  };

  return {
    async bootstrapAgentContext<TState extends LangGraphState>(
      state: TState
    ): Promise<TState & Record<string, AxiomLangGraphContext>> {
      const input = readBootstrapInputFromState(state, didField);
      const context = await bootstrapLangGraphAgentContext(
        input,
        bootstrapOptions
      );

      return {
        ...state,
        [contextKey]: context,
      } as TState & Record<string, AxiomLangGraphContext>;
    },

    enforceSoulGate<TState extends LangGraphState>(state: TState): TState {
      const context = readContextFromState(state, contextKey);
      assertLangGraphSoulGate(context);
      return state;
    },
  };
}

export async function* streamLangGraphBootstrap(
  input: AxiomLangGraphBootstrapInput,
  options: AxiomLangGraphOptions = {}
): AsyncGenerator<AxiomLangGraphStreamEvent, void, void> {
  const sdk = getSdk(options);
  const minimumTrustScore = getMinimumTrustScore(options);

  yield { type: "did:resolving", did: input.did };
  const didDocument = await sdk.resolveDID(input.did);
  yield { type: "did:resolved", did: input.did, didDocument };

  const trustScore = await sdk.getTrustScore(input.did);
  yield { type: "trust:loaded", did: input.did, trustScore };

  const gate = evaluateSoulGate(trustScore, minimumTrustScore);
  yield { type: "gate:checked", did: input.did, gate };

  const context = createLangGraphContext(
    input,
    didDocument,
    trustScore,
    gate,
    options
  );
  yield { type: "bootstrap:complete", did: input.did, context };
}
