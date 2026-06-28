import type { AxiomSDK } from "../client";
import {
  AxiomAgentBootstrap,
  type AxiomAgentContext,
  type AxiomAttestationDraft,
  type AxiomSoulGateResult,
} from "./agent-bootstrap";

export interface CrewAIToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  argsSchema?: unknown;
  run: (input: TInput) => Promise<TOutput> | TOutput;
}

export type CrewAICreateTool<TTool> = <TInput, TOutput>(
  definition: CrewAIToolDefinition<TInput, TOutput>
) => TTool;

export interface AxiomIDCrewAISchemas {
  verifyIdentityInput?: unknown;
  soulGateInput?: unknown;
  attestationDraftInput?: unknown;
}

export interface AxiomIDCrewAIToolsConfig<TTool> {
  sdk: AxiomSDK;
  createTool: CrewAICreateTool<TTool>;
  schemas?: AxiomIDCrewAISchemas;
  agentDid?: string;
  minimumTrustScore?: number;
  now?: () => Date;
}

export interface AxiomIDCrewAITools<TTool> {
  verifyIdentity: TTool;
  enforceSoulGate: TTool;
  createAttestationDraft: TTool;
}

export interface AxiomIDCrewAIToolDefinitionsConfig {
  sdk: AxiomSDK;
  schemas?: AxiomIDCrewAISchemas;
  agentDid?: string;
  minimumTrustScore?: number;
  now?: () => Date;
}

export interface AxiomIDCrewAIToolDefinitions {
  verifyIdentity: CrewAIToolDefinition<
    CrewAIVerifyIdentityInput,
    AxiomAgentContext
  >;
  enforceSoulGate: CrewAIToolDefinition<
    CrewAISoulGateInput,
    AxiomSoulGateResult
  >;
  createAttestationDraft: CrewAIToolDefinition<
    CrewAIAttestationDraftInput,
    AxiomAttestationDraft
  >;
}

export interface CrewAIVerifyIdentityInput {
  did: string;
  passportSlug?: string;
  purpose?: string;
}

export interface CrewAISoulGateInput extends CrewAIVerifyIdentityInput {
  minimumTrustScore?: number;
}

export interface CrewAIAttestationDraftInput {
  subjectDid: string;
  claim: string;
  issuerDid?: string;
  purpose?: string;
  evidence?: Record<string, unknown>;
}

export function createAxiomIDCrewAITools<TTool>(
  config: AxiomIDCrewAIToolsConfig<TTool>
): AxiomIDCrewAITools<TTool> {
  const definitions = createAxiomIDCrewAIToolDefinitions(config);

  return {
    verifyIdentity: config.createTool(definitions.verifyIdentity),
    enforceSoulGate: config.createTool(definitions.enforceSoulGate),
    createAttestationDraft: config.createTool(
      definitions.createAttestationDraft
    ),
  };
}

export function createAxiomIDCrewAIToolDefinitions(
  config: AxiomIDCrewAIToolDefinitionsConfig
): AxiomIDCrewAIToolDefinitions {
  const bootstrap = new AxiomAgentBootstrap({
    sdk: config.sdk,
    agentDid: config.agentDid,
    minimumTrustScore: config.minimumTrustScore,
    now: config.now,
  });

  return {
    verifyIdentity: {
      name: "axiomid_verify_identity",
      description:
        "Resolve an AxiomID DID and return trust context for a CrewAI agent or task.",
      argsSchema: config.schemas?.verifyIdentityInput,
      run: async (input) =>
        bootstrap.createContext(readVerifyIdentityInput(input)),
    },
    enforceSoulGate: {
      name: "axiomid_enforce_soul_gate",
      description:
        "Check whether an AxiomID identity meets the trust threshold required by a CrewAI task.",
      argsSchema: config.schemas?.soulGateInput,
      run: async (input) => bootstrap.enforceSoulGate(readSoulGateInput(input)),
    },
    createAttestationDraft: {
      name: "axiomid_create_attestation_draft",
      description:
        "Create an unsigned AxiomID attestation draft from CrewAI task output.",
      argsSchema: config.schemas?.attestationDraftInput,
      run: (input) =>
        bootstrap.createAttestationDraft(readAttestationDraftInput(input)),
    },
  };
}

function readVerifyIdentityInput(input: unknown): CrewAIVerifyIdentityInput {
  const record = requireRecord(input, "verifyIdentity input");
  return readVerifyIdentityRecord(record);
}

function readVerifyIdentityRecord(
  record: Record<string, unknown>
): CrewAIVerifyIdentityInput {
  return {
    did: requireString(record.did, "did"),
    passportSlug: optionalString(record.passportSlug, "passportSlug"),
    purpose: optionalString(record.purpose, "purpose"),
  };
}

function readSoulGateInput(input: unknown): CrewAISoulGateInput {
  const record = requireRecord(input, "soulGate input");
  return {
    ...readVerifyIdentityRecord(record),
    minimumTrustScore: optionalNumber(
      record.minimumTrustScore,
      "minimumTrustScore"
    ),
  };
}

function readAttestationDraftInput(
  input: unknown
): CrewAIAttestationDraftInput {
  const record = requireRecord(input, "attestationDraft input");
  return {
    subjectDid: requireString(record.subjectDid, "subjectDid"),
    claim: requireString(record.claim, "claim"),
    issuerDid: optionalString(record.issuerDid, "issuerDid"),
    purpose: optionalString(record.purpose, "purpose"),
    evidence: optionalRecord(record.evidence, "evidence"),
  };
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireString(value, field);
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function optionalRecord(
  value: unknown,
  field: string
): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireRecord(value, field);
}

export type {
  AxiomAgentContext,
  AxiomAttestationDraft,
  AxiomSoulGateResult,
};
