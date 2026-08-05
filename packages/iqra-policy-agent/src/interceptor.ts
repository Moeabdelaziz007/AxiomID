import { IqraPolicyEngine } from './policy-engine.js';
import { ToolCallTarget, PolicyEvaluationResult } from './types.js';

/**
 * IQRA Agentic Policy Interceptor
 * Wraps function/tool call execution with Zero-Trust eBPF-style agentic policy checks.
 */
export class IqraPolicyInterceptor {
  private engine: IqraPolicyEngine;

  constructor(engine: IqraPolicyEngine) {
    this.engine = engine;
  }

  /**
   * Intercepts and guards tool execution.
   * Throws a PolicyViolationError if the call is denied.
   */
  public async wrapToolExecution<T>(
    target: ToolCallTarget,
    executor: () => Promise<T>
  ): Promise<T> {
    const result: PolicyEvaluationResult = this.engine.evaluate(target);

    if (!result.allowed) {
      throw new Error(
        `⛔ [IQRA POLICY DENIAL]: Action blocked by Agentic Network Policy.\n` +
        `  • Tool: ${target.toolName}\n` +
        `  • Agent: ${target.agentId} (${target.agentRole})\n` +
        `  • Reason: ${result.violationReason || 'Policy Denied'}\n` +
        `  • Evaluated in: ${result.latencyMicroseconds}µs`
      );
    }

    // Execute wrapped tool call
    return await executor();
  }
}
