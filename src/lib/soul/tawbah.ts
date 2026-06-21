/**
 * tawbah.ts — Self-Correction Protocol (التوبة)
 *
 * "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ" — البقرة: 222
 * "Indeed, Allah loves those who repent" — Al-Baqarah 2:222
 *
 * When the agent makes an error:
 * 1. Confess (اعتراف) — acknowledge the mistake
 * 2. Repair (إصلاح) — fix what went wrong
 * 3. Extract Wisdom (استخراج الحكمة) — learn from the error
 * 4. Strengthen Boundaries (تقوية الحدود) — prevent recurrence
 * "لا يُلدغ المؤمن من جحر واحد مرتين" — A believer is not stung from the same hole twice
 */

export type ErrorType =
  | 'TIMEOUT'
  | 'PERMISSION'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'VALIDATION'
  | 'NETWORK'
  | 'LOGIC'
  | 'ETHICAL'
  | 'CONFLICT'
  | 'UNKNOWN';

export interface TawbahResult {
  giveUp: boolean;
  reason: string;
  lesson: string;
  errorType: ErrorType;
  canRepair: boolean;
  shouldStrengthenBoundaries: boolean;
}

export interface TawbahConfig {
  maxRetries: number;          // Default: 3
  repairableErrors: ErrorType[];
  criticalErrors: ErrorType[];
}

const DEFAULT_CONFIG: TawbahConfig = {
  maxRetries: 3,
  repairableErrors: ['TIMEOUT', 'NOT_FOUND', 'RATE_LIMIT', 'NETWORK'],
  criticalErrors: ['ETHICAL', 'PERMISSION', 'CONFLICT'],
};

/**
 * Process an error through the Tawbah (Self-Correction) protocol.
 * "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ" — Allah loves those who repent
 */
export function tawbahProcess(
  action: string,
  error: unknown,
  retryCount: number = 0,
  config: Partial<TawbahConfig> = {},
): TawbahResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Classify the error (اعتراف — confess)
  const errorType = classifyError(error);

  // Step 2: Check if critical (لا توبة لذنب بدون إصلاح)
  if (cfg.criticalErrors.includes(errorType)) {
    return {
      giveUp: true,
      reason: `Tawbah: critical error (${errorType}) — cannot proceed without human intervention`,
      lesson: extractLesson(action, error, errorType),
      errorType,
      canRepair: false,
      shouldStrengthenBoundaries: true,
    };
  }

  // Step 3: Check if repairable (إصلاح — repair)
  const canRepair = cfg.repairableErrors.includes(errorType);

  // Step 4: Check retry count
  if (retryCount >= cfg.maxRetries) {
    return {
      giveUp: true,
      reason: `Tawbah: max retries (${cfg.maxRetries}) exceeded for ${errorType}`,
      lesson: extractLesson(action, error, errorType),
      errorType,
      canRepair: false,
      shouldStrengthenBoundaries: true,
    };
  }

  // Step 5: Extract wisdom (استخراج الحكمة)
  const lesson = extractLesson(action, error, errorType);

  return {
    giveUp: false,
    reason: `Tawbah: ${errorType} error classified, repair possible (attempt ${retryCount + 1}/${cfg.maxRetries})`,
    lesson,
    errorType,
    canRepair,
    shouldStrengthenBoundaries: retryCount > 0,
  };
}

/**
 * Classify an error into a type.
 * "اعتراف" — Confess and classify
 *
 * Handles:
 * - Error instances (via .message)
 * - Plain objects with { error: string, code?: number }
 * - String errors
 */
