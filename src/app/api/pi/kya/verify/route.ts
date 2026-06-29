import { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyKycServerSide } from '@/lib/pi-kyc';
import { computeTrustScore } from '@/lib/trust-score';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const VerifyKycSchema = z.object({
  accessToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`kya-verify:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = VerifyKycSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const kycResult = await verifyKycServerSide(parsed.data.accessToken);
    if (kycResult.uid !== auth.user.piUid) {
      logger.error(`[KYA-VERIFY] Pi UID mismatch: auth=${auth.user.piUid} token=${kycResult.uid}`);
      return apiError('FORBIDDEN', 'Pi account mismatch');
    }

    const user = await prisma.user.findUnique({
      where: { piUid: auth.user.piUid },
      include: { stamps: true },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'User not found');
    }

    const kycStatus = kycResult.kycVerified ? 'VERIFIED' : 'PENDING';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus,
        kycProvider: 'pi_network',
        kycVerifiedAt: kycResult.kycVerified ? new Date() : null,
      },
    });

    const stampsToScore = user.stamps.map(s => ({
      type: s.type as string,
      xp: s.xpAwarded,
      timestamp: s.createdAt,
    }));

    if (kycResult.kycVerified) {
      await prisma.stamp.create({
        data: {
          userId: user.id,
          type: 'complete_kyc',
          provider: 'pi_network',
          xpAwarded: 200,
        },
      });
      stampsToScore.push({ type: 'complete_kyc', xp: 200, timestamp: new Date() });
    }

    const computedTrustScore = computeTrustScore(stampsToScore, false, user.lastActive);

    return apiSuccess({
      kycStatus,
      uid: kycResult.uid,
      computedTrustScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[KYA-VERIFY] Error:', message);
    return apiError('INTERNAL_ERROR', 'KYC verification failed');
  }
}
