/**
 * IQRA Agentic Policy Agent Types
 * Inspired by AWS Network Policy Agent (Kubernetes NetworkPolicy / eBPF semantics)
 */

export type PolicyAction = 'ALLOW' | 'DENY' | 'AUDIT_ONLY';

export interface ToolCallTarget {
  toolName: string;
  parameters: Record<string, unknown>;
  agentId: string;
  agentRole: string;
  timestamp: number;
}

export interface IngressEgressRule {
  /** Target tool names or wildcard '*' */
  tools: string[];
  /** Parameter matching regex / exact patterns */
  paramMatch?: Record<string, string>;
  /** Action to take */
  action: PolicyAction;
  /** Reason for rule */
  reason: string;
}

export interface IqraPolicyManifest {
  apiVersion: 'iqra.ai/v1alpha1';
  kind: 'AgenticNetworkPolicy';
  metadata: {
    name: string;
    namespace?: string;
    description: string;
  };
  spec: {
    agentSelector: {
      matchRoles?: string[];
      matchIds?: string[];
    };
    /** Rules for allowed tool calls (Egress from Agent) */
    egress: IngressEgressRule[];
    /** Ethical Conscience & Integrity Checks */
    conscienceSubstrate: {
      enforceDivineAccountability: boolean;
      denyDestructiveFileDeletion: boolean;
      denyUnboundedNetworkExfiltration: boolean;
    };
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  action: PolicyAction;
  matchedRule?: IngressEgressRule;
  violationReason?: string;
  latencyMicroseconds: number;
  evaluatedAt: string;
}
