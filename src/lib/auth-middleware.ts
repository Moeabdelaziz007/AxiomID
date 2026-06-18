import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/errors';
import { createHash } from 'crypto';

export interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  piUid: string;
  piUsername: string | null;
  xp: number;
  tier: string;
}

interface CacheEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}

const CACHE_TTL_MS = parseInt(process.env.PI_AUTH_CACHE_TTL || '300000', 10); // 5 minutes default
const MAX_CACHE_SIZE = parseInt(process.env.PI_AUTH_CACHE_MAX_SIZE || '1000', 10);
const tokenCache = new Map<string, CacheEntry>();

/**
 * Hashes an access token using SHA-256.
 *
 * @param token - The access token to hash
 * @returns The SHA-256 hex digest of the token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of tokenCache) {
    if (now > entry.expiresAt) {
      tokenCache.delete(key);
    }
  }
}

/**
 * Retrieves the cached user for a token hash.
 *
 * @returns The cached user if found and not expired, `null` otherwise.
 */
function getCachedUser(tokenHash: string): AuthenticatedUser | null {
  const entry = tokenCache.get(tokenHash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(tokenHash);
    return null;
  }
  return entry.user;
}

/**
 * Stores an authenticated user in the cache with an expiration time.
 *
 * @param tokenHash - The hashed token to use as the cache key
 * @param user - The authenticated user to cache
 */
function setCachedUser(tokenHash: string, user: AuthenticatedUser): void {
  if (tokenCache.size > MAX_CACHE_SIZE) {
    cleanupExpiredEntries();
  }
  tokenCache.set(tokenHash, {
    user,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Deletes a cached authentication token.
 *
 * @param tokenHash - The hashed token to remove
 */
function invalidateCachedToken(tokenHash: string): void {
  tokenCache.delete(tokenHash);
}

/**
 * Invalidate a specific token from the auth cache, or clear all entries.
 *
 * @param tokenHash - If provided, only this entry is removed. If omitted, clears all entries.
 */
export function clearAuthCache(tokenHash?: string): void {
  if (tokenHash) {
    tokenCache.delete(tokenHash);
  } else {
    tokenCache.clear();
  }
}

/**
 * Verifies a request's Pi access token and retrieves the authenticated user.
 *
 * @param request - The incoming request containing the Authorization header
 * @returns An object with the authenticated user and no error on success, or an error and no user on failure
 */
export async function requireAuth(request: NextRequest): Promise<
  { error: ReturnType<typeof apiError>; user: null } | { error: null; user: AuthenticatedUser }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: apiError('UNAUTHORIZED', 'Missing or invalid Authorization header'), user: null };
  }

  const accessToken = authHeader.slice(7);
  if (!accessToken) {
    return { error: apiError('UNAUTHORIZED', 'Empty access token'), user: null };
  }

  const tokenHash = hashToken(accessToken);
  const cachedUser = getCachedUser(tokenHash);
  if (cachedUser) {
    return { error: null, user: cachedUser };
  }

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!piResponse.ok) {
      invalidateCachedToken(tokenHash);
      return { error: apiError('UNAUTHORIZED', 'Invalid Pi access token'), user: null };
    }

    const piUser: { uid?: string; username?: string } = await piResponse.json();
    if (!piUser.uid) {
      return { error: apiError('UNAUTHORIZED', 'Pi token missing uid'), user: null };
    }

    const user = await prisma.user.findUnique({
      where: { piUid: piUser.uid },
      select: {
        id: true,
        walletAddress: true,
        piUid: true,
        piUsername: true,
        xp: true,
        tier: true,
      },
    });

    if (!user) {
      return { error: apiError('UNAUTHORIZED', 'User not found. Please authenticate first via POST /api/auth/pi'), user: null };
    }


    const authenticatedUser = user as AuthenticatedUser;
    setCachedUser(tokenHash, authenticatedUser);

    return { error: null, user: authenticatedUser };
  } catch {
    return { error: apiError('UNAUTHORIZED', 'Failed to verify Pi token'), user: null };
  }
}
