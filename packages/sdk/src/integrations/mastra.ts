import type { AxiomSDK } from "../client";
import {
  AxiomAgentBootstrap,
  type AgentAttestationDraftInput,
  type AxiomAgentContextInput,
} from "./agent-bootstrap";

export interface MastraToolDefinition<TInput, TOutput> {
  id: string;
  description: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  execute: (input: TInput, context?: unknown) => Promise<TOutput> | TOutput;
}

export type MastraCreateTool<TTool> = (
  definition: MastraToolDefinition<unknown, unknown>
) => TTool;

export interface AxiomIDMastraSchemas {
  verifyDidInput: unknown;
  soulGateInput: unknown;
  attestationDraftInput: unknown;
  objectOutput?: unknown;
}

export interface AxiomIDMastraToolsConfig<TTool> {
  sdk: AxiomSDK;
  createTool: MastraCreateTool<TTool>;
  schemas: AxiomIDMastraSchemas;
  agentDid?: string;
  minimumTrustScore?: number;
  now?: () => Date;
}

export interface AxiomIDMastraTools<TTool> {
  verifyDid: TTool;
  enforceSoulGate: TTool;
  createAttestationDraft: TTool;
}

export function createAxiomIDMastraTools<TTool>(
  config: AxiomIDMastraToolsConfig<TTool>
): AxiomIDMastraTools<TTool> {
  const bootstrap = new AxiomAgentBootstrap({
    sdk: config.sdk,
    agentDid: config.agentDid,
    minimumTrustScore: config.minimumTrustScore,
    now: config.now,
  });

  return {
    verifyDid: config.createTool({
      id: "axiomid.verifyDid",
      description:
        "Resolve an AxiomID DID, fetch trust score context, optionally hydrate a passport, and return a Soul Gate decision.",
      inputSchema: config.schemas.verifyDidInput,
      outputSchema: config.schemas.objectOutput,
      execute: async (input) =>
        bootstrap.buildContext(input as AxiomAgentContextInput),
    }),

    enforceSoulGate: config.createTool({
      id: "axiomid.enforceSoulGate",
      description:
        "Evaluate whether an agent action should proceed based on AxiomID trust score threshold.",
      inputSchema: config.schemas.soulGateInput,
      outputSchema: config.schemas.objectOutput,
      execute: async (input) =>
        bootstrap.requireSoulGate(
          input as { did: string; minimumTrustScore?: number; purpose?: string }
        ),
    }),

    createAttestationDraft: config.createTool({
      id: "axiomid.createAttestationDraft",
      description:
        "Create an unsigned AxiomID agent attestation draft that can be signed or submitted by the host application.",
      inputSchema: config.schemas.attestationDraftInput,
      outputSchema: config.schemas.objectOutput,
      execute: (input) =>
        bootstrap.createAttestationDraft(input as AgentAttestationDraftInput),
    }),
  };
}
