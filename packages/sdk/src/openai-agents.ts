import { AxiomIDError, AxiomSDK } from "./client";
import { AxiomSDKConfig, DIDDocument, TrustScore } from "./types";

export interface AxiomOpenAIAgentGate {
  allowed: boolean;
  minimumTrustScore: number;
  reason?: string;
}

export interface AxiomAttestationDraft {
  issuerDid: string;
  subjectDid: string;
  type: "AxiomIDAgentContext";
  issuedAt: string;
  evidence: {
    trustScore: number;
    tier: string;
    gateAllowed: boolean;
  };
}

export interface AxiomOpenAIAgentContext {
  did: string;
  didDocument: DIDDocument;
  trustScore: TrustScore;
  gate: AxiomOpenAIAgentGate;
  attestationDraft?: AxiomAttestationDraft;
}

export interface AxiomOpenAIAgentBootstrapOptions {
  did: string;
  sdk?: Pick<AxiomSDK, "resolveDID" | "getTrustScore">;
  sdkConfig?: AxiomSDKConfig;
  minimumTrustScore?: number;
  includeAttestationDraft?: boolean;
  attestationSubjectDid?: string;
  now?: () => Date;
}

export interface AxiomOpenAIToolsOptions {
  sdk?: Pick<AxiomSDK, "resolveDID" | "getTrustScore">;
  sdkConfig?: AxiomSDKConfig;
  minimumTrustScore?: number;
}

export interface AxiomOpenAIToolDefinition<TResult> {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
  execute: (args: unknown) => Promise<TResult>;
}

export interface OpenAIToolFactory<TTool> {
  (definition: AxiomOpenAIToolDefinition<unknown>): TTool;
}

const DEFAULT_MINIMUM_TRUST_SCORE = 0;

function getSdk(
  sdk?: Pick<AxiomSDK, "resolveDID" | "getTrustScore">,
  sdkConfig?: AxiomSDKConfig
) {
  return sdk ?? new AxiomSDK(sdkConfig ?? { network: "mainnet" });
}

function getMinimumTrustScore(value?: number) {
  if (value === undefined) {
    return DEFAULT_MINIMUM_TRUST_SCORE;
  }
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new AxiomIDError(
      "minimumTrustScore must be a finite number between 0 and 100",
      "INVALID_MINIMUM_TRUST_SCORE",
      400
    );
  }
  return value;
}

function getStringArg(args: unknown, key: string) {
  if (!args || typeof args !== "object" || !(key in args)) {
    throw new AxiomIDError(`Missing ${key}`, "INVALID_TOOL_ARGUMENTS", 400);
  }

  const value = (args as Record<string, unknown>)[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new AxiomIDError(`${key} must be a non-empty string`, "INVALID_TOOL_ARGUMENTS", 400);
  }

  return value;
}

function getOptionalNumberArg(args: unknown, key: string) {
  if (!args || typeof args !== "object" || !(key in args)) {
    return undefined;
  }

  const value = (args as Record<string, unknown>)[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number") {
    throw new AxiomIDError(`${key} must be a number`, "INVALID_TOOL_ARGUMENTS", 400);
  }

  return value;
}

function getEffectiveMinimumTrustScore(args: unknown, configuredMinimumTrustScore?: number) {
  const requestedMinimumTrustScore = getOptionalNumberArg(args, "minimumTrustScore");
  const configuredFloor = configuredMinimumTrustScore ?? DEFAULT_MINIMUM_TRUST_SCORE;
  const requestedFloor = requestedMinimumTrustScore ?? configuredFloor;

  return Math.max(requestedFloor, configuredFloor);
}

