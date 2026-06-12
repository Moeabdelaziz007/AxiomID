import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid } from "@/lib/did";

const TOTAL_STAMPS_COUNT = 6;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVerificationResponse(user: any) {
  const did = user.did || createUserDid(user.id);
  const stamps = user.stamps || [];
  const trustScore = TOTAL_STAMPS_COUNT > 0 ? Math.round((stamps.length / TOTAL_STAMPS_COUNT) * 100) : 0;

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
    totalStampsCount: TOTAL_STAMPS_COUNT,
    claimedStampsCount: stamps.length,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const ip = getClientIp(_request);
  const rateLimit = await checkRateLimit(`passport-verify:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
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
      return NextResponse.json(buildVerificationResponse(agentByPublicId.user));
    }

    // 2. Resolve by User Wallet Address
    const userByWallet = await prisma.user.findUnique({
      where: { walletAddress: decodedSlug },
      ...includeStamps,
    });

    if (userByWallet) {
      return NextResponse.json(buildVerificationResponse(userByWallet));
    }

    // 3. Resolve by User Pi Username
    const userByUsername = await prisma.user.findFirst({
      where: { piUsername: decodedSlug },
      ...includeStamps,
    });

    if (userByUsername) {
      return NextResponse.json(buildVerificationResponse(userByUsername));
    }

    // 4. Resolve by User DID
    const userByDid = await prisma.user.findFirst({
      where: { did: decodedSlug },
      ...includeStamps,
    });

    if (userByDid) {
      return NextResponse.json(buildVerificationResponse(userByDid));
    }

    return NextResponse.json(
      { error: "NOT_FOUND", message: "No passport found for this identity slug" },
      { status: 404 }
    );
  } catch (error) {
    logger.error("[PASSPORT-VERIFY-API] Database error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
