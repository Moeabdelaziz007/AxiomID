import { logger } from '@/lib/logger';
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid } from "@/lib/did";
import { calculateTrustScore, TOTAL_STAMPS } from "@/lib/trust";

interface VerifyUser {
  id: string;
  did?: string | null;
  walletAddress: string;
  stellarAddress?: string | null;
  piUsername?: string | null;
  tier: string;
  xp: number;
  kycStatus?: string | null;
  stamps?: { type: string; provider: string; xpAwarded: number; createdAt: Date }[];
}

/**
 * Builds a JSON-serializable passport verification payload from a user record.
 *
 * @param user - User record containing at minimum: `id`, optional `did`, `walletAddress`, `stellarAddress`, `piUsername`, `tier`, `xp`, `kycStatus`, and `stamps` (array of objects with `type`, `provider`, `xpAwarded`, `createdAt`).
 * @returns An object with the following properties:
 *   - `did`: Decentralized identifier (existing or derived from user id)
 *   - `userId`: User's id
 *   - `walletAddress`: User's wallet address
 *   - `stellarAddress`: User's Stellar address
 *   - `piUsername`: User's Pi username
 *   - `tier`: User tier
 *   - `xp`: User experience points
 *   - `trustScore`: Score computed from the user's `xp` and number of claimed stamps
 *   - `kycStatus`: User KYC status
 *   - `stamps`: Array of stamps with `{ type, provider, xpAwarded, createdAt }`
 *   - `totalStampsCount`: Total possible stamps (constant)
 *   - `claimedStampsCount`: Number of stamps claimed by the user
 */
function buildVerificationResponse(user: VerifyUser) {
  const did = user.did || createUserDid(user.id);
  const stamps = user.stamps || [];
  const trustScore = calculateTrustScore(user.xp || 0, stamps.length);

  return {
    did,
    userId: user.id,
    walletAddress: user.walletAddress,
    stellarAddress: user.stellarAddress,
    piUsername: user.piUsername,
    tier: user.tier,
    xp: user.xp,
    trustScore,
    kycStatus: user.kycStatus,
    stamps: stamps.map((s: { type: string; provider: string; xpAwarded: number; createdAt: Date }) => ({
      type: s.type,
      provider: s.provider,
      xpAwarded: s.xpAwarded,
      createdAt: s.createdAt,
    })),
    totalStampsCount: TOTAL_STAMPS,
    claimedStampsCount: stamps.length,
  };
}

/**
 * Verifies an identity slug and returns the corresponding passport verification payload or an error response.
 *
 * @param _request - The incoming NextRequest (used for client IP extraction and rate limiting)
 * @param params - An object whose `slug` (URL-encoded) identifies the identity to resolve; the slug is decoded before lookup
 * @returns A JSON response: the verification payload for the matched user (status 200), `{ error: "RATE_LIMITED" }` (status 429) when rate limited, `{ error: "NOT_FOUND", message: "No passport found for this identity slug" }` (status 404) if no match is found, or `{ error: "INTERNAL_ERROR" }` (status 500) on server/database error
 */
import { SlugParamSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = SlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  const decodedSlug = decodeURIComponent(slug);

  const ip = getClientIp(_request);
  const rateLimit = await checkRateLimit(`passport-verify:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const includeStamps = {
    include: {
      stamps: true,
    },
  };

  try {
    // 1. Resolve by Agent Public ID
    const agentByPublicId = await prisma.userAgent.findUnique({
      where: { publicId: decodedSlug },
      include: {
        user: includeStamps,
      },
    });

    if (agentByPublicId?.user) {
      return apiSuccess(buildVerificationResponse(agentByPublicId.user));
    }

    // 2. Resolve by User Wallet Address
    const userByWallet = await prisma.user.findUnique({
      where: { walletAddress: decodedSlug },
      ...includeStamps,
    });

    if (userByWallet) {
      return apiSuccess(buildVerificationResponse(userByWallet));
    }

    // 3. Resolve by User Pi Username
    const userByUsername = await prisma.user.findFirst({
      where: { piUsername: decodedSlug },
      ...includeStamps,
    });

    if (userByUsername) {
      return apiSuccess(buildVerificationResponse(userByUsername));
    }

    // 4. Resolve by User DID
    const userByDid = await prisma.user.findFirst({
      where: { did: decodedSlug },
      ...includeStamps,
    });

    if (userByDid) {
      return apiSuccess(buildVerificationResponse(userByDid));
    }

    return apiError("NOT_FOUND", "No passport found for this identity slug");
  } catch (error) {
    logger.error("[PASSPORT-VERIFY-API] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to verify passport");
  }
}
