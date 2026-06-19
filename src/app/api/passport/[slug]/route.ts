import { logger } from '@/lib/logger';
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid } from "@/lib/did";
import { calculateTrustScore } from "@/lib/trust";
import { deriveSovereignAgentKeypair } from "@/lib/pi-sdk";

interface PassportStamp {
  type: string;
  provider: string;
}

interface PassportUser {
  id: string;
  did?: string | null;
  piUsername?: string | null;
  walletAddress: string;
  stellarAddress?: string | null;
  tier: string;
  xp: number;
  kycStatus?: string | null;
  createdAt: Date;
  stamps?: PassportStamp[];
  agent?: { id: string; name: string; status: string } | null;
}

const AGENT_SELECT = {
  agent: {
    select: { id: true, name: true, status: true },
  },
  stamps: {
    select: { type: true, provider: true },
  },
};

/**
 * Determines the Know Your Account (KYA) status based on available verification stamps.
 *
 * @param stamps - Optional array of passport stamps.
 * @returns `"verified"` if an identity verification or Pi stamp is present, `"pending"` otherwise.
 */
function getKyaStatus(stamps: PassportStamp[] | undefined): "verified" | "pending" | "denied" {
  if (!stamps || stamps.length === 0) return "pending";
  const hasIdentityStamp = stamps.some(
    (s) => s.type === "verify_identity" || s.provider === "pi"
  );
  return hasIdentityStamp ? "verified" : "pending";
}

/**
 * Normalizes a KYC status value to a standard verification state.
 *
 * @param kycStatus - The KYC status string, which may be undefined or null
 * @returns `"verified"` for `"VERIFIED"`, `"pending"` for missing or `"PENDING"`/`"NONE"`, `"denied"` for any other value
 */
function getKycStatus(kycStatus: string | undefined | null): "verified" | "pending" | "denied" {
  if (kycStatus === "VERIFIED") return "verified";
  if (!kycStatus || kycStatus === "PENDING" || kycStatus === "NONE") return "pending";
  return "denied";
}

function buildPassportResponse(user: PassportUser) {
  const did = user.did || createUserDid(user.id);
  const stamps = user.stamps || [];
  const trustScore = calculateTrustScore(user.xp || 0, stamps.length);

  let agentPublicKey: string | null = null;
  if (user.agent && (user.stellarAddress || user.walletAddress)) {
    try {
      const keys = deriveSovereignAgentKeypair(user.stellarAddress || user.walletAddress, user.agent.id);
      agentPublicKey = keys.publicKey;
    } catch (e) {
      logger.error('[PASSPORT-API] Key derivation failed:', e);
    }
  }

  return {
    username: user.piUsername || "AxiomID Agent",
    walletAddress: user.walletAddress,
    stellarAddress: user.stellarAddress || null,
    did,
    tier: user.tier,
    xp: user.xp,
    trustScore,
    kyaStatus: getKyaStatus(stamps),
    kycStatus: getKycStatus(user.kycStatus),
    stamps: stamps.map((s) => ({ type: s.type, provider: s.provider })),
    issuedDate: user.createdAt.toISOString(),
    agentName: user.agent?.name || null,
    agentStatus: user.agent?.status || null,
    agentPublicKey,
  };
}

/**
 * Fetches a user's passport by a route slug and returns a JSON response.
 *
 * The slug is decoded and matched in this order: agent publicId, wallet address,
 * Pi username, then DID. Enforces per-IP rate limits before lookup.
 *
 * @param _request - The incoming NextRequest (used to derive client IP for rate limiting)
 * @param params - An object whose `slug` route parameter will be decoded and used to find the passport
 * @returns A NextResponse containing the passport JSON when a user is found, or a JSON error object with `error` set to `RATE_LIMITED`, `NOT_FOUND`, or `INTERNAL_ERROR` and the corresponding HTTP status
 */
import { PassportSlugParamSchema } from "@/lib/validators";

/**
 * Retrieves a user passport by identifier, with rate limiting per client IP.
 *
 * Searches by agent public ID, wallet address, username, or DID.
 *
 * @returns An HTTP response containing the formatted passport, or an error response.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsedParams = PassportSlugParamSchema.safeParse({ slug });
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid slug encoding");
  }

  const ip = getClientIp(_request);
  const rateLimit = await checkRateLimit(`passport:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  try {
    // Try agent publicId first (indexed, unique)
    const cacheHeaders: Record<string, string> = {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    };

    const agentByPublicId = await prisma.userAgent.findUnique({
      where: { publicId: decodedSlug },
      include: { user: { include: AGENT_SELECT } },
    });
    if (agentByPublicId) {
      return apiSuccess(buildPassportResponse(agentByPublicId.user), 200, cacheHeaders);
    }

    // Single OR query for wallet, username, and DID (all indexed)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: decodedSlug },
          { piUsername: decodedSlug },
          { did: decodedSlug },
        ],
      },
      include: AGENT_SELECT,
    });
    if (user) {
      return apiSuccess(buildPassportResponse(user), 200, cacheHeaders);
    }

    return apiError("NOT_FOUND", "No passport found for this slug");
  } catch (error) {
    logger.error("[PASSPORT-API] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve passport");
  }
}
