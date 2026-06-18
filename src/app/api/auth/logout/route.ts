import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { requireAuth, clearAuthCache, hashToken } from '@/lib/auth-middleware';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';

/**
 * Logs out the authenticated user and invalidates their cached access token.
 *
 * @returns An HTTP response with the logout result.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`auth-logout:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.slice(7);

  try {
    // Remove piAccessToken from DB
    await prisma.user.update({
      where: { id: auth.user.id },
      data: { piAccessToken: null },
    });

    // Invalidate only this user's cached token (not all users)
    if (accessToken) {
      clearAuthCache(hashToken(accessToken));
    }

    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('[AUTH-LOGOUT] Error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to logout');
  }
}
