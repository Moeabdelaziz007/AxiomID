import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existing) {
      return apiError('NOT_FOUND', 'User not found');
    }

    if (existing.kycStatus && existing.kycStatus !== 'NONE') {
      return apiSuccess({
        userId: existing.id,
        walletAddress: existing.walletAddress,
        tier: existing.tier,
        xp: existing.xp,
        kycStatus: existing.kycStatus,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'PENDING',
        kycProvider: 'pi_network',
        did: existing.did || `did:axiom:${user.piUsername || user.piUid}`,
        lastActive: new Date(),
      },
    });

    return apiSuccess({
      userId: updated.id,
      walletAddress: updated.walletAddress,
      kycStatus: updated.kycStatus,
      did: updated.did,
    });
  } catch (error) {
    console.error('[KYA-CLAIM] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to claim KYA');
  }
}