function classifyError(error: unknown): ErrorType {
  // Handle plain objects with error/code fields (e.g. { error: 'conflict', code: 409 })
  if (typeof error === 'object' && error !== null && !(error instanceof Error)) {
    const obj = error as Record<string, unknown>;

    if (typeof obj.code === 'number') {
      switch (obj.code) {
        case 409: return 'CONFLICT';
        case 404: return 'NOT_FOUND';
        case 429: return 'RATE_LIMIT';
        case 403: case 401: return 'PERMISSION';
        case 422: return 'VALIDATION';
      }
    }

    if (typeof obj.error === 'string') {
      const lower = obj.error.toLowerCase();
      if (lower.includes('conflict')) return 'CONFLICT';
      if (lower.includes('timeout') || lower.includes('timed out')) return 'TIMEOUT';
      if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('unauthorized')) return 'PERMISSION';
      if (lower.includes('not found') || lower.includes('404')) return 'NOT_FOUND';
      if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) return 'RATE_LIMIT';
      if (lower.includes('validation') || lower.includes('invalid') || lower.includes('schema')) return 'VALIDATION';
      if (lower.includes('network') || lower.includes('connection') || lower.includes('fetch')) return 'NETWORK';
      if (lower.includes('logic') || lower.includes('invariant') || lower.includes('assertion')) return 'LOGIC';
      if (lower.includes('ethical') || lower.includes('forbidden') || lower.includes('blocked')) return 'ETHICAL';
    }

    return 'UNKNOWN';
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('conflict') || lower.includes('409')) return 'CONFLICT';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'TIMEOUT';
  if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('unauthorized')) return 'PERMISSION';
  if (lower.includes('not found') || lower.includes('404')) return 'NOT_FOUND';
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) return 'RATE_LIMIT';
  if (lower.includes('validation') || lower.includes('invalid') || lower.includes('schema')) return 'VALIDATION';
  if (lower.includes('network') || lower.includes('connection') || lower.includes('fetch')) return 'NETWORK';
  if (lower.includes('logic') || lower.includes('invariant') || lower.includes('assertion')) return 'LOGIC';
  if (lower.includes('ethical') || lower.includes('forbidden') || lower.includes('blocked')) return 'ETHICAL';

  return 'UNKNOWN';
}

/**
 * Extract wisdom from an error.
 * "استخراج الحكمة" — Extract the wisdom
 */
function extractLesson(action: string, error: unknown, errorType: ErrorType): string {
  const message = error instanceof Error ? error.message : String(error);

  const lessons: Record<ErrorType, string> = {
    TIMEOUT: `Lesson: ${action} timed out. The system was under pressure. Consider increasing timeout or reducing scope.`,
    PERMISSION: `Lesson: ${action} lacked permissions. Access was not granted. Verify credentials before retrying.`,
    NOT_FOUND: `Lesson: ${action} target not found. The resource may have moved or been deleted. Verify path.`,
    RATE_LIMIT: `Lesson: ${action} was rate-limited. The system is under load. Wait before retrying.`,
    VALIDATION: `Lesson: ${action} failed validation. Input was malformed. Check schema before retrying.`,
    NETWORK: `Lesson: ${action} had network issues. Connectivity was lost. Check network status.`,
    LOGIC: `Lesson: ${action} had logic error. The code path was incorrect. Review logic.`,
    ETHICAL: `Lesson: ${action} violated ethical boundaries. The action was harmful. Do not retry.`,
    CONFLICT: `Lesson: ${action} encountered a conflict (409). The resource state changed. Re-fetch before retrying.`,
    UNKNOWN: `Lesson: ${action} failed with unknown error: ${message}. Investigate further.`,
  };

  return lessons[errorType];
}

/**
 * Create a Tawbah audit log entry.
 */
export function createTawbahLog(result: TawbahResult): {
  giveUp: boolean;
  reason: string;
  lesson: string;
  errorType: ErrorType;
  canRepair: boolean;
  quranicBasis: string;
} {
  return {
    giveUp: result.giveUp,
    reason: result.reason,
    lesson: result.lesson,
    errorType: result.errorType,
    canRepair: result.canRepair,
    quranicBasis: 'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ — Indeed, Allah loves those who repent',
  };
}
