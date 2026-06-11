import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PiAuthSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier } from '@/lib/tiers';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`pi-auth:${ip}`, RATE_LIMITS.piAuth);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many authentication attempts. Try again later.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const parsed = PiAuthSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, parsed.error.issues);
  }

  const { accessToken, uid, username, walletAddress: clientWalletAddress, stellarAddress } = parsed.data;

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!piResponse.ok) {
      return apiError('PI_AUTH_FAILED', 'Invalid Pi access token');
    }

    const piUser = await piResponse.json();
    if (piUser.uid !== uid) {
      return apiError('PI_AUTH_FAILED', 'Token UID mismatch');
    }
  } catch {
    return apiError('PI_AUTH_FAILED', 'Failed to verify Pi token');
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { piUid: uid },
      include: { agent: true },
    });

    const walletAddress = clientWalletAddress || `pi:${uid}`;

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          piAccessToken: accessToken,
          piUsername: username,
          walletAddress,
          lastActive: new Date(),
        },
        include: { agent: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          walletAddress,
          piUid: uid,
          piUsername: username,
          piAccessToken: accessToken,
          tier: 'Visitor',
          xp: 0,
        },
        include: { agent: true },
      });
    }

    const tier = calculateTier(user.xp);

    return apiSuccess({
      userId: user.id,
      walletAddress: user.walletAddress,
      stellarAddress: stellarAddress || null,
      piUid: user.piUid,
      piUsername: user.piUsername,
      tier,
      xp: user.xp,
      did: user.did,
      kycStatus: user.kycStatus,
      hasAgent: !!user.agent,
    });
  } catch (error) {
    console.error('[PI-AUTH] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create or update user');
  }
}
