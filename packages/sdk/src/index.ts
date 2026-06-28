export { AxiomSDK, AxiomIDError } from "./client";
export { AxiomAgentBootstrap } from "./integrations/agent-bootstrap";
export { createAxiomIDMastraTools } from "./integrations/mastra";
export type {
  AxiomSDKConfig,
  Passport,
  Stamp,
  Stamps,
  StampResult,
  DIDDocument,
  VerificationMethod,
  TrustScore,
  TrustBreakdown,
  Skill,
  SearchSkillsResponse,
} from "./types";
export type {
  AgentAttestationDraft,
  AgentAttestationDraftInput,
  AxiomAgentBootstrapConfig,
  AxiomAgentContext,
  AxiomAgentContextInput,
  SoulGateDecision,
} from "./integrations/agent-bootstrap";
export type {
  AxiomIDMastraTools,
  AxiomIDMastraToolsConfig,
  AxiomIDMastraSchemas,
  MastraCreateTool,
  MastraToolDefinition,
} from "./integrations/mastra";
