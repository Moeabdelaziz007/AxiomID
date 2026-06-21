/**
 * session-analytics.ts — Session-Level Milestone Tracking (البركة)
 *
 * "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا"
 * And whoever fears Allah, He will make for him a way out.
 *
 * Tracks cumulative success milestones across sessions:
 * - 700 successes → Telegram notification + leaderboard entry
 * - 7000 successes → major feature launch announcement
 *
 * Separated from SoulLoop (which handles per-loop control)
 * to track lifetime achievement across multiple agent sessions.
 */

import { logger } from '../logger';
import { sendMilestoneNotification } from '../telegram';

export interface SessionMilestone {
  type: '700' | '7000';
  successCount: number;
  timestamp: number;
  message: string;
}

const MILESTONES = {
  BARAKAH: 700,
  LAUNCH: 7000,
} as const;

/**
 * Check if a success count crosses a milestone threshold.
 * Returns the milestone if crossed, null otherwise.
 */
export function checkSessionMilestone(
  successCount: number,
  previousCount: number,
): SessionMilestone | null {
  if (successCount >= MILESTONES.LAUNCH && previousCount < MILESTONES.LAUNCH) {
    return {
      type: '7000',
      successCount,
      timestamp: Date.now(),
      message: `MashAllah! ${successCount} successes reached. Major feature launch threshold crossed! البركة الكبرى`,
    };
  }

  if (successCount >= MILESTONES.BARAKAH && previousCount < MILESTONES.BARAKAH) {
    return {
      type: '700',
      successCount,
      timestamp: Date.now(),
      message: `SubhanAllah! ${successCount} successes reached. Full Barakah activated — impact doubled! البركة_protocol: مضاعفة الأثر`,
    };
  }

  return null;
}

/**
 * Send milestone notification to Telegram if chat ID is configured.
 * Fire-and-forget — failures are logged but don't block the caller.
 */
export async function notifyMilestone(
  chatId: string | undefined,
  milestone: SessionMilestone,
): Promise<void> {
  if (!chatId) {
    logger.info('[SESSION-ANALYTICS] Milestone reached but no chat ID configured', {
      type: milestone.type,
      count: milestone.successCount,
    });
    return;
  }

  try {
    await sendMilestoneNotification(chatId, {
      type: 'barakah',
      count: milestone.successCount,
      message: milestone.message,
    });
    logger.info('[SESSION-ANALYTICS] Milestone notification sent', {
      type: milestone.type,
      count: milestone.successCount,
    });
  } catch (err) {
    logger.warn('[SESSION-ANALYTICS] Failed to send milestone notification', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