export async function bootstrapOpenAIAgentContext(
  options: AxiomOpenAIAgentBootstrapOptions
): Promise<AxiomOpenAIAgentContext> {
  if (!options) {
    throw new AxiomIDError("options is required", "INVALID_OPTIONS", 400);
  }
  if (typeof options.did !== "string" || options.did.trim() === "") {
    throw new AxiomIDError("did must be a non-empty string", "INVALID_DID", 400);
  }

  const sdk = getSdk(options.sdk, options.sdkConfig);
  const minimumTrustScore = getMinimumTrustScore(options.minimumTrustScore);
  const [didDocument, trustScore] = await Promise.all([
    sdk.resolveDID(options.did),
    sdk.getTrustScore(options.did),
  ]);
  const allowed = trustScore.score >= minimumTrustScore;
  const gate: AxiomOpenAIAgentGate = {
    allowed,
    minimumTrustScore,
    ...(allowed
      ? {}
      : {
          reason: `Trust score ${trustScore.score} is below required minimum ${minimumTrustScore}`,
        }),
  };

  const context: AxiomOpenAIAgentContext = {
    did: options.did,
    didDocument,
    trustScore,
    gate,
  };

  if (options.includeAttestationDraft) {
    context.attestationDraft = {
      issuerDid: options.did,
      subjectDid: options.attestationSubjectDid ?? options.did,
      type: "AxiomIDAgentContext",
      issuedAt: (options.now ?? (() => new Date()))().toISOString(),
      evidence: {
        trustScore: trustScore.score,
        tier: trustScore.tier,
        gateAllowed: allowed,
      },
    };
  }

  return context;
}

export function assertOpenAIAgentSoulGate(
  context: AxiomOpenAIAgentContext
): AxiomOpenAIAgentContext {
  if (!context || !context.gate) {
    throw new AxiomIDError(
      "Invalid agent context or missing gate evaluation",
      "INVALID_CONTEXT",
      400
    );
  }

  if (!context.gate.allowed) {
    throw new AxiomIDError(
      context.gate.reason ?? "Soul Gate denied this agent context",
      "SOUL_GATE_DENIED",
      403
    );
  }

  return context;
}

export function createAxiomOpenAIAgentTools(
  options: AxiomOpenAIToolsOptions = {}
): [
  AxiomOpenAIToolDefinition<DIDDocument>,
  AxiomOpenAIToolDefinition<TrustScore>,
  AxiomOpenAIToolDefinition<AxiomOpenAIAgentContext>
] {
  const sdk = getSdk(options.sdk, options.sdkConfig);
  const didProperty = {
    type: "string",
    description: "AxiomID DID, for example did:axiom:pioneer.username",
  };

  return [
    {
      name: "axiom_resolve_did",
      description: "Resolve an AxiomID DID document before an OpenAI agent acts.",
      parameters: {
        type: "object",
        properties: { did: didProperty },
        required: ["did"],
        additionalProperties: false,
      },
      execute: async (args) => {
        return sdk.resolveDID(getStringArg(args, "did"));
      },
    },
    {
      name: "axiom_get_trust_score",
      description: "Fetch the AxiomID trust score and tier for agent context.",
      parameters: {
        type: "object",
        properties: { did: didProperty },
        required: ["did"],
        additionalProperties: false,
      },
      execute: async (args) => {
        return sdk.getTrustScore(getStringArg(args, "did"));
      },
    },
    {
      name: "axiom_bootstrap_agent_context",
      description:
        "Resolve DID, fetch trust score, and evaluate Soul Gate before an OpenAI agent runs.",
      parameters: {
        type: "object",
        properties: {
          did: didProperty,
          minimumTrustScore: {
            type: "number",
            description: "Minimum trust score from 0 to 100 required to pass Soul Gate.",
          },
        },
        required: ["did"],
        additionalProperties: false,
      },
      execute: async (args) =>
        bootstrapOpenAIAgentContext({
          did: getStringArg(args, "did"),
          sdk,
          minimumTrustScore: getEffectiveMinimumTrustScore(args, options.minimumTrustScore),
        }),
    },
  ];
}

export function toOpenAIAgentTools<TTool>(
  toolFactory: OpenAIToolFactory<TTool>,
  options: AxiomOpenAIToolsOptions = {}
): TTool[] {
  return createAxiomOpenAIAgentTools(options).map((definition) => toolFactory(definition));
}
