import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { ACTIONS } from '@/lib/actions';
import { calculateTier } from '@/lib/tiers';
import { requireAuth } from '@/lib/auth-middleware';

const DISCONNECTABLE = new Set(['twitter', 'discord', 'google']);

/**
 * POST /api/social/disconnect — Remove a connected social account for the authenticated user.
 *
 * Deletes the corresponding `connect_{platform}` stamp and action, deducts the XP
 * originally awarded for the connection, and recalculates the user's tier. Only the
 * authenticated user's own records are affected.
 *
 * @returns On success, the removed platform, XP deducted, new balance, and new tier.
 *   On failure, a structured API error (RATE_LIMITED, VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`social-disconnect:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user: authUser } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const platform = (body as { platform?: unknown })?.platform;
  if (typeof platform !== 'string' || !DISCONNECTABLE.has(platform)) {
    return apiError('VALIDATION_ERROR', 'platform must be one of: twitter, discord, google');
  }

  const actionType = `connect_${platform}`;
  const actionDef = Object.values(ACTIONS).find((a) => a.id === actionType);
  const awardedXp = actionDef?.xp ?? 0;

  try {
    const existing = await prisma.stamp.findUnique({
      where: { user_stamp_unique: { userId: authUser.id, type: actionType } },
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'This account is not connected');
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({ where: { id: authUser.id } });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      await tx.stamp.delete({
        where: { user_stamp_unique: { userId: authUser.id, type: actionType } },
      });

      // Remove the matching action ledger entry, if present.
      await tx.action.deleteMany({
        where: { userId: authUser.id, type: actionType },
      });

      const newBalance = Math.max(0, user.xp - awardedXp);
      const ledgerEntry = await tx.xpLedger.create({
        data: {
          userId: authUser.id,
          amount: -awardedXp,
          reason: 'social_disconnect',
          reference: JSON.stringify({ stampId: existing.id, platform }),
          balance: newBalance,
        },
      });

      const newTier = calculateTier(newBalance);
      await tx.user.update({
        where: { id: authUser.id },
        data: { xp: newBalance, tier: newTier, lastActive: new Date() },
      });

      return { ledgerEntry, newBalance, newTier };
    });

    return apiSuccess({
      disconnected: true,
      platform,
      xpDeducted: awardedXp,
      newBalance: result.newBalance,
      tier: result.newTier,
      ledgerEntryId: result.ledgerEntry.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return apiError('NOT_FOUND', 'User not found');
    }
    logger.error('[SOCIAL-DISCONNECT] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to disconnect account');
  }
}
