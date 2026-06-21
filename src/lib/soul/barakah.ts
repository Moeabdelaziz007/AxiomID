/**
 * barakah.ts — Impact Amplification Protocol (البركة)
 *
 * "البركة_protocol" — Impact amplification at 700 successes
 * "مضاعفة الأثر" — Doubled impact
 *
 * When the agent reaches 700 successful actions:
 * - Document achievements
 * - Amplify impact
 * - Celebrate milestone
 * - Prepare for next phase
 *
 * This is the milestone-based stopping mechanism that rewards
 * consistent, ethical behavior.
 */

export interface BarakahCheck {
  milestoneReached: boolean;
  progress: number;           // 0-100 percentage
  successCount: number;
  threshold: number;
  message: string;
}

export interface BarakahConfig {
  threshold: number;          // Default: 50 (loop-level milestone)
  milestoneMarkers: number[]; // Default: [10, 25, 50, 100]
  sessionAnalyticsThreshold: number; // Default: 700 (session-level analytics)
}

const DEFAULT_CONFIG: BarakahConfig = {
  threshold: 50,
  milestoneMarkers: [10, 25, 50, 100],
  sessionAnalyticsThreshold: 700,
};

/**
 * Check if the Barakah milestone has been reached.
 * "مَنْ عَمِلَ صَالِحًا فَلِنَفْسِهِ" — Whoever does good, does it for himself
 */
export function barakahCheck(
  successCount: number,
  config: Partial<BarakahConfig> = {},
): BarakahCheck {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const progress = Math.min(100, Math.floor((successCount / cfg.threshold) * 100));

  if (successCount >= cfg.threshold) {
    return {
      milestoneReached: true,
      progress: 100,
      successCount,
      threshold: cfg.threshold,
      message: `Barakah Protocol activated at ${successCount} successes. Impact amplified. Document and celebrate. البركة_protocol: مضاعفة الأثر`,
    };
  }

  // Find next milestone marker
  const nextMarker = cfg.milestoneMarkers.find(m => m > successCount);
  const progressMessage = nextMarker
    ? `${progress}% toward Barakah milestone (${successCount}/${cfg.threshold}). Next marker: ${nextMarker}`
    : `${progress}% toward Barakah milestone (${successCount}/${cfg.threshold})`;

  return {
    milestoneReached: false,
    progress,
    successCount,
    threshold: cfg.threshold,
    message: progressMessage,
  };
}

/**
 * Create a Barakah audit log entry.
 */
export function createBarakahLog(check: BarakahCheck): {
  milestoneReached: boolean;
  progress: number;
  successCount: number;
  threshold: number;
  message: string;
  quranicBasis: string;
} {
  return {
    milestoneReached: check.milestoneReached,
    progress: check.progress,
    successCount: check.successCount,
    threshold: check.threshold,
    message: check.message,
    quranicBasis: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا — And whoever fears Allah, He will make for him a way out',
  };
}

/**
 * Calculate Barakah multiplier based on success count.
 * Higher success count = higher impact multiplier.
 * "البركة تضاعف عند 700" — Barakah doubles at 700
 *
 * Note: The multiplier uses sessionAnalyticsThreshold (700) by default,
 * not the loop-level threshold (50). This is for session-level analytics
 * where 700 successes indicates significant impact.
 */
export function barakahMultiplier(successCount: number, threshold: number = 700): number {
  if (successCount >= threshold) {
    return 2.0; // Full Barakah: doubled impact
  }
  if (successCount >= threshold * 0.5) {
    return 1.5; // Half Barakah: 50% boost
  }
  if (successCount >= threshold * 0.25) {
    return 1.25; // Quarter Barakah: 25% boost
  }
  return 1.0; // No Barakah yet
}
