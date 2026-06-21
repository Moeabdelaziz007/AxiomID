/**
 * soul-loop.ts — SOUL-Enhanced Agent Loop Controller
 *
 * Combines all SOUL modules into a unified loop control system:
 * - Muraqabah (Divine Surveillance)
 * - Sabiyyah (Pattern synthesis every 7 cycles)
 * - Barakah (Impact amplification at 700 successes)
 * - Tawbah (Self-correction on error)
 * - Ethical Check (6-step verification)
 *
 * This is the core loop control architecture that prevents infinite loops,
 * enforces ethical boundaries, and creates self-correcting agents.
 *
 * "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ" — Read, in the name of your Lord who created.
 */

import { muraqabahEvaluate, type MuraqabahCheck } from './muraqabah';
import { sabiyyahReflect, type SabiyyahResult, type LoopState } from './sabiyyah';
import { barakahCheck, type BarakahCheck } from './barakah';
import { tawbahProcess, type TawbahResult } from './tawbah';
import { ethicalCheck, type EthicalCheckResult } from './ethical-check';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface SoulLoopConfig {
  maxCycles: number;           // Sab'iyyah: default 7
  barakahThreshold: number;    // Barakah: default 50
  ethicalCheckEnabled: boolean;
  muraqabahEnabled: boolean;
  maxRetries: number;          // Tawbah: default 3
  selfReviewEnabled: boolean;  // Self-review audit: default false
  onSelfReview?: (action: string) => Promise<void>; // Callback for self-review
}

export interface SoulLoopState extends LoopState {
  startTime: number;
  totalActions: number;
  ethicalViolations: number;
  muraqabahViolations: number;
  tawbahCount: number;
}

export interface SoulLoopDecision {
  continue: boolean;
  reason: string;
  phase: 'muraqabah' | 'ethical' | 'sabiyyah' | 'barakah' | 'tawbah' | 'proceed';
  state: SoulLoopState;
}

