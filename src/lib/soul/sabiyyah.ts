/**
 * sabiyyah.ts — Wisdom of Seven (حكمة السبع)
 *
 * "المنظومة السبع" — Pattern synthesis every 7 cycles
 * "التكرار المحكم" — Controlled repetition
 *
 * Every 7 work cycles, the agent reflects on its progress:
 * - Are we repeating ourselves?
 * - Is the error rate increasing?
 * - Is the pattern balanced?
 * - What wisdom can we extract?
 *
 * This is the natural stopping point that prevents infinite loops
 * without arbitrary step counts.
 */

export interface LoopState {
  cycleCount: number;
  successCount: number;
  errorCount: number;
  stuckDetected: boolean;
  lastActionHash: string;
  history: string[];
}

export interface SabiyyahResult {
  shouldStop: boolean;
  reason: string;
  wisdom: string;
  cycleCount: number;
  uniqueActions: number;
  errorRate: number;
}

export interface SabiyyahConfig {
  maxCycles: number;           // Default: 7 (Sab'iyyah)
  maxUniqueRatio: number;      // Default: 0.3 (≤30% unique = stuck)
  maxErrorRate: number;        // Default: 0.5 (50% errors = stop)
}

const DEFAULT_CONFIG: SabiyyahConfig = {
  maxCycles: 7,
  maxUniqueRatio: 0.3,
  maxErrorRate: 0.5,
};

/**
 * Reflect on loop state every 7 cycles.
 * "قُلْ هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ" — Az-Zumar 39:9
 * "Say: Are those who know equal to those who do not know?"
 */
export function sabiyyahReflect(
  state: LoopState,
  config: Partial<SabiyyahConfig> = {},
): SabiyyahResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Only reflect every N cycles
  if (state.cycleCount % cfg.maxCycles !== 0) {
    return {
      shouldStop: false,
      reason: 'Sabi\'iyyah: not yet at reflection point',
      wisdom: 'Continue with awareness — reflection comes every 7 cycles',
      cycleCount: state.cycleCount,
      uniqueActions: 0,
      errorRate: 0,
    };
  }

  // Analyze the last N actions
  const recentActions = state.history.slice(-cfg.maxCycles);
  const uniqueActions = new Set(recentActions).size;
  const uniqueRatio = recentActions.length > 0 ? uniqueActions / recentActions.length : 0;

  // Check 1: Repetitive pattern — "لا يُلدغ المؤمن من جحر واحد مرتين"
  if (uniqueRatio <= cfg.maxUniqueRatio) {
    return {
      shouldStop: true,
      reason: `Sabi'iyyah: repetitive pattern detected (${uniqueActions}/${recentActions.length} unique actions)`,
      wisdom: 'لا يُلدغ المؤمن من جحر واحد مرتين — A believer is not stung from the same hole twice',
      cycleCount: state.cycleCount,
      uniqueActions,
      errorRate: state.cycleCount > 0 ? state.errorCount / state.cycleCount : 0,
    };
  }

  // Check 2: Error rate too high
  const errorRate = state.cycleCount > 0 ? state.errorCount / state.cycleCount : 0;
  if (errorRate > cfg.maxErrorRate) {
    return {
      shouldStop: true,
      reason: `Sabi'iyyah: error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`,
      wisdom: 'حاسبوا أنفسكم قبل أن تُحاسَبوا — Account yourselves before you are accounted for',
      cycleCount: state.cycleCount,
      uniqueActions,
      errorRate,
    };
  }

  // Check 3: Pattern synthesis — extract wisdom
  const wisdom = synthesizeWisdom(recentActions);

  return {
    shouldStop: false,
    reason: 'Sabi\'iyyah: pattern is healthy, continue',
    wisdom,
    cycleCount: state.cycleCount,
    uniqueActions,
    errorRate,
  };
}

/**
 * Synthesize wisdom from recent actions.
 * "ميزان الأضداد" — Balance of opposites
 * "المنظومة السبع" — Organized patterns in groups of seven
 */
function synthesizeWisdom(actions: string[]): string {
  if (actions.length === 0) {
    return 'No actions to synthesize wisdom from';
  }

  // Check balance: reads vs writes, creates vs deletes
  const reads = actions.filter(a => /read|get|fetch|query|search/i.test(a)).length;
  const writes = actions.filter(a => /write|create|update|insert|post/i.test(a)).length;
  const deletes = actions.filter(a => /delete|remove|destroy/i.test(a)).length;

  const totalOps = reads + writes + deletes;
  if (totalOps === 0) {
    return 'Pattern: all actions are non-standard. Seek balance between creation and retrieval.';
  }

  const readRatio = reads / totalOps;
  const writeRatio = writes / totalOps;

  // "ميزان الأضداد" — Balance of opposites
  if (readRatio > 0.7) {
    return 'Pattern: heavy on reads, light on writes. The agent is consuming but not producing. Seek balance.';
  }
  if (writeRatio > 0.7) {
    return 'Pattern: heavy on writes, light on reads. The agent is producing but not verifying. Seek balance.';
  }
  if (deletes > writes) {
    return 'Pattern: more deletions than creations. The agent is destroying more than building. Reflect on purpose.';
  }

  // "المنظومة السبع" — Organized patterns in groups of seven
  const patterns = groupIntoSevens(actions);
  if (patterns.length > 1) {
    return `Pattern: ${patterns.length} groups of 7 detected. The agent is following organized cycles. Continue with wisdom.`;
  }

  return 'Pattern: balanced and healthy. Continue with awareness.';
}

/**
 * Group actions into cycles of 7.
 * "المنظومة السبع" — The Sevenfold System
 */
function groupIntoSevens(actions: string[]): string[][] {
  const groups: string[][] = [];
  for (let i = 0; i < actions.length; i += 7) {
    groups.push(actions.slice(i, i + 7));
  }
  return groups;
}

/**
 * Create a Sabiyyah audit log entry.
 */
export function createSabiyyahLog(result: SabiyyahResult): {
  cycleCount: number;
  shouldStop: boolean;
  reason: string;
  wisdom: string;
  uniqueActions: number;
  errorRate: number;
  quranicBasis: string;
} {
  return {
    cycleCount: result.cycleCount,
    shouldStop: result.shouldStop,
    reason: result.reason,
    wisdom: result.wisdom,
    uniqueActions: result.uniqueActions,
    errorRate: result.errorRate,
    quranicBasis: 'قُلْ هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ — Say: Are those who know equal to those who do not know?',
  };
}
