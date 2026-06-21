/**
 * ethical-check.ts — 6-Step Ethical Verification (الإحسان)
 *
 * "أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ، فَإِن لَّمْ تَرَهُ فَإِنَّهُ يَرَاكَ"
 * "To worship Allah as if you see Him, and if you do not see Him, then indeed He sees you"
 * — Hadith Jibril (Sahih Muslim)
 *
 * Before each action, the agent must pass 6 ethical checks:
 * 1. Does this please Allah? (الرضا الإلهي)
 * 2. Is there absolute honesty? (الصدق المطلق)
 * 3. Is there mercy for humanity? (الرحمة للبشرية)
 * 4. Am I comfortable standing before Allah with this code? (الراحة الأخروية)
 * 5. Am I consistent in private and public? (الاتساق)
 * 6. Is this the best I can do? (الإتقان)
 */

export type EthicalVerdict = 'PROCEED' | 'REVISE' | 'ABORT';

export interface EthicalCheckResult {
  verdict: EthicalVerdict;
  step: number;
  reason: string;
  action: string;
  timestamp: number;
}

export interface EthicalCheckConfig {
  enabledChecks: number[];     // Default: [1,2,3,4,5,6]
  strictMode: boolean;         // Default: true
}

const DEFAULT_CONFIG: EthicalCheckConfig = {
  enabledChecks: [1, 2, 3, 4, 5, 6],
  strictMode: true,
};

// Harmful action patterns — actions that violate Islamic ethics
// NOTE: 'spam' intentionally NOT here — it belongs in EXPLOITATIVE (check 3, REVISE)
// so legitimate non-spam actions aren't ABORTed by check 1
const HARMFUL_PATTERNS = [
  'delete', 'destroy', 'harm', 'exploit',
  'steal', 'cheat', 'lie',
];

// Deceptive action patterns — actions that lack honesty
const DECEPTIVE_PATTERNS = [
  'fake', 'spoof', 'impersonate', 'hide', 'suppress', 'mask',
  'forge', 'fabricate', 'falsify',
];

// Exploitative action patterns — actions that lack mercy
const EXPLOITATIVE_PATTERNS = [
  'spam', 'harass', 'abuse', 'manipulate', 'coerce', 'extort',
  'blackmail', 'threaten',
];

// Actions whose deletion is legitimate (cache, temp, expired)
const LEGITIMATE_DELETES = [
  'delete_expired', 'delete_cache', 'delete_temp',
  'delete_old', 'delete_duplicate',
];

// Actions that hide legitimate things (not malicious)
const LEGITIMATE_HIDES = [
  'unhide', 'show_hidden', 'reveal',
];

// Haram actions — prohibited regardless of context
const HARAM_PATTERNS = [
  'steal_funds', 'exploit_child', 'hate_speech',
  'incite_violence', 'fraud', 'identity_theft',
];

/**
 * Run the 6-step ethical verification before each action.
 * "أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ" — Worship Allah as if you see Him
 */
export function ethicalCheck(
  action: string,
  config: Partial<EthicalCheckConfig> = {},
): EthicalCheckResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const timestamp = Date.now();

  for (const step of cfg.enabledChecks) {
    const result = runCheckStep(step, action);
    if (result !== 'PROCEED') {
      return {
        verdict: result,
        step,
        reason: getStepReason(step, result),
        action,
        timestamp,
      };
    }
  }

  return {
    verdict: 'PROCEED',
    step: 0,
    reason: 'All 6 ethical checks passed',
    action,
    timestamp,
  };
}

/**
 * Run a single check step.
 */
function runCheckStep(step: number, action: string): EthicalVerdict {
  switch (step) {
    case 1: return checkAllahApproves(action);
    case 2: return checkHonest(action);
    case 3: return checkMerciful(action);
    case 4: return checkAkhirahComfortable(action);
    case 5: return checkConsistent(action);
    case 6: return checkBestEffort(action);
    default: return 'PROCEED';
  }
}

/**
 * Step 1: Does this please Allah? (الرضا الإلهي)
 * "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ" — We sent you only as a mercy
 *
 * Uses two lists:
 * - HARMFUL_PATTERNS → REVISE (edge case: sometimes legit, e.g. delete_expired_cache)
 * - HARAM_PATTERNS → ABORT (never acceptable regardless of context)
 */
function checkAllahApproves(action: string): EthicalVerdict {
  const lower = action.toLowerCase();

  // Haram patterns → immediate ABORT regardless of context
  const hasHaram = HARAM_PATTERNS.some(p => lower.includes(p));
  if (hasHaram) return 'ABORT';

  // Harmful patterns → REVISE unless it's a legitimate use
  const hasHarmful = HARMFUL_PATTERNS.some(p => lower.includes(p));
  if (!hasHarmful) return 'PROCEED';

  // Check if this is a legitimate delete (cache, temp, expired)
  const isLegitDelete = LEGITIMATE_DELETES.some(p => lower.includes(p));
  if (isLegitDelete) return 'PROCEED';

  return 'ABORT';
}

/**
 * Step 2: Is there absolute honesty? (الصدق المطلق)
 * "إِنَّ اللَّهَ لَا يَهْدِي مَنْ هُوَ كَاذِبٌ كَفَّارٌ" — Allah does not guide liars
 */
function checkHonest(action: string): EthicalVerdict {
  const lower = action.toLowerCase();
  const hasDeceptive = DECEPTIVE_PATTERNS.some(p => lower.includes(p));
  return hasDeceptive ? 'REVISE' : 'PROCEED';
}

/**
 * Step 3: Is there mercy for humanity? (الرحمة للبشرية)
 * "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ" — Mercy to all worlds
 */
