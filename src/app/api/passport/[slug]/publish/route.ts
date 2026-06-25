import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { createUserDid } from "@/lib/did";
import { calculateTrustScore } from "@/lib/trust";
import { signPassportCredential } from "@/lib/vc";
import { publishToIPFS } from "@/lib/storage/ipfs-sync";
import { PassportSlugParamSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { getKyaStatus, getKycStatus } from "../_utils";

const AGENT_SELECT = {
  agent: {
    select: { id: true, name: true, status: true },
  },
  stamps: {
    select: { type: true, provider: true },
  },
};

export async function POST(
  request: NextRequest,
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

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`passport-publish:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    // Look up user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: decodedSlug },
          { piUsername: decodedSlug },
          { did: decodedSlug },
        ],
      },
      include: AGENT_SELECT,
    });

    if (!user) {
      // Try by agent publicId
      const agentByPublicId = await prisma.userAgent.findUnique({
        where: { publicId: decodedSlug },
        include: { user: { include: AGENT_SELECT } },
      });
      if (agentByPublicId) {
        user = agentByPublicId.user;
      }
    }

    if (!user) {
      return apiError("NOT_FOUND", "Passport not found for the given slug");
    }

    // Verify authorized: the authenticated user must own this passport
    if (auth.user?.id !== user.id) {
      return apiError("FORBIDDEN", "You are not authorized to publish this passport");
    }

    const did = user.did || createUserDid(user.id);
    const stamps = user.stamps || [];
    const trustScore = calculateTrustScore(user.xp || 0, stamps.length);

    const passportAttestation = {
      username: user.piUsername ?? "",
      xp: user.xp,
      tier: user.tier,
      trustScore,
      kyaStatus: getKyaStatus(stamps, user.kycStatus),
      kycStatus: getKycStatus(user.kycStatus),
    };

    // Sign the credential using the issuer signature
    const vc = signPassportCredential(user.id, did, passportAttestation);

    // Publish to the IPFS gateway
    const ipfsResult = await publishToIPFS(vc);

    return apiSuccess({
      cid: ipfsResult.cid,
      url: ipfsResult.url,
      verifiableCredential: vc,
    }, 200);
  } catch (err) {
    logger.error("Failed to publish passport", { error: err, slug });
    return apiError("INTERNAL_ERROR", "Failed to publish passport to IPFS");
  }
}
