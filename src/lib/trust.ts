import { z } from "zod";

export const TOTAL_STAMPS = 6;

const TrustScoreParamsSchema = z.object({
  xp: z.number().int(),
  stampsClaimed: z.number().int(),
});

/**
 * Compute a trust score from a user's experience points and number of claimed stamps.
 *
 * The score is a weighted combination of XP (70%) and stamps (30%), rounded and clamped to the range 0–100.
 *
 * @param xp - The user's experience points (used to derive the XP component)
 * @param stampsClaimed - Number of stamps the user claimed; values outside 0 to TOTAL_STAMPS are clamped
 * @returns A numeric trust score between 0 and 100
 */
export function calculateTrustScore(xp: number, stampsClaimed: number): number {
  TrustScoreParamsSchema.parse({ xp, stampsClaimed });

  const clamped = Math.max(0, Math.min(stampsClaimed, TOTAL_STAMPS));

  const xpScore = Math.min(100, Math.max(0, Math.floor((xp || 0) / 10)));

  const stampScore = TOTAL_STAMPS > 0
    ? Math.round((clamped / TOTAL_STAMPS) * 100)
    : 0;

  return Math.max(0, Math.min(100, Math.round(xpScore * 0.7 + stampScore * 0.3)));
}
