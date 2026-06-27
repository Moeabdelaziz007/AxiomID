/**
 * rate-limiter.ts — Physics-inspired rate limiter.
 *
 * Uses Leaky Bucket algorithm (fluid dynamics) for smooth rate limiting.
 * Requests flow into a bucket that drains at a constant rate.
 * If the bucket overflows, requests are rejected.
 *
 * Also implements sliding window fallback for backward compatibility.
 *
 * Production: Uses Upstash Redis (distributed, works across Vercel Serverless instances).
 * Local dev: Falls back to in-memory Map (process-local).
 */

import { leakyBucketCheck, idealGasPressure, type LeakyBucketState } from "./math-physics-core";
import { logger } from "./logger";

// Lazy-loaded Upstash modules (ESM-only, would break Jest if imported statically)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy-loaded ESM modules, types inferred at runtime
let RatelimitClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy-loaded ESM modules, types inferred at runtime
let RedisClass: any = null;

let loadUpstashPromise: Promise<void> | null = null;
let ensureUpstashPromise: Promise<boolean> | null = null;

/**
 * Dynamically imports and caches the Upstash Ratelimit and Redis classes.
 */
async function loadUpstash() {
  if (!loadUpstashPromise) {
    loadUpstashPromise = (async () => {
      const ratelimit = await import("@upstash/ratelimit");
      const redis = await import("@upstash/redis");
      RatelimitClass = ratelimit.Ratelimit;
      RedisClass = redis.Redis;
    })();
  }
  return loadUpstashPromise;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  // Physics-inspired config
  drainRate?: number;
  inflowRate?: number;
  idealGasConstant?: number;
  systemTemperature?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  // Physics-inspired fields
  bucketLevel?: number;
  waitTimeMs?: number;
  overflowCount?: number;
  systemPressure?: number;
  adaptiveCapacity?: number;
}

export const RATE_LIMITS = {
  anonymous:     { windowMs: 60_000, maxRequests: 30,  drainRate: 0.5, inflowRate: 0.5 },
  authenticated: { windowMs: 60_000, maxRequests: 100, drainRate: 1.67, inflowRate: 1.67 },
  public:        { windowMs: 60_000, maxRequests: 60,  drainRate: 1.0, inflowRate: 1.0 },
  piAuth:        { windowMs: 60_000, maxRequests: 5,   drainRate: 0.08, inflowRate: 0.08 },
  payment:       { windowMs: 60_000, maxRequests: 10,  drainRate: 0.17, inflowRate: 0.17 },
} as const satisfies Record<string, RateLimitConfig>;

// ---------------------------------------------------------------------------
// Upstash Redis instance (production) — lazy-initialized
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_UPSTASH = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// Warn once on startup if Upstash is missing in production
if (!USE_UPSTASH && process.env.NODE_ENV === "production") {
  logger.warn(
    "[RATE-LIMITER] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. " +
    "Rate limits falling back to process-local Map (broken across Vercel instances). " +
    "Set these in Vercel dashboard → Settings → Environment Variables."
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy-loaded ESM modules, types inferred at runtime
let redisInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy-loaded ESM modules, types inferred at runtime
let upstashLimiters: Map<string, any> | null = null;

/**
 * Ensures the Upstash Redis client and limiter cache are initialized.
 *
 * @returns `true` if Upstash is ready for use, `false` if disabled or initialization failed.
 */
async function ensureUpstash() {
  if (!USE_UPSTASH) return false;
  if (redisInstance) return true;
  if (!ensureUpstashPromise) {
    ensureUpstashPromise = (async () => {
      try {
        await loadUpstash();
        if (!RedisClass || !RatelimitClass) return false;
        redisInstance = new RedisClass({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! });
        upstashLimiters = new Map();
        return true;
      } catch (err) {
        logger.error("[RATE-LIMITER] Failed to initialize Upstash:", err);
        ensureUpstashPromise = null; // Reset to allow retry on subsequent requests
        return false;
      }
    })();
  }
  return ensureUpstashPromise;
}

/**
 * Retrieves or creates a cached Upstash rate limiter instance.
 *
 * @returns The Upstash `Ratelimit` instance configured for the given window and request limits
 */
async function getUpstashLimiter(config: RateLimitConfig) {
  const key = `${config.windowMs}:${config.maxRequests}`;
  if (!upstashLimiters!.has(key)) {
    upstashLimiters!.set(
      key,
      new RatelimitClass!({
        redis: redisInstance!,
        limiter: RatelimitClass!.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
        analytics: false,
        prefix: "axomid:ratelimit",
      }),
    );
  }
  return upstashLimiters!.get(key)!;
}

// ---------------------------------------------------------------------------
// In-memory store (local dev fallback)
// ---------------------------------------------------------------------------

interface WindowEntry {
  count: number;
  resetAt: number;
  bucket: LeakyBucketState;
}

const memStore = new Map<string, WindowEntry>();

/**
 * Removes expired entries from the in-memory rate-limit store.
 */
function memCleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memStore) {
    if (now >= entry.resetAt) memStore.delete(key);
  }
}

