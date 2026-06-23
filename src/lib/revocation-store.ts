import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

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
// stored in Redis keyspace or in-memory backups.
function revokedKey(token: string): string {
  return `revoked:${createHash('sha256').update(token).digest('hex')}`;
}

export async function revokeToken(token: string): Promise<void> {
  const key = revokedKey(token);
  if (redis) {
    try {
      await redis.set(key, '1', { ex: REVOKED_TOKENS_TTL_SECONDS });
      return;
    } catch (err) {
      console.error('[REVOCATION-STORE] Redis set failed, falling back to local store:', err);
    }
  }
  localStore.set(key, Date.now() + REVOKED_TOKENS_TTL_SECONDS * 1000);
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const key = revokedKey(token);
  if (redis) {
    try {
      const result = await redis.get(key);
      return result !== null;
    } catch (err) {
      console.error('[REVOCATION-STORE] Redis get failed, falling back to local store:', err);
    }
  }
  const expiresAt = localStore.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    localStore.delete(key);
    return false;
  }
  return true;
}
