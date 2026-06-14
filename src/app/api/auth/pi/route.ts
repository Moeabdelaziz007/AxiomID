import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PiAuthSchema } from '@/lib/validators';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier } from '@/lib/tiers';
import { encryptToken } from '@/lib/crypto';

interface PiApiUser {
  uid: string;
  username: string;
  wallet?: {
    address: string;
  };
  // Fallbacks for testing & legacy payloads
  wallet_address?: string;
  stellarAddress?: string;
}

function getVerifiedStellarAddress(piUser: PiApiUser): string | null {
  const address = piUser.wallet?.address || piUser.wallet_address || piUser.stellarAddress;
  if (typeof address === 'string' && /^G[A-Z2-7]{55}$/.test(address)) {
    return address;
  }
  return null;
}

function buildPiDid(uid: string): string {
  return `did:axiom:axiomid.app:pi:${encodeURIComponent(uid)}`;
}

/**
 * Authenticates or registers a user using a Pi (MinePi) access token and returns the user's public account info.
 *
 * Validates the JSON body, enforces rate limits, verifies the Pi access token and optional Stellar address, creates or updates
 * the corresponding user record, and returns the resulting account metadata.
 *
 * @param request - Incoming NextRequest whose JSON body must include `accessToken`, `uid`, and `username`
 * @returns An HTTP response: on success contains `{ userId, walletAddress, stellarAddress, piUid, piUsername, tier, xp, did, kycStatus, hasAgent }`; on failure returns an error response with one of the codes `RATE_LIMITED`, `VALIDATION_ERROR`, `PI_AUTH_FAILED`, or `INTERNAL_ERROR`.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`pi-auth:${ip}`, RATE_LIMITS.piAuth);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many authentication attempts. Try again later.', undefined, rateLimitHeaders(rateLimit));
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
  let verifiedStellarAddress: string | null = null;

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!piResponse.ok) {
      return apiError('PI_AUTH_FAILED', 'Invalid Pi access token');
    }

    const piUser = (await piResponse.json()) as PiApiUser;
    if (piUser.uid !== uid) {
      return apiError('PI_AUTH_FAILED', 'Token UID mismatch');
    }

    verifiedStellarAddress = getVerifiedStellarAddress(piUser);
  } catch {
    return apiError('PI_AUTH_FAILED', 'Failed to verify Pi token');
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { piUid: uid },
      include: { agent: true },
    });

    const walletAddress = `pi:${uid}`;
    const piDid = buildPiDid(uid);

    let user;
    if (existingUser) {
      const needsDidRepair = !existingUser.did || !existingUser.didMethod;
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          piUsername: username,
          walletAddress,
          stellarAddress: verifiedStellarAddress,
          piAccessToken: encryptToken(accessToken),
          lastActive: new Date(),
          ...(needsDidRepair && { did: piDid, didMethod: 'did:axiom' }),
        },
        include: { agent: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          walletAddress,
          stellarAddress: verifiedStellarAddress,
          piUid: uid,
          piUsername: username,
          piAccessToken: encryptToken(accessToken),
          did: piDid,
          didMethod: 'did:axiom',
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
      did: user.did || piDid,
      kycStatus: user.kycStatus,
      hasAgent: !!user.agent,
    });
  } catch (error) {
    logger.error('[PI-AUTH] Database error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create or update user');
  }
}

