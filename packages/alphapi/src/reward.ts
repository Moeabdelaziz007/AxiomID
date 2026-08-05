/**
 * AlphaPi v0.1 — Reward Function
 *
 * score = testPassRate * w1 + lintClean * w2 + typeCheckClean * w3 + trustDelta * w4
 *
 * Research basis:
 * - Self-Repair paper (arxiv:2306.09896): external signals (tests) matter more than self-judgment
 * - Reflexion (arxiv:2303.11366): scalar feedback signals work
 * - SAHOO (arxiv:2603.06333): regression-risk quantification flags cycles that undo prior gains
 */

import type {
  EvaluationResult,
  StateSnapshot,
  RewardWeights,
} from "./types.js";

/** Default reward weights — sum to 1.0 */
export const DEFAULT_WEIGHTS: RewardWeights = {
  testPassRate: 0.5,
  lintClean: 0.2,
  typeCheckClean: 0.15,
  trustDelta: 0.15,
};

/**
 * Compute lint cleanliness score: 1 if no errors, decays with error count.
 * lintClean = 1 / (1 + lintErrors)
 */
export function computeLintScore(lintErrors: number): number {
  if (lintErrors <= 0) return 1.0;
  return 1.0 / (1.0 + lintErrors);
}

/**
 * Compute type-check cleanliness score: 1 if no errors, decays with error count.
 * typeCheckClean = 1 / (1 + typeErrors)
 */
export function computeTypeCheckScore(typeErrors: number): number {
  if (typeErrors <= 0) return 1.0;
  return 1.0 / (1.0 + typeErrors);
}

/**
 * Clamp a value to [0, 1] range.
 * Also normalizes negative zero (-0 → 0) per AGENTS.md rule #7.
 */
export function clamp01(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped === 0 ? 0 : clamped; // normalize -0 to 0
}

/**
 * Compute the composite reward score for a candidate evaluation.
 *
 * score = testPassRate * w.testPassRate
 *       + lintClean * w.lintClean
 *       + typeCheckClean * w.typeCheckClean
 *       + trustDelta * w.trustDelta
 *
 * @returns score in [0, 1] (clamped)
 */
export function computeScore(
  testPassRate: number,
  lintErrors: number,
  typeErrors: number,
  trustDelta: number,
  weights: RewardWeights = DEFAULT_WEIGHTS,
): number {
  const lintClean = computeLintScore(lintErrors);
  const typeCheckClean = computeTypeCheckScore(typeErrors);

  const raw =
    testPassRate * weights.testPassRate +
    lintClean * weights.lintClean +
    typeCheckClean * weights.typeCheckClean +
    trustDelta * weights.trustDelta;

  return clamp01(raw);
}

/**
 * Compute the reward (score delta) between a state and an evaluation.
 * Positive reward = improvement. Negative = regression.
 *
 * From SAHOO: regression-risk quantification flags cycles that undo prior gains.
 */
export function computeReward(
  beforeState: StateSnapshot,
  evaluation: EvaluationResult,
): number {
  const beforeScore = computeScore(
    beforeState.testPassRate,
    beforeState.lintErrors,
    beforeState.typeErrors,
    0, // trust delta is relative, so 0 for "before"
  );

  return evaluation.score - beforeScore;
}

/**
 * Detect drift — does the improved version still address the goal
 * and pass the original tests?
 *
 * From SAHOO (arxiv:2603.06333): Goal Drift Index detects alignment drift
 * in recursive self-improvement.
 */
export function detectDrift(
  evaluation: EvaluationResult,
  originalTestPassRate: number,
  tolerance: number = 0.05,
): { detected: boolean; details: string | null } {
  // Regression: did test pass rate drop significantly?
  if (evaluation.testPassRate < originalTestPassRate - tolerance) {
    return {
      detected: true,
      details: `Test pass rate regressed: ${evaluation.testPassRate.toFixed(2)} < ${originalTestPassRate.toFixed(2)} - ${tolerance}`,
    };
  }

  // Type errors increased significantly
  if (evaluation.typeErrors > 10) {
    return {
      detected: true,
      details: `Type errors too high: ${evaluation.typeErrors}`,
    };
  }

  return { detected: false, details: null };
}

/**
 * Check if the loop has reached a plateau.
 * A plateau is N consecutive iterations with reward below threshold.
 */
export function isPlateau(
  rewards: number[],
  threshold: number,
  patience: number,
): boolean {
  if (rewards.length < patience) return false;
  const recent = rewards.slice(-patience);
  return recent.every((r) => Math.abs(r) < threshold);
}
