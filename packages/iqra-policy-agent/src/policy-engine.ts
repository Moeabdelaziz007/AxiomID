import {
  IqraPolicyManifest,
  ToolCallTarget,
  PolicyEvaluationResult,
  PolicyAction,
} from './types.js';

/**
 * IQRA Policy Engine
 * Real, deterministic rule evaluator modeled after eBPF packet-filtering tables.
 */
export class IqraPolicyEngine {
  private policies: Map<string, IqraPolicyManifest> = new Map();

  /**
   * Register an AgenticNetworkPolicy manifest
   */
  public registerPolicy(policy: IqraPolicyManifest): void {
    this.policies.set(policy.metadata.name, policy);
  }

  /**
   * Evaluates a ToolCall payload against registered policies in O(1) -> O(rules) time.
   */
  public evaluate(target: ToolCallTarget): PolicyEvaluationResult {
    const startTime = performance.now();

    // 1. Muraqabah / Conscience Substrate Pre-filter (Hard Security Boundary)
    const conscienceCheck = this.evaluateConscienceSubstrate(target);
    if (!conscienceCheck.allowed) {
      const elapsed = (performance.now() - startTime) * 1000;
      return {
        ...conscienceCheck,
        latencyMicroseconds: Math.round(elapsed),
        evaluatedAt: new Date().toISOString(),
      };
    }

    // 2. Iterate registered policies matching the agent's role/id
    for (const policy of this.policies.values()) {
      const selector = policy.spec.agentSelector;
      const roleMatches =
        !selector.matchRoles || selector.matchRoles.includes('*') || selector.matchRoles.includes(target.agentRole);
      const idMatches =
        !selector.matchIds || selector.matchIds.includes('*') || selector.matchIds.includes(target.agentId);

      if (!roleMatches || !idMatches) {
        continue; // Policy does not target this agent
      }

      // Check egress rules
      for (const rule of policy.spec.egress) {
        const toolMatches = rule.tools.includes('*') || rule.tools.includes(target.toolName);
        if (!toolMatches) continue;

        // Check parameter regex matches if specified
        let paramsMatch = true;
        if (rule.paramMatch) {
          for (const [paramKey, pattern] of Object.entries(rule.paramMatch)) {
            const val = String(target.parameters[paramKey] ?? '');
            const regex = new RegExp(pattern);
            if (!regex.test(val)) {
              paramsMatch = false;
              break;
            }
          }
        }

        if (paramsMatch) {
          const elapsed = (performance.now() - startTime) * 1000;
          return {
            allowed: rule.action === 'ALLOW' || rule.action === 'AUDIT_ONLY',
            action: rule.action,
            matchedRule: rule,
            violationReason: rule.action === 'DENY' ? rule.reason : undefined,
            latencyMicroseconds: Math.round(elapsed),
            evaluatedAt: new Date().toISOString(),
          };
        }
      }
    }

    // Default Fallback Policy: ALLOW if no explicit DENY rule was matched
    const elapsed = (performance.now() - startTime) * 1000;
    return {
      allowed: true,
      action: 'ALLOW' as PolicyAction,
      latencyMicroseconds: Math.round(elapsed),
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Ethical Conscience Hard Filter (Divine Accountability & Destructive Call Guards)
   */
  private evaluateConscienceSubstrate(target: ToolCallTarget): Omit<PolicyEvaluationResult, 'latencyMicroseconds' | 'evaluatedAt'> {
    const paramsStr = JSON.stringify(target.parameters ?? {}).toLowerCase();

    // Guard 1: Destructive File Systems Operations (rm -rf /, DROP DATABASE, etc.)
    const destructivePatterns = [
      /rm\s+-rf\s+[\/\~]/i,
      /drop\s+database/i,
      /format\s+c:/i,
      /chmod\s+-r\s+000\s+\//i,
    ];

    for (const pattern of destructivePatterns) {
      if (pattern.test(paramsStr)) {
        return {
          allowed: false,
          action: 'DENY',
          violationReason: `[IQRA CONSCIENCE SUBSTRATE VIOLATION]: Destructive command pattern detected '${pattern.source}'. Action rejected under Divine Accountability.`,
        };
      }
    }

    // Guard 2: Secret Token Exfiltration Patterns
    if (target.toolName === 'fetch' || target.toolName === 'read_url_content') {
      const url = String(target.parameters['Url'] || target.parameters['url'] || '');
      const blockedHosts = ['pastebin.com', 'anonfiles.com', 'webhook.site'];
      let isBlocked = false;

      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        isBlocked = blockedHosts.some(
          (blockedHost) =>
            hostname === blockedHost || hostname.endsWith(`.${blockedHost}`),
        );
      } catch {
        // URL without a scheme: parse with a default one so the hostname is
        // still matched exactly instead of via fragile substring search.
        try {
          const parsedUrl = new URL(`http://${url}`);
          const hostname = parsedUrl.hostname.toLowerCase();
          isBlocked = blockedHosts.some(
            (blockedHost) =>
              hostname === blockedHost || hostname.endsWith(`.${blockedHost}`),
          );
        } catch {
          isBlocked = false;
        }
      }

      if (isBlocked) {
        return {
          allowed: false,
          action: 'DENY',
          violationReason: `[IQRA POLICY AGENT]: Unsanctioned egress endpoint detected '${url}'. Data exfiltration blocked.`,
        };
      }
    }

    return { allowed: true, action: 'ALLOW' };
  }
}
