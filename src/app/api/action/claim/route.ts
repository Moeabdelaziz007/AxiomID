import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ActionClaimSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { ACTIONS } from '@/lib/actions';
import { calculateTier } from '@/lib/tiers';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`action-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many claim requests. Try again later.');
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

  const parsed = ActionClaimSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { actionType, metadata } = parsed.data;

  const actionDef = Object.values(ACTIONS).find((a) => a.id === actionType);
  if (!actionDef) {
    return apiError('VALIDATION_ERROR', `Unknown action type: ${actionType}`);
  }

  try {
    const existing = await prisma.action.findUnique({
      where: { user_action_unique: { userId: authUser.id, type: actionType } },
    });

    if (existing) {
      return apiError('CONFLICT', 'This action has already been claimed');
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({ where: { id: authUser.id } });
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const action = await tx.action.create({
        data: {
          userId: authUser.id,
          type: actionType,
          xp: actionDef.xp,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      const newBalance = user.xp + actionDef.xp;
      const ledgerEntry = await tx.xpLedger.create({
        data: {
          userId: authUser.id,
          amount: actionDef.xp,
          reason: 'action_claim',
          reference: JSON.stringify({ actionId: action.id }),
          balance: newBalance,
        },
      });

      const newTier = calculateTier(newBalance);
      await tx.user.update({
        where: { id: authUser.id },
        data: {
          xp: newBalance,
          tier: newTier,
          lastActive: new Date(),
        },
      });

      return { action, ledgerEntry, newTier, newBalance };
    });

    return apiSuccess({
      actionId: result.action.id,
      xpEarned: actionDef.xp,
      newBalance: result.newBalance,
      tier: result.newTier,
      ledgerEntryId: result.ledgerEntry.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return apiError('NOT_FOUND', 'User not found');
    }
    console.error('[ACTION-CLAIM] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to claim action');
  }
}
