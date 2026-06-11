import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { KyaClaimSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.');
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const validation = KyaClaimSchema.safeParse(body);
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', validation.error.issues[0].message);
  }

  const { username } = validation.data;

  try {
    const existing = await prisma.user.findUnique({ where: { piUid: user.piUid } });

    if (!existing) {
      const newUser = await prisma.user.create({
        data: {
          piUid: user.piUid,
          piUsername: username,
          walletAddress: `pi:${username}`,
          kycStatus: 'PENDING',
          did: `did:axiom:${user.piUid}`,
        },
      });

      return apiSuccess({
        userId: newUser.id,
        walletAddress: newUser.walletAddress,
        kycStatus: newUser.kycStatus,
        did: newUser.did,
      }, 201);
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        kycStatus: 'PENDING',
        kycProvider: 'pi_network',
        did: existing.did || `did:axiom:${user.piUid}`,
      },
    });

    return apiSuccess({
      userId: updated.id,
      walletAddress: updated.walletAddress,
      kycStatus: updated.kycStatus,
      did: updated.did,
      tier: updated.tier,
      xp: updated.xp,
    });
  } catch (error) {
    console.error('[KYA-CLAIM] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to claim KYA');
  }
}
