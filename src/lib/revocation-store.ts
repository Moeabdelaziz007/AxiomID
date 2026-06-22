import { Redis } from '@upstash/redis';

// TTL-based revocation store — tokens evict after 24 hours.
// ponytail: Upstash Redis handles TTL natively. 
const redis = Redis.fromEnv();
const REVOKED_TOKENS_TTL_SECONDS = 24 * 60 * 60;

export async function revokeToken(token: string): Promise<void> {
  await redis.set(`revoked:${token}`, '1', { ex: REVOKED_TOKENS_TTL_SECONDS });
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const result = await redis.get(`revoked:${token}`);
  return result !== null;
}