let writeCounter = 0;
const CLEANUP_INTERVAL = 50;

/**
 * Throttles cleanup operations to run periodically rather than on every invocation.
 */
function memMaybeCleanup(): void {
  writeCounter++;
  if (writeCounter >= CLEANUP_INTERVAL) {
    writeCounter = 0;
    memCleanupExpired();
  }
}

// ---------------------------------------------------------------------------
// Core function — Leaky Bucket + Sliding Window hybrid
// ---------------------------------------------------------------------------

/**
 * Checks whether a request is allowed under the configured rate limit.
 *
 * @param key - The identifier for rate-limit tracking (e.g., user ID, IP address).
 * @returns The rate-limit result with allowance status, remaining quota, reset timestamp, and adaptive capacity metrics.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + config.windowMs;

  // --- Upstash path (production) ---
  if (USE_UPSTASH) {
    try {
      const ready = await ensureUpstash();
      if (ready) {
        const limiter = await getUpstashLimiter(config);
        const result = await limiter.limit(key);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetAt: result.reset,
          overflowCount: result.success ? 0 : 1,
          systemPressure: 0,
          adaptiveCapacity: config.maxRequests,
        };
      }
    } catch (error) {
      // Fallback to in-memory if Redis fails (don't block requests)
      logger.warn("[RateLimiter] Upstash failed, falling back to in-memory:", error);
    }
  }

  // --- In-memory path (local dev / fallback) ---
  const systemLoad = memStore.size;
  const pressure = idealGasPressure(
    systemLoad,
    config.maxRequests * 10,
    config.systemTemperature || 1.0,
    config.idealGasConstant || 1.0,
  );

  const adaptiveCapacity = pressure > 1
    ? Math.max(1, Math.floor(config.maxRequests / pressure))
    : config.maxRequests;

  const bucketConfig = {
    capacity: adaptiveCapacity,
    drainRate: config.drainRate || config.maxRequests / (config.windowMs / 1000),
    inflowRate: config.inflowRate || config.maxRequests / (config.windowMs / 1000),
  };

  const initialBucket: LeakyBucketState = {
    level: 0,
    lastDrain: now,
    overflowCount: 0,
  };

  const existing = memStore.get(key);

  if (!existing || now >= existing.resetAt) {
    const bucketResult = leakyBucketCheck(initialBucket, bucketConfig, now);
    memStore.set(key, { count: 1, resetAt, bucket: bucketResult.newState });
    memMaybeCleanup();

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

  const bucketResult = leakyBucketCheck(existing.bucket, bucketConfig, now);
  const newCount = existing.count + 1;
  memStore.set(key, { count: newCount, resetAt: existing.resetAt, bucket: bucketResult.newState });
  memMaybeCleanup();

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
