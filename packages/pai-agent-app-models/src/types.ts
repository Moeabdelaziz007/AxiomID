/**
 * AxiomID Agent App Model Specifications v0.1
 */

export type PermissionScope =
  | 'read:filesystem'
  | 'write:filesystem'
  | 'execute:command'
  | 'network:egress'
  | 'memory:read'
  | 'memory:write'
  | 'did:sign';

export interface AgentAppPermission {
  scope: PermissionScope;
  reason: string;
  maxCallsPerMin?: number;
  allowedDomains?: string[];
}

export interface AgentAppMetadata {
  appId: string; // e.g. "app_axiomid_analytics"
  name: string; // e.g. "Agent Analytics App"
  version: string; // e.g. "1.0.0"
  description: string;
  developerDid: string; // did:axiom:...
  iconUrl?: string;
  homepageUrl?: string;
}

export interface AgentAppCapability {
  name: string;
  endpoint: string;
  protocol: 'mcp' | 'a2a' | 'rest' | 'graphql';
  version: string;
}

export interface AgentAppManifest {
  manifestVersion: '0.1';
  app: AgentAppMetadata;
  permissions: AgentAppPermission[];
  capabilities: AgentAppCapability[];
  sandboxed: boolean;
  minAgentVersion?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentAppValidationResult {
  valid: boolean;
  appId: string;
  errors: string[];
  securityRiskScore: number; // 0 (Safe) to 100 (Unsafe)
}
