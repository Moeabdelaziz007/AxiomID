/**
 * math-physics.test.ts — Tests for physics-inspired algorithms (production exports only).
 */

import {
  leakyBucketCheck,
  idealGasPressure,
  exponentialBackoff,
  shannonEntropy,
  dataFreshness,
} from "@/lib/math-physics";

describe("Leaky Bucket", () => {
  it("drains over time", () => {
    const config = { capacity: 10, drainRate: 1, inflowRate: 1 };
    const now = Date.now();
    const initialState = { level: 10, lastDrain: now, overflowCount: 0 };
    const futureTime = now + 5000;
    const result = leakyBucketCheck(initialState, config, futureTime);
    expect(result.newState.level).toBeLessThan(initialState.level);
  });

  it("allows requests when bucket is not full", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 1 };
    const now = Date.now();
    const state = { level: 0, lastDrain: now, overflowCount: 0 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.allowed).toBe(true);
  });

  it("rejects requests when bucket is full", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 0.1 };
    const now = Date.now();
    const state = { level: 5, lastDrain: now, overflowCount: 0 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.allowed).toBe(false);
  });

  it("increments overflow count on rejection", () => {
    const config = { capacity: 5, drainRate: 1, inflowRate: 0.1 };
    const now = Date.now();
    const state = { level: 5, lastDrain: now, overflowCount: 3 };
    const result = leakyBucketCheck(state, config, now);
    expect(result.newState.overflowCount).toBe(4);
  });
});

describe("Ideal Gas Law", () => {
  it("pressure increases with more active requests", () => {
    const p1 = idealGasPressure(10, 100, 1.0);
    const p2 = idealGasPressure(50, 100, 1.0);
    expect(p2).toBeGreaterThan(p1);
  });

  it("pressure is 0 when no active requests", () => {
    expect(idealGasPressure(0, 100, 1.0)).toBe(0);
  });

  it("pressure is Infinity at zero capacity", () => {
    expect(idealGasPressure(1, 0, 1.0)).toBe(Infinity);
  });

  it("scales with temperature", () => {
    const p1 = idealGasPressure(10, 100, 1.0);
    const p2 = idealGasPressure(10, 100, 2.0);
    expect(p2).toBeCloseTo(p1 * 2, 5);
  });
});

describe("Exponential Backoff", () => {
  it("returns non-negative delay", () => {
    for (let i = 0; i < 10; i++) {
      const delay = exponentialBackoff(i);
      expect(delay).toBeGreaterThanOrEqual(0);
    }
  });

  it("increases with attempt number", () => {
    const delays = Array.from({ length: 5 }, (_, i) => exponentialBackoff(i, 100, 30000, 0));
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it("respects max delay", () => {
    const delay = exponentialBackoff(100, 1000, 5000, 0);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it("applies jitter (delay varies between calls)", () => {
    const delays = Array.from({ length: 10 }, () => exponentialBackoff(2, 1000, 30000, 0.5));
    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("attempt=2 with jitter=0.5 produces delays within unclamped range [2000, 6000]", () => {
    // attempt=2: base = 1000 * 2^2 = 4000; jitter range = ±(4000 * 0.5) = ±2000
    // raw range = [2000, 6000] — no clamping occurs since maxDelay=30000
    for (let i = 0; i < 50; i++) {
      const delay = exponentialBackoff(2, 1000, 30000, 0.5);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(6000);
    }
  });

  it("attempt=2 with zero jitter returns exactly the base exponential delay", () => {
    // 1000 * 2^2 = 4000 with no jitter
    const delay = exponentialBackoff(2, 1000, 30000, 0);
    expect(delay).toBe(4000);
  });

});

describe("Shannon Entropy", () => {
  it("returns 0 for empty string", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("returns 0 for single repeated character", () => {
    expect(shannonEntropy("aaaa")).toBe(0);
  });

  it("returns higher entropy for more diverse data", () => {
    const lowEntropy = shannonEntropy("aabb");
    const highEntropy = shannonEntropy("abcd");
    expect(highEntropy).toBeGreaterThan(lowEntropy);
  });

  it("returns log2(n) for uniform distribution", () => {
    const entropy = shannonEntropy("abcd");
    expect(entropy).toBeCloseTo(Math.log2(4), 5);
  });
});

describe("Data Freshness", () => {
  it("returns 1 for just-created data", () => {
    const now = Date.now();
    expect(dataFreshness(now, now)).toBeCloseTo(1, 5);
  });

  it("decreases over time", () => {
    const now = Date.now();
    const fresh = dataFreshness(now, now);
    const old = dataFreshness(now, now + 10000);
    expect(old).toBeLessThan(fresh);
  });

  it("is bounded in [0, 1]", () => {
    const now = Date.now();
    const score = dataFreshness(now - 100000, now, 0.001);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
