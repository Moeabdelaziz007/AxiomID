import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier, getLevelProgress, getNextLevelXP } from '@/lib/tiers';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Handle GET requests for the authenticated user's status, returning identity, XP/tier information, activity, and recent ledger entries.
 *
 * May return a rate-limited response, an authentication error response, `NOT_FOUND` if the user does not exist, or `INTERNAL_ERROR` on database failures.
 *
 * @returns On success, an API success payload containing:
 * - userId, walletAddress, piUsername, did, kycStatus
 * - `tier`, `xp`, `levelProgress`, `nextLevelXP`
 * - `agent`, `actions`, `stamps`, `recentLedger`
 * - aggregated `stats` (totalActions, totalLedgerEntries)
 * - `lastActive` and `createdAt` timestamps.
 * On failure, an API error object indicating `RATE_LIMITED`, authentication error, `NOT_FOUND`, or `INTERNAL_ERROR`.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`user-status:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: {
        agent: {
          select: {
            id: true,
            publicId: true,
            name: true,
            status: true,
            mode: true,
          },
        },
        actions: {
          select: {
            type: true,
            xp: true,
            timestamp: true,
            metadata: true,
          },
        },
        stamps: {
          select: {
            type: true,
            provider: true,
            xpAwarded: true,
            metadata: true,
            createdAt: true,
          },
        },
        xpLedger: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            reason: true,
            balance: true,
            createdAt: true,
          },
        },
        _count: {
          select: { actions: true, xpLedger: true },
        },
      },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'User not found');
    }

    const tier = calculateTier(user.xp);
    const progress = getLevelProgress(user.xp, tier);
    const nextLevelXP = getNextLevelXP(tier);

    return apiSuccess({
      userId: user.id,
      walletAddress: user.walletAddress,
      piUsername: user.piUsername,
      did: user.did,
      kycStatus: user.kycStatus,
      tier,
      xp: user.xp,
      levelProgress: progress,
      nextLevelXP,
      agent: user.agent,
      actions: user.actions,
      stamps: user.stamps,
      recentLedger: user.xpLedger,
      stats: {
        totalActions: user._count.actions,
        totalLedgerEntries: user._count.xpLedger,
      },
      lastActive: user.lastActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('[USER-STATUS] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch user status');
  }
}
