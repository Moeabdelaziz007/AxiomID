/**
 * rate-limiter.ts — In-memory sliding-window rate limiter.
 *
 * Uses a process-local Map so it doesn't depend on any external service.
 * In serverless (Vercel) each cold-start gets a fresh Map, which is fine for
 * per-instance rate limiting. For distributed rate limiting across many
 * concurrent instances, add a shared backend (Redis, Postgres, etc.).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export const RATE_LIMITS = {
  anonymous:     { windowMs: 60_000, maxRequests: 30  },
  authenticated: { windowMs: 60_000, maxRequests: 100 },
  piAuth:        { windowMs: 60_000, maxRequests: 5   },
  payment:       { windowMs: 60_000, maxRequests: 10  },
} as const satisfies Record<string, RateLimitConfig>;

// ---------------------------------------------------------------------------
// In-memory store (process-local Map)
// ---------------------------------------------------------------------------

interface WindowEntry {
  count: number;
  resetAt: number;
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
// Core function
// ---------------------------------------------------------------------------

/**
 * Check whether `key` has exceeded its rate limit.
 *
 * Uses a sliding-ish fixed window: counts reset when `resetAt` elapses.
 * Perfectly accurate per process; across processes the window is
 * approximate (each instance has its own counter).
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = now + config.windowMs;

  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt });
    maybeCleanup();
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  const newCount = existing.count + 1;
  store.set(key, { count: newCount, resetAt: existing.resetAt });
  maybeCleanup();

  const allowed = newCount <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - newCount),
    resetAt: existing.resetAt,
  };
}

function maybeCleanup(): void {
  writeCounter++;
  if (writeCounter >= CLEANUP_INTERVAL) {
    writeCounter = 0;
    cleanupExpired();
  }
}