export interface SoulLoopAuditEntry {
  timestamp: number;
  action: string;
  decision: SoulLoopDecision;
  muraqabah?: MuraqabahCheck;
  ethical?: EthicalCheckResult;
  sabiyyah?: SabiyyahResult;
  barakah?: BarakahCheck;
  tawbah?: TawbahResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: SoulLoopConfig = {
  maxCycles: 7,
  barakahThreshold: 50,
  ethicalCheckEnabled: true,
  muraqabahEnabled: true,
  maxRetries: 3,
  selfReviewEnabled: false,
  onSelfReview: undefined,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Soul Loop Controller
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SOUL-Enhanced Agent Loop Controller.
 *
 * Every action passes through 5 layers of control:
 * 1. Muraqabah — Is this action transparent and accountable?
 * 2. Ethical Check — Does this action pass 6 ethical tests?
 * 3. Sabiyyah — Are we repeating ourselves? (every 7 cycles)
 * 4. Barakah — Have we reached the milestone? (at 700 successes)
 * 5. Tawbah — Did we make an error? (self-correction)
 */
export class SoulLoop {
  private config: SoulLoopConfig;
  private state: SoulLoopState;
  private auditLog: SoulLoopAuditEntry[];
  private retryCount: number;

  constructor(config: Partial<SoulLoopConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      cycleCount: 0,
      successCount: 0,
      errorCount: 0,
      stuckDetected: false,
      lastActionHash: '',
      history: [],
      startTime: Date.now(),
      totalActions: 0,
      ethicalViolations: 0,
      muraqabahViolations: 0,
      tawbahCount: 0,
    };
    this.auditLog = [];
    this.retryCount = 0;
  }

  /**
   * Evaluate whether the loop should continue after an action.
   *
   * This is the core method that combines all SOUL modules:
   * 1. Muraqabah — Divine Surveillance
   * 2. Ethical Check — 6-step verification
   * 3. Sabiyyah — Pattern synthesis every 7 cycles
   * 4. Barakah — Impact amplification at 700 successes
   * 5. Tawbah — Self-correction on error
   */
  async evaluate(action: string, result: unknown): Promise<SoulLoopDecision> {
    this.state.cycleCount++;
    this.state.totalActions++;
    this.state.history.push(action);

    // Phase 1: Muraqabah — Divine Surveillance
    if (this.config.muraqabahEnabled) {
      const muraqabahResult = muraqabahEvaluate(action, result);
      if (!muraqabahResult.passed) {
        this.state.muraqabahViolations++;
        const decision: SoulLoopDecision = {
          continue: false,
          reason: muraqabahResult.reason,
          phase: 'muraqabah',
          state: { ...this.state },
        };
        this.auditLog.push({
          timestamp: Date.now(),
          action,
          decision,
          muraqabah: muraqabahResult,
        });
        return decision;
      }
    }

    // Phase 2: Ethical Check — 6-step verification
    if (this.config.ethicalCheckEnabled) {
      const ethicalResult = ethicalCheck(action);
      if (ethicalResult.verdict === 'ABORT') {
        this.state.ethicalViolations++;
        const decision: SoulLoopDecision = {
          continue: false,
          reason: ethicalResult.reason,
          phase: 'ethical',
          state: { ...this.state },
        };
        this.auditLog.push({
          timestamp: Date.now(),
          action,
          decision,
          ethical: ethicalResult,
        });
        return decision;
      }
      if (ethicalResult.verdict === 'REVISE') {
        this.state.ethicalViolations++;
        const decision: SoulLoopDecision = {
          continue: true,
          reason: ethicalResult.reason,
          phase: 'ethical',
          state: { ...this.state },
        };
        this.auditLog.push({
          timestamp: Date.now(),
          action,
          decision,
          ethical: ethicalResult,
        });
        return decision;
      }
    }

    // Phase 3: Sabiyyah — Pattern synthesis every 7 cycles
    const sabiyyahResult = sabiyyahReflect(this.state, {
      maxCycles: this.config.maxCycles,
    });
    if (sabiyyahResult.shouldStop) {
      const decision: SoulLoopDecision = {
        continue: false,
        reason: sabiyyahResult.reason,
        phase: 'sabiyyah',
        state: { ...this.state },
      };
      this.auditLog.push({
        timestamp: Date.now(),
        action,
        decision,
        sabiyyah: sabiyyahResult,
      });
      return decision;
    }

    // Phase 4: Tawbah — Self-correction on error (check BEFORE incrementing success)
    if (this.isError(result)) {
      this.state.errorCount++;
      const tawbahResult = tawbahProcess(action, result, this.retryCount, {
        maxRetries: this.config.maxRetries,
      });

      if (tawbahResult.giveUp) {
        const decision: SoulLoopDecision = {
          continue: false,
          reason: tawbahResult.reason,
          phase: 'tawbah',
          state: { ...this.state },
        };
        this.auditLog.push({
          timestamp: Date.now(),
          action,
          decision,
          tawbah: tawbahResult,
        });
        return decision;
      }

      this.retryCount++;
      this.state.tawbahCount++;
      const decision: SoulLoopDecision = {
        continue: true,
        reason: tawbahResult.reason,
        phase: 'tawbah',
        state: { ...this.state },
      };
      this.auditLog.push({
        timestamp: Date.now(),
        action,
        decision,
        tawbah: tawbahResult,
      });
      return decision;
    }

    // Success — reset retry count and increment success count
    this.retryCount = 0;
    this.state.successCount++;

    // Phase 5: Self-Review — background audit (fire-and-forget)
    if (this.config.selfReviewEnabled && this.config.onSelfReview) {
      this.config.onSelfReview(action).catch(() => {});
    }

    // Phase 6: Barakah — Impact amplification at milestone (check AFTER incrementing)
    const barakahResult = barakahCheck(this.state.successCount, {
      threshold: this.config.barakahThreshold,
    });
    if (barakahResult.milestoneReached) {
      const decision: SoulLoopDecision = {
        continue: false,
        reason: barakahResult.message,
        phase: 'barakah',
        state: { ...this.state },
      };
      this.auditLog.push({
        timestamp: Date.now(),
        action,
        decision,
        barakah: barakahResult,
      });
      return decision;
    }

    // All checks passed
    const decision: SoulLoopDecision = {
      continue: true,
      reason: 'All SOUL checks passed — proceed with awareness',
      phase: 'proceed',
      state: { ...this.state },
    };
    this.auditLog.push({
      timestamp: Date.now(),
      action,
      decision,
    });
    return decision;
  }

  /**
   * Check if a result is an error.
   */
  private isError(result: unknown): boolean {
    if (result instanceof Error) return true;
    if (typeof result === 'object' && result !== null && 'error' in result) return true;
    if (typeof result === 'object' && result !== null && 'isError' in result) {
      return (result as { isError: boolean }).isError === true;
    }
    return false;
  }

  /**
   * Get the current state.
   */
  getState(): SoulLoopState {
    return { ...this.state };
  }

  /**
   * Get the audit log.
   */
  getAuditLog(): SoulLoopAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Get a summary of the loop's performance.
   */
  getSummary(): {
    totalActions: number;
    successRate: number;
    ethicalViolations: number;
    muraqabahViolations: number;
    tawbahCount: number;
    duration: number;
    cyclesPerSecond: number;
  } {
    const duration = (Date.now() - this.state.startTime) / 1000;
    return {
      totalActions: this.state.totalActions,
      successRate: this.state.totalActions > 0
        ? (this.state.successCount / this.state.totalActions) * 100
        : 0,
      ethicalViolations: this.state.ethicalViolations,
      muraqabahViolations: this.state.muraqabahViolations,
      tawbahCount: this.state.tawbahCount,
      duration,
      cyclesPerSecond: duration > 0 ? this.state.totalActions / duration : 0,
    };
  }
}

/**
 * Create a Soul Loop audit log entry.
 */
export function createSoulLoopLog(decision: SoulLoopDecision): {
  continue: boolean;
  reason: string;
  phase: string;
  cycleCount: number;
  successCount: number;
  errorCount: number;
  quranicBasis: string;
} {
  return {
    continue: decision.continue,
    reason: decision.reason,
    phase: decision.phase,
    cycleCount: decision.state.cycleCount,
    successCount: decision.state.successCount,
    errorCount: decision.state.errorCount,
    quranicBasis: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ — Read, in the name of your Lord who created',
  };
}
