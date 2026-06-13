import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { createUserDid } from "@/lib/did";
import { calculateTrustScore } from "@/lib/trust";

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
  stamps?: { type: string }[];
  agent?: { name: string; status: string } | null;
}

const AGENT_SELECT = {
  agent: {
    select: { name: true, status: true },
  },
  stamps: {
    select: { type: true },
  },
};

/**
 * Builds a passport object containing public identity, verification status, and trust metadata for a user.
 *
 * @param user - A user record with expected properties: `id`, optional `did`, optional `piUsername`, `walletAddress`, optional `stellarAddress`, `tier`, `xp`, optional `stamps` (array), `kycStatus`, `createdAt` (Date), and optional `agent` with `name` and `status`.
 * @returns An object with the following fields: `username`, `walletAddress`, `stellarAddress`, `did`, `tier`, `xp`, `trustScore`, `kyaStatus`, `kycStatus`, `issuedDate`, `agentName`, and `agentStatus`.
 */
function buildPassportResponse(user: PassportUser) {
  const did = user.did || createUserDid(user.id);
  const trustScore = calculateTrustScore(user.xp || 0, (user.stamps || []).length);
  const kyaStatus = user.kycStatus === "VERIFIED"
    ? "verified"
    : user.kycStatus === "PENDING"
      ? "pending"
      : "denied";

  return {
    username: user.piUsername || "AxiomID Agent",
    walletAddress: user.walletAddress,
    stellarAddress: user.stellarAddress || null,
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
    logger.error("[PASSPORT-API] Database error:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
