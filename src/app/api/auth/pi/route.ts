import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PiAuthSchema } from '@/lib/validators';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { calculateTier } from '@/lib/tiers';
import { encryptToken, hashPiUid } from '@/lib/crypto';
import { createPiDid } from '@/lib/did';
import { getSandboxDevToken } from '@/lib/sandbox-token';
import { getPostHogClient } from '@/lib/posthog-server';

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

  const { accessToken, uid: providedUid, username: clientUsername } = parsed.data;
  let verifiedStellarAddress: string | null = null;
  let verifiedUsername = '';
  let verifiedUid = providedUid ?? '';

  // ponytail: Rely strictly on NODE_ENV to prevent auth bypass via Host header injection
  const isLocalDev = process.env.NODE_ENV !== "production";

  try {
    // Sandbox dev token only allowed in local development — never in production
    const sandboxToken = getSandboxDevToken();
    if (isLocalDev && sandboxToken && sandboxToken.length > 0 && accessToken && accessToken.length > 0 && accessToken === sandboxToken) {
      verifiedStellarAddress = "GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2";
      verifiedUsername = clientUsername ?? '';
    } else {
      // Production: always verify against Pi API.
      // 10s timeout matches verifyKycServerSide (src/lib/pi-kyc.ts) and the
      // client handoff in use-wallet-auth.ts — the previous 5s cap frequently
      // tripped on Vercel cold starts and surfaced as a generic "Pi auth
      // failing" timeout error.
      const piResponse = await fetch('https://api.minepi.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!piResponse.ok) {
        const errorBody = await piResponse.text().catch(() => "unable to read body");
        logger.error(`[PI-AUTH] Pi API returned ${piResponse.status}: ${errorBody}`);
        return apiError('PI_AUTH_FAILED', `Pi API returned ${piResponse.status}: ${piResponse.statusText}`);
      }

      const piUser = (await piResponse.json()) as PiApiUser;
      verifiedUid = piUser.uid || verifiedUid;

      if (providedUid && piUser.uid && piUser.uid !== providedUid) {
        logger.error(`[PI-AUTH] UID mismatch: token uid=${providedUid}, pi api uid=${piUser.uid}`);
        return apiError('PI_AUTH_FAILED', 'Token UID mismatch');
      }

      if (!verifiedUid) {
        logger.error('[PI-AUTH] Pi API did not return a user id');
        return apiError('PI_AUTH_FAILED', 'Pi API did not return a user id');
      }

      verifiedStellarAddress = getVerifiedStellarAddress(piUser);
      if (!isLocalDev) {
        if (!piUser.username) {
          logger.error('[PI-AUTH] Pi API did not return a verified username');
          return apiError('PI_AUTH_FAILED', 'Could not verify Pi username with the Pi Platform API.');
        }
        verifiedUsername = piUser.username;
      } else {
        verifiedUsername = clientUsername ?? '';
      }
    }
  } catch (fetchError) {
    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
    logger.error(`[PI-AUTH] Pi API fetch failed: ${message}`);
    if (message.includes("timeout") || message.includes("abort")) {
      return apiError('PI_AUTH_FAILED', 'Pi API request timed out. Check your network connection.');
    }
    return apiError('PI_AUTH_FAILED', `Failed to verify Pi token: ${message}`);
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { piUid: verifiedUid },
      include: { agent: true },
    });

    const walletAddress = `pi:${verifiedUid}`;
    const piDid = createPiDid(verifiedUsername || verifiedUid || 'pi-user');

    let user;
    if (existingUser) {
      const needsDidRepair =
        !existingUser.did ||
        !existingUser.didMethod ||
        existingUser.did !== piDid;
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          piUsername: verifiedUsername,
          walletAddress,
          stellarAddress: verifiedStellarAddress,
          piAccessToken: encryptToken(accessToken),
          kycUidHash: hashPiUid(verifiedUid),
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
          piUid: verifiedUid,
          piUsername: verifiedUsername,
          piAccessToken: encryptToken(accessToken),
          kycUidHash: hashPiUid(verifiedUid),
          did: piDid,
          didMethod: 'did:axiom',
          tier: 'Visitor',
          xp: 0,
        },
        include: { agent: true },
      });
    }

    const tier = calculateTier(user.xp);
    const isNew = !existingUser;

    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: user.id,
      properties: {
        tier,
        kycStatus: user.kycStatus,
        hasAgent: !!user.agent,
      },
    });
    if (isNew) {
      posthog.capture({
        distinctId: user.id,
        event: 'user_signed_up',
        properties: {
          tier,
          kycStatus: user.kycStatus,
          source: 'pi_network',
        },
      });
    }
    await posthog.flush();

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
