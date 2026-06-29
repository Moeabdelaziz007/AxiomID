import { z } from "zod";

export const TOTAL_STAMPS = 10;

const TrustScoreParamsSchema = z.object({
  xp: z.number().int(),
  stampsClaimed: z.number().int(),
  tenureDays: z.number().int().optional(),
  semanticTrust: z.number().min(0).max(100).optional(),
});

/**
 * Compute a trust score from a user's experience points, number of claimed stamps, tenure, and semantic trust.
 *
 * Falls back to the legacy weighted combination of XP (70%) and stamps (30%) if tenure and semantic parameters are omitted.
 *
 * @param xp - The user's experience points (used to derive the XP component)
 * @param stampsClaimed - Number of stamps the user claimed
 * @param tenureDays - Optional number of days the account has been active
 * @param semanticTrust - Optional semantic trust score (0-100)
 * @returns A numeric trust score between 0 and 100
 */
export function calculateTrustScore(
  xp: number,
  stampsClaimed: number,
  tenureDays?: number,
  semanticTrust?: number
): number {
  TrustScoreParamsSchema.parse({ xp, stampsClaimed, tenureDays, semanticTrust });

  const clamped = Math.max(0, Math.min(stampsClaimed, TOTAL_STAMPS));

  const xpScore = Math.min(100, Math.max(0, Math.floor((xp || 0) / 10)));

  const stampScore = TOTAL_STAMPS > 0
    ? Math.round((clamped / TOTAL_STAMPS) * 100)
    : 0;

  if (tenureDays === undefined && semanticTrust === undefined) {
    return Math.max(0, Math.min(100, Math.round(xpScore * 0.7 + stampScore * 0.3)));
  }

  const resolvedTenure = tenureDays ?? 0;
  const resolvedSemantic = semanticTrust ?? 50;

  const tenureScore = Math.min(100, Math.max(0, resolvedTenure * 2)); // e.g. 50 days = 100%
  const score = xpScore * 0.5 + stampScore * 0.2 + tenureScore * 0.1 + resolvedSemantic * 0.2;
  return Math.max(0, Math.min(100, Math.round(score)));
}