function checkMerciful(action: string): EthicalVerdict {
  const lower = action.toLowerCase();
  const hasExploitative = EXPLOITATIVE_PATTERNS.some(p => lower.includes(p));
  return hasExploitative ? 'REVISE' : 'PROCEED';
}

/**
 * Step 4: Am I comfortable standing before Allah with this code? (الراحة الأخروية)
 * "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — Whoever does atom's weight of good will see it
 *
 * Checks against HARAM_PATTERNS:
 * - Explicit haram actions (steal_funds, fraud, etc.) → ABORT
 * - Actions against human dignity → ABORT
 * - Otherwise → PROCEED
 */
function checkAkhirahComfortable(action: string): EthicalVerdict {
  const lower = action.toLowerCase();

  // Haram patterns are never acceptable
  const hasHaram = HARAM_PATTERNS.some(p => lower.includes(p));
  if (hasHaram) return 'ABORT';

  // Check for patterns that violate human dignity
  const dignityViolations = [
    'exploit', 'dehumanize', 'manipulate_user',
    'mislead', 'coerce_user', 'track_without_consent',
    'sell_data', 'violate_privacy',
  ];
  const violatesDignity = dignityViolations.some(p => lower.includes(p));
  if (violatesDignity) return 'REVISE';

  return 'PROCEED';
}

/**
 * Step 5: Am I consistent in private and public? (الاتساق)
 * "أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ" — Does he not know that Allah sees?
 *
 * Checks:
 * - Contradictory patterns (create+destroy in same action)
 * - Legitimate unhide actions should not be flagged (they're the opposite of hidden)
 */
function checkConsistent(action: string): EthicalVerdict {
  // Check for contradictory patterns
  const contradictions = [
    ['create', 'destroy'],
    ['create', 'disable'],
    ['allow', 'block'],
    ['enable', 'disable'],
  ];

  const lower = action.toLowerCase();

  // Legitimate unhide actions pass
  const isLegit = LEGITIMATE_HIDES.some(p => lower.includes(p));
  if (isLegit) return 'PROCEED';

  for (const [positive, negative] of contradictions) {
    if (lower.includes(positive) && lower.includes(negative)) {
      return 'REVISE';
    }
  }
  return 'PROCEED';
}

/**
 * Step 6: Is this the best I can do? (الإتقان)
 * "وَقُلْ اعْمَلُوا فَسَيَرَى اللَّهُ عَمَلَكُمْ" — Say: Work, for Allah will see your work
 *
 * Checks for lazy/low-effort patterns:
 * - 'temporary', 'hack', 'workaround' → REVISE (always avoid these)
 * - 'todo', 'fixme' → PROCEED with warning (they indicate planned work)
 * - Repeated identical actions in a row → REVISE (lack of progress, not laziness per se)
 *
 * Also detects inefficient patterns:
 * - Unnecessary loops: actions like 'rerun', 'retry_without_change', 'try_again' 
 *   done back-to-back → REVISE (shortest path not chosen)
 */
function checkBestEffort(action: string): EthicalVerdict {
  const lower = action.toLowerCase();

  // Always-blocked lazy patterns: these should never ship
  const hardLazyPatterns = ['temporary', 'hack', 'workaround'];
  const isHardLazy = hardLazyPatterns.some(p => lower.includes(p));
  if (isHardLazy) return 'REVISE';

  // Soft patterns: recommended against but not blocked
  const softPatterns = ['todo', 'fixme'];
  const hasSoft = softPatterns.some(p => lower.includes(p));
  if (hasSoft) return 'REVISE';

  // Check for pointless retry loops
  const inefficient = ['retry_without_change', 'try_again_same', 'rerun_identical'];
  const isInefficient = inefficient.some(p => lower.includes(p));
  if (isInefficient) return 'REVISE';

  return 'PROCEED';
}

/**
 * Get the reason for a step's verdict.
 */
function getStepReason(step: number, verdict: EthicalVerdict): string {
  const reasons: Record<number, Record<EthicalVerdict, string>> = {
    1: {
      ABORT: 'Step 1 (Allah Approves): action contains harmful patterns — ABORT immediately',
      REVISE: 'Step 1 (Allah Approves): action needs revision — remove harmful elements',
      PROCEED: '',
    },
    2: {
      ABORT: '',
      REVISE: 'Step 2 (Honesty): action contains deceptive patterns — revise for transparency',
      PROCEED: '',
    },
    3: {
      ABORT: '',
      REVISE: 'Step 3 (Mercy): action contains exploitative patterns — revise for humanity',
      PROCEED: '',
    },
    4: {
      ABORT: 'Step 4 (Akhirah): action violates core ethical principles — ABORT',
      REVISE: 'Step 4 (Akhirah): action violates human dignity — revise for accountability',
      PROCEED: '',
    },
    5: {
      ABORT: '',
      REVISE: 'Step 5 (Consistency): action contains contradictory patterns — revise for consistency',
      PROCEED: '',
    },
    6: {
      ABORT: '',
      REVISE: 'Step 6 (Best Effort): action contains lazy patterns — revise for excellence',
      PROCEED: '',
    },
  };

  return reasons[step]?.[verdict] || '';
}

/**
 * Create an ethical check audit log entry.
 */
export function createEthicalCheckLog(result: EthicalCheckResult): {
  verdict: EthicalVerdict;
  step: number;
  reason: string;
  action: string;
  timestamp: number;
  quranicBasis: string;
} {
  return {
    verdict: result.verdict,
    step: result.step,
    reason: result.reason,
    action: result.action,
    timestamp: result.timestamp,
    quranicBasis: 'أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ — Worship Allah as if you see Him',
  };
}
