/**
 * math-physics-core.ts — Production-used physics algorithms for AxiomID.
 *
 * Extracted from math-physics.ts (2034 lines) to reduce bundle size.
 * Only the 5 functions + 2 types actually imported by production code are here.
 *
 * Dead code (60+ unused functions) remains in math-physics.ts for test coverage.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LEAKY BUCKET (Fluid Dynamics) — used by rate-limiter.ts
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeakyBucketConfig {
  capacity: number;
  drainRate: number;
  inflowRate: number;
}

export interface LeakyBucketState {
  level: number;
  lastDrain: number;
  overflowCount: number;
}

export function leakyBucketCheck(
  state: LeakyBucketState,
  config: LeakyBucketConfig,
  now: number = Date.now(),
): { allowed: boolean; newState: LeakyBucketState; waitTimeMs: number } {
  const elapsed = (now - state.lastDrain) / 1000;
  const lambda = config.drainRate / config.capacity;
  const drainedLevel = state.level * Math.exp(-lambda * elapsed);
  const newLevel = drainedLevel + 1;

  if (newLevel > config.capacity) {
    const waitTimeMs = Math.ceil(-Math.log(config.capacity / drainedLevel) / lambda * 1000);
    return {
      allowed: false,
      newState: {
        ...state,
        level: Math.min(newLevel, config.capacity),
        overflowCount: state.overflowCount + 1,
      },
      waitTimeMs,
    };
  }

  return {
    allowed: true,
    newState: {
      level: newLevel,
      lastDrain: now,
      overflowCount: state.overflowCount,
    },
    waitTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDEAL GAS (Thermodynamics) — used by rate-limiter.ts
// ═══════════════════════════════════════════════════════════════════════════════

export function idealGasPressure(
  activeRequests: number,
  capacity: number,
  temperature: number,
  gasConstant: number = 1,
): number {
  if (capacity <= 0) return Infinity;
  return (activeRequests * gasConstant * temperature) / capacity;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPONENTIAL BACKOFF (Radioactive Decay) — used by sync/route.ts
// ═══════════════════════════════════════════════════════════════════════════════

export function exponentialBackoff(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  jitterFactor: number = 0.3,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);
  return Math.min(maxDelayMs, Math.max(0, exponentialDelay + jitter));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHANNON ENTROPY (Information Theory) — used by sync/route.ts
// ═══════════════════════════════════════════════════════════════════════════════

export function shannonEntropy(data: string): number {
  if (data.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const char of data) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / data.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FRESHNESS (Time Decay) — used by sync/route.ts
// ═══════════════════════════════════════════════════════════════════════════════

export function dataFreshness(
  createdAt: number,
  now: number = Date.now(),
  decayConstant: number = 0.001,
  entropyBonus: number = 0,
): number {
  const ageMs = now - createdAt;
  const timeDecay = Math.exp(-decayConstant * ageMs);
  return Math.min(1, timeDecay + entropyBonus * 0.1);
}
