/**
 * rate-limiter.ts — Physics-inspired rate limiter.
 *
 * Uses Leaky Bucket algorithm (fluid dynamics) for smooth rate limiting.
 * Requests flow into a bucket that drains at a constant rate.
 * If the bucket overflows, requests are rejected.
 *
 * Also implements sliding window fallback for backward compatibility.
 */

import { leakyBucketCheck, idealGasPressure, type LeakyBucketConfig, type LeakyBucketState } from "./math-physics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  // Physics-inspired config
  drainRate?: number;      // Requests drained per second (Leaky Bucket)
  inflowRate?: number;     // Requests allowed per second
  idealGasConstant?: number; // R in PV=nRT
  systemTemperature?: number; // T in PV=nRT (system load factor)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  // Physics-inspired fields
  bucketLevel?: number;    // Current water level in bucket
  waitTimeMs?: number;     // Wait time if bucket overflow
  overflowCount?: number;  // Number of overflows (pressure indicator)
  systemPressure?: number; // Pressure from Ideal Gas Law
  adaptiveCapacity?: number; // Capacity after pressure adjustment
}

export const RATE_LIMITS = {
  anonymous:     { windowMs: 60_000, maxRequests: 30,  drainRate: 0.5, inflowRate: 0.5 },
  authenticated: { windowMs: 60_000, maxRequests: 100, drainRate: 1.67, inflowRate: 1.67 },
  public:        { windowMs: 60_000, maxRequests: 60,  drainRate: 1.0, inflowRate: 1.0 },
  piAuth:        { windowMs: 60_000, maxRequests: 5,   drainRate: 0.08, inflowRate: 0.08 },
  payment:       { windowMs: 60_000, maxRequests: 10,  drainRate: 0.17, inflowRate: 0.17 },
} as const satisfies Record<string, RateLimitConfig>;

// ---------------------------------------------------------------------------
// In-memory store (process-local Map)
// ---------------------------------------------------------------------------

interface WindowEntry {
  count: number;
  resetAt: number;
  // Leaky Bucket state
  bucket: LeakyBucketState;
}

const store = new Map<string, WindowEntry>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

// Cleanup runs every 50 writes to keep the map lean
let writeCounter = 0;
const CLEANUP_INTERVAL = 50;

// ---------------------------------------------------------------------------
// Core function — Leaky Bucket + Sliding Window hybrid
// ---------------------------------------------------------------------------

/**
 * Check whether `key` has exceeded its rate limit.
 *
 * Uses a hybrid approach:
 * 1. Leaky Bucket (fluid dynamics) for smooth rate limiting
 * 2. Sliding window fallback for backward compatibility
 *
 * Physics analogy: Water flows into a bucket that drains at constant rate.
 * If water level exceeds capacity, requests are rejected.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + config.windowMs;

  const existing = store.get(key);

  // Compute system pressure using Ideal Gas Law (PV = nRT)
  // Higher pressure = system under load = adaptive capacity reduction
  const systemLoad = store.size; // Number of active rate limit entries
  const pressure = idealGasPressure(
    systemLoad,
    config.maxRequests * 10,
    config.systemTemperature || 1.0,
    config.idealGasConstant || 1.0,
  );

  // Adaptive capacity: reduce when pressure is high
  const adaptiveCapacity = pressure > 1
    ? Math.max(1, Math.floor(config.maxRequests / pressure))
    : config.maxRequests;

  // Initialize bucket state
  const bucketConfig: LeakyBucketConfig = {
    capacity: adaptiveCapacity,
    drainRate: config.drainRate || config.maxRequests / (config.windowMs / 1000),
    inflowRate: config.inflowRate || config.maxRequests / (config.windowMs / 1000),
  };

  const initialBucket: LeakyBucketState = {
    level: 0,
    lastDrain: now,
    overflowCount: 0,
  };

  if (!existing || now >= existing.resetAt) {
    // New window — reset bucket
    const bucketResult = leakyBucketCheck(initialBucket, bucketConfig, now);

    store.set(key, {
      count: 1,
      resetAt,
      bucket: bucketResult.newState,
    });
    maybeCleanup();

    return {
      allowed: bucketResult.allowed,
      remaining: adaptiveCapacity - 1,
      resetAt,
      bucketLevel: bucketResult.newState.level,
      waitTimeMs: bucketResult.waitTimeMs,
      overflowCount: bucketResult.newState.overflowCount,
      systemPressure: pressure,
      adaptiveCapacity,
    };
  }

  // Existing window — apply Leaky Bucket
  const bucketResult = leakyBucketCheck(existing.bucket, bucketConfig, now);

  const newCount = existing.count + 1;
  store.set(key, {
    count: newCount,
    resetAt: existing.resetAt,
    bucket: bucketResult.newState,
  });
  maybeCleanup();

  // Use both bucket and window for decision
  const windowAllowed = newCount <= adaptiveCapacity;
  const bucketAllowed = bucketResult.allowed;

  return {
    allowed: windowAllowed && bucketAllowed,
    remaining: Math.max(0, adaptiveCapacity - newCount),
    resetAt: existing.resetAt,
    bucketLevel: bucketResult.newState.level,
    waitTimeMs: bucketResult.waitTimeMs,
    overflowCount: bucketResult.newState.overflowCount,
    systemPressure: pressure,
    adaptiveCapacity,
  };
}

function maybeCleanup(): void {
  writeCounter++;
  if (writeCounter >= CLEANUP_INTERVAL) {
    writeCounter = 0;
    cleanupExpired();
  }
}
