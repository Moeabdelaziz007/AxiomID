import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid } from "@/lib/did";

const AGENT_SELECT = {
  agent: {
    select: { name: true, status: true },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPassportResponse(user: any) {
  const did = user.did || createUserDid(user.id);
  const trustScore = Math.min(100, Math.floor((user.xp || 0) / 10));
  const kyaStatus = user.kycStatus === "VERIFIED"
    ? "verified"
    : user.kycStatus === "PENDING"
      ? "pending"
      : "denied";

  return {
    username: user.piUsername || "AxiomID Agent",
    walletAddress: user.walletAddress,
    did,
    tier: user.tier,
    xp: user.xp,
    trustScore,
    kyaStatus,
    kycStatus: kyaStatus,
    issuedDate: user.createdAt.toISOString(),
    agentName: user.agent?.name || null,
    agentStatus: user.agent?.status || null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const ip = getClientIp(_request);
  const rateLimit = await checkRateLimit(`passport:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const agentByPublicId = await prisma.userAgent.findUnique({
      where: { publicId: decodedSlug },
      include: {
        user: {
          include: AGENT_SELECT,
        },
      },
    });

    if (agentByPublicId) {
      return NextResponse.json(buildPassportResponse(agentByPublicId.user));
    }

    const userByWallet = await prisma.user.findUnique({
      where: { walletAddress: decodedSlug },
      include: AGENT_SELECT,
    });

    if (userByWallet) {
      return NextResponse.json(buildPassportResponse(userByWallet));
    }

    const userByUsername = await prisma.user.findFirst({
      where: { piUsername: decodedSlug },
      include: AGENT_SELECT,
    });

    if (userByUsername) {
      return NextResponse.json(buildPassportResponse(userByUsername));
    }

    const userByDid = await prisma.user.findFirst({
      where: { did: decodedSlug },
      include: AGENT_SELECT,
    });

    if (userByDid) {
      return NextResponse.json(buildPassportResponse(userByDid));
    }

    return NextResponse.json({ error: "NOT_FOUND", message: "No passport found for this slug" }, { status: 404 });
  } catch (error) {
    console.error("[PASSPORT-API] Database error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
