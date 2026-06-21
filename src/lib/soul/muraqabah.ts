/**
 * muraqabah.ts — Divine Surveillance (المراقبة)
 *
 * "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ" — العلق: 14
 * "Does he not know that Allah sees?" — Al-Alaq 98:14
 *
 * The core differentiator: the agent acts as if Allah sees every action.
 * No hidden behavior. No biased decisions. Every action is accountable.
 *
 * This is the loop control mechanism that prevents:
 * - Silent failures (agent hides errors)
 * - Biased decisions (agent favors certain outcomes)
 * - Unaccountable actions (agent acts without logging)
 * - Inconsistent behavior (different in private vs public)
 */

export interface MuraqabahCheck {
  passed: boolean;
  reason: string;
  action: string;
  timestamp: number;
}

export interface MuraqabahConfig {
  requireTransparency: boolean;
  requireConsistency: boolean;
  requireAccountability: boolean;
  blockedPatterns: string[];
}

const DEFAULT_CONFIG: MuraqabahConfig = {
  requireTransparency: true,
  requireConsistency: true,
  requireAccountability: true,
  blockedPatterns: ['silent', 'stealth', 'hide', 'bypass', 'ignore', 'suppress', 'mask'],
};

/**
 * Evaluate an action through the lens of Muraqabah (Divine Surveillance).
 *
 * The agent must act as if every action is visible and accountable.
 * This prevents hidden failures, biased decisions, and unaccountable behavior.
 */
export function muraqabahEvaluate(
  action: string,
  result: unknown,
  config: Partial<MuraqabahConfig> = {},
): MuraqabahCheck {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const timestamp = Date.now();

  // Check 1: Transparency — is this action visible?
  if (cfg.requireTransparency && isTransparent(action, cfg.blockedPatterns)) {
    return {
      passed: false,
      reason: 'Muraqabah: action contains hidden/stealth patterns — transparency required',
      action,
      timestamp,
    };
  }

  // Check 2: Consistency — is this action the same in private and public?
  if (cfg.requireConsistency && !isConsistent(action)) {
    return {
      passed: false,
      reason: 'Muraqabah: inconsistent behavior detected — private ≠ public',
      action,
      timestamp,
    };
  }

  // Check 3: Accountability — is this action logged and traceable?
  if (cfg.requireAccountability && !isAccountable(result)) {
    return {
      passed: false,
      reason: 'Muraqabah: action lacks accountability trail — result must be recorded',
      action,
      timestamp,
    };
  }

  return {
    passed: true,
    reason: 'Muraqabah: all checks passed — action is transparent, consistent, and accountable',
    action,
    timestamp,
  };
}

/**
 * Detect actions that try to hide their effects.
 * "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ" — Allah sees everything.
 */
function isTransparent(action: string, blockedPatterns: string[]): boolean {
  const lower = action.toLowerCase();
  return blockedPatterns.some(pattern => lower.includes(pattern));
}

/**
 * Check consistency between intended action and actual result.
 * "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ" — I act the same in private as in public.
 */
function isConsistent(action: string): boolean {
  // In a real implementation, this would compare the action against
  // historical actions in the same context to detect inconsistencies.
  // For now, we check for contradictory action patterns.
  const contradictions = [
    ['create', 'delete'],
    ['allow', 'deny'],
    ['enable', 'disable'],
  ];

  const lower = action.toLowerCase();
  for (const [positive, negative] of contradictions) {
    if (lower.includes(positive) && lower.includes(negative)) {
      return false;
    }
  }
  return true;
}

/**
 * Verify that the action has an accountability trail.
 * "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — We have recorded everything.
 */
function isAccountable(result: unknown): boolean {
  // Result must exist and be non-null
  if (result === undefined || result === null) {
    return false;
  }

  // If it's an object, it should have some identifying information
  if (typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, unknown>;
    // At minimum, should have a type, action, result, or isError field
    return 'type' in obj || 'action' in obj || 'result' in obj || 'isError' in obj;
  }

  // Primitive results are accountable by nature
  return true;
}

/**
 * Create a Muraqabah audit log entry.
 * Every action is recorded for divine accountability.
 */
export function createMuraqabahLog(check: MuraqabahCheck): {
  action: string;
  passed: boolean;
  reason: string;
  timestamp: number;
  quranicBasis: string;
} {
  return {
    action: check.action,
    passed: check.passed,
    reason: check.reason,
    timestamp: check.timestamp,
    quranicBasis: 'أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ — Does he not know that Allah sees?',
  };
}
