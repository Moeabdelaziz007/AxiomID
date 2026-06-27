import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { logger } from './logger';

// TTL-based revocation store — tokens evict after 24 hours.
// ponytail: Upstash Redis handles TTL natively. When Upstash env vars are
// missing (local dev, CI, preview), fall back to an in-memory store with
// lazy eviction so importing this module never crashes.
const REVOKED_TOKENS_TTL_SECONDS = 24 * 60 * 60;

const hasRedisEnv = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasRedisEnv ? Redis.fromEnv() : null;

// In-memory fallback (token hash -> expiresAt ms). Stale entries are evicted lazily.
const localStore = new Map<string, number>();

// Hash the token before using it as key material so raw bearer tokens are never
/**
 * Builds the storage key for a revoked token.
 *
 * @param token - The token to hash for key generation
 * @returns The revocation key in the form `revoked:<sha256_hex_digest>`
 */
function revokedKey(token: string): string {
  return `revoked:${createHash('sha256').update(token).digest('hex')}`;
}

/**
 * Records a token as revoked.
 *
 * @param token - The token to revoke
 */
export async function revokeToken(token: string): Promise<void> {
  const key = revokedKey(token);
  localStore.set(key, Date.now() + REVOKED_TOKENS_TTL_SECONDS * 1000);
  if (redis) {
    try {
      await redis.set(key, '1', { ex: REVOKED_TOKENS_TTL_SECONDS });
    } catch (err) {
      // Redis is the source of truth across instances. If it fails, the local
      // write alone cannot guarantee revocation propagates, so surface the error
      // rather than silently downgrading to a best-effort, single-instance revoke.
      logger.error('[REVOCATION-STORE] Redis set failed', { error: String(err) });
      throw err;
    }
  }
}

/**
 * Determines whether a token has been revoked.
 *
 * @param token - The token to check
 * @returns `true` if the token is revoked, `false` otherwise.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const key = revokedKey(token);
  const localExpiry = localStore.get(key);
  if (localExpiry) {
    if (Date.now() > localExpiry) {
      localStore.delete(key);
      // Local cache expired; fall through to Redis (source of truth).
    } else {
      return true;
    }
  }
  if (redis) {
    try {
      const result = await redis.get(key);
      if (result !== null) {
        localStore.set(key, Date.now() + REVOKED_TOKENS_TTL_SECONDS * 1000);
        return true;
      }
    } catch (err) {
      // Fail closed: when Redis is the source of truth and unreachable, we
      // cannot confirm the token is valid, so treat it as revoked.
      logger.error('[REVOCATION-STORE] Redis get failed, treating token as revoked', { error: String(err) });
      return true;
    }
  }
  return false;
}
