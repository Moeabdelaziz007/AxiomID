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

function hashToken(token: string): string {
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

function getCachedUser(tokenHash: string): AuthenticatedUser | null {
  const entry = tokenCache.get(tokenHash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(tokenHash);
    return null;
  }
  return entry.user;
}

function setCachedUser(tokenHash: string, user: AuthenticatedUser): void {
  if (tokenCache.size > MAX_CACHE_SIZE) {
    cleanupExpiredEntries();
  }
  tokenCache.set(tokenHash, {
    user,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateCachedToken(tokenHash: string): void {
  tokenCache.delete(tokenHash);
}

/** Clear the in-memory auth cache. Exported for testing only. */
export function clearAuthCache(): void {
  tokenCache.clear();
}

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


    setCachedUser(tokenHash, authenticatedUser);

    return { error: null, user: authenticatedUser };
  } catch {
    return { error: apiError('UNAUTHORIZED', 'Failed to verify Pi token'), user: null };
  }
}
