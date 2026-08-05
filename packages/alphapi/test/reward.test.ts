/**
 * AlphaPi v0.1 — Reward function unit tests
 * Uses Node.js built-in test runner (node:test)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeScore,
  computeReward,
  computeLintScore,
  computeTypeCheckScore,
  clamp01,
  detectDrift,
  isPlateau,
  DEFAULT_WEIGHTS,
} from "../src/reward.js";
import type { StateSnapshot, EvaluationResult } from "../src/types.js";

describe("clamp01", () => {
  it("clamps values to [0, 1]", () => {
    assert.equal(clamp01(-1), 0);
    assert.equal(clamp01(0), 0);
    assert.equal(clamp01(0.5), 0.5);
    assert.equal(clamp01(1), 1);
    assert.equal(clamp01(2), 1);
  });

  it("normalizes negative zero to positive zero", () => {
    const result = clamp01(-0);
    assert.equal(Object.is(result, -0), false);
    assert.equal(Object.is(result, 0), true);
  });
});

describe("computeLintScore", () => {
  it("returns 1.0 for zero errors", () => {
    assert.equal(computeLintScore(0), 1.0);
  });

  it("decays with error count", () => {
    assert.equal(computeLintScore(1), 0.5);
    assert.equal(computeLintScore(2), 1 / 3);
    assert.equal(computeLintScore(9), 0.1);
  });
});

describe("computeTypeCheckScore", () => {
  it("returns 1.0 for zero errors", () => {
    assert.equal(computeTypeCheckScore(0), 1.0);
  });

  it("decays with error count", () => {
    assert.equal(computeTypeCheckScore(1), 0.5);
    assert.equal(computeTypeCheckScore(4), 0.2);
  });
});

describe("computeScore", () => {
  it("returns high score for perfect state with positive trust delta", () => {
    const score = computeScore(1.0, 0, 0, 0.1, DEFAULT_WEIGHTS);
    // 1.0*0.5 + 1.0*0.2 + 1.0*0.15 + 0.1*0.15 = 0.865
    assert.ok(score > 0.85, `Expected >0.85, got ${score}`);
  });

  it("returns lower score for failing tests", () => {
    const perfect = computeScore(1.0, 0, 0, 0);
    const failing = computeScore(0.0, 0, 0, 0);
    assert.ok(failing < perfect, "Failing should score lower than perfect");
  });

  it("weights test pass rate at 50%", () => {
    const allPass = computeScore(1.0, 0, 0, 0);
    const halfPass = computeScore(0.5, 0, 0, 0);
    const expectedDiff = 0.5 * DEFAULT_WEIGHTS.testPassRate;
    assert.ok(
      Math.abs((allPass - halfPass) - expectedDiff) < 0.001,
      `Expected diff ${expectedDiff}, got ${allPass - halfPass}`,
    );
  });

  it("returns value in [0, 1]", () => {
    const low = computeScore(0, 100, 100, -1);
    const high = computeScore(1, 0, 0, 1);
    assert.ok(low >= 0 && low <= 1, `Low ${low} not in [0,1]`);
    assert.ok(high >= 0 && high <= 1, `High ${high} not in [0,1]`);
  });
});

describe("computeReward", () => {
  const mockState: StateSnapshot = {
    timestamp: "2026-07-20T00:00:00Z",
    target: "test",
    testPassRate: 0.8,
    lintErrors: 5,
    typeErrors: 3,
    trustScore: 0.5,
    ciStatus: "passing",
    reviewSignals: [],
    gitSha: "abc123",
  };

  it("returns positive reward when evaluation improves", () => {
    const betterEval: EvaluationResult = {
      candidateId: "c1",
      passesOriginalTests: true,
      testPassRate: 0.95,
      lintErrors: 0,
      typeErrors: 0,
      trustDelta: 0.1,
      score: computeScore(0.95, 0, 0, 0.1),
      driftDetected: false,
      driftDetails: null,
    };
    const reward = computeReward(mockState, betterEval);
    assert.ok(reward > 0, `Expected positive reward, got ${reward}`);
  });

  it("returns negative reward when evaluation regresses", () => {
    const worseEval: EvaluationResult = {
      candidateId: "c2",
      passesOriginalTests: false,
      testPassRate: 0.5,
      lintErrors: 20,
      typeErrors: 15,
      trustDelta: -0.2,
      score: computeScore(0.5, 20, 15, -0.2),
      driftDetected: false,
      driftDetails: null,
    };
    const reward = computeReward(mockState, worseEval);
    assert.ok(reward < 0, `Expected negative reward, got ${reward}`);
  });
});

describe("detectDrift", () => {
  it("detects test pass rate regression", () => {
    const evalResult: EvaluationResult = {
      candidateId: "c1",
      passesOriginalTests: false,
      testPassRate: 0.5,
      lintErrors: 0,
      typeErrors: 0,
      trustDelta: 0,
      score: 0.5,
      driftDetected: false,
      driftDetails: null,
    };
    const drift = detectDrift(evalResult, 0.9, 0.05);
    assert.equal(drift.detected, true);
    assert.ok(drift.details?.includes("regressed"), `Expected 'regressed' in details, got ${drift.details}`);
  });

  it("detects high type errors", () => {
    const evalResult: EvaluationResult = {
      candidateId: "c2",
      passesOriginalTests: true,
      testPassRate: 0.95,
      lintErrors: 0,
      typeErrors: 15,
      trustDelta: 0,
      score: 0.9,
      driftDetected: false,
      driftDetails: null,
    };
    const drift = detectDrift(evalResult, 0.9, 0.05);
    assert.equal(drift.detected, true);
    assert.ok(drift.details?.includes("Type errors"), `Expected 'Type errors' in details, got ${drift.details}`);
  });

  it("returns no drift for healthy evaluation", () => {
    const evalResult: EvaluationResult = {
      candidateId: "c3",
      passesOriginalTests: true,
      testPassRate: 0.95,
      lintErrors: 0,
      typeErrors: 0,
      trustDelta: 0.1,
      score: 0.97,
      driftDetected: false,
      driftDetails: null,
    };
    const drift = detectDrift(evalResult, 0.9, 0.05);
    assert.equal(drift.detected, false);
    assert.equal(drift.details, null);
  });
});

describe("isPlateau", () => {
  it("returns false for short reward history", () => {
    assert.equal(isPlateau([0.1, 0.2], 0.01, 3), false);
  });

  it("returns true when recent rewards are all below threshold", () => {
    assert.equal(isPlateau([0.5, 0.001, 0.002, 0.003], 0.01, 3), true);
  });

  it("returns false when recent rewards exceed threshold", () => {
    assert.equal(isPlateau([0.5, 0.001, 0.05, 0.003], 0.01, 3), false);
  });
});
