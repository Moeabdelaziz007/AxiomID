import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PiAuthSchema } from '@/lib/validators';
import { apiError, apiSuccess } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier } from '@/lib/tiers';

const PI_WALLET_ADDRESS_REGEX = /^pi:[a-zA-Z0-9_-]+$/;
const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

type PiApiUser = {
  uid?: unknown;
  username?: unknown;
  walletAddress?: unknown;
  wallet_address?: unknown;
  pi_wallet_address?: unknown;
  piAddress?: unknown;
  stellarAddress?: unknown;
};

function getVerifiedPiWalletAddress(piUser: PiApiUser, uid: string): string {
  const candidates = [piUser.walletAddress, piUser.pi_wallet_address, piUser.piAddress];
  const verifiedAddress = candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && PI_WALLET_ADDRESS_REGEX.test(candidate)
  );

  return verifiedAddress ?? `pi:${uid}`;
}

function getVerifiedStellarAddress(piUser: PiApiUser): string | null {
  const candidates = [piUser.wallet_address, piUser.stellarAddress];
  const verifiedAddress = candidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && STELLAR_ADDRESS_REGEX.test(candidate)
  );

  return verifiedAddress ?? null;
}

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

  const { accessToken, uid, username } = parsed.data;
  let verifiedWalletAddress = `pi:${uid}`;
  let verifiedStellarAddress: string | null = null;

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!piResponse.ok) {
      return apiError('PI_AUTH_FAILED', 'Invalid Pi access token');
    }

    const piUser = await piResponse.json() as PiApiUser;
    if (piUser.uid !== uid) {
      return apiError('PI_AUTH_FAILED', 'Token UID mismatch');
    }

    verifiedWalletAddress = getVerifiedPiWalletAddress(piUser, uid);
    verifiedStellarAddress = getVerifiedStellarAddress(piUser);
  } catch {
    return apiError('PI_AUTH_FAILED', 'Failed to verify Pi token');
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { piUid: uid },
      include: { agent: true },
    });

    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          piUsername: username,
          walletAddress: verifiedWalletAddress,
          stellarAddress: verifiedStellarAddress,
          lastActive: new Date(),
        },
        include: { agent: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          walletAddress: verifiedWalletAddress,
          stellarAddress: verifiedStellarAddress,
          piUid: uid,
          piUsername: username,
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
      stellarAddress: user.stellarAddress,
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
