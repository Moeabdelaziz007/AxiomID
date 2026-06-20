import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { createUserDid } from "@/lib/did";

import { calculateTrustScore } from "@/lib/trust";

/**
 * Handle GET /api/leaderboard to fetch top 50 users sorted by XP balance.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`leaderboard:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const topUsers = await prisma.user.findMany({
      orderBy: {
        xp: "desc",
      },
      take: 50,
      select: {
        id: true,
        piUsername: true,
        walletAddress: true,
        tier: true,
        xp: true,
        createdAt: true,
        did: true,
        stamps: {
          select: {
            id: true,
          },
        },
      },
    });

    // Map response details (count stamps count, etc.)
    const leaderboard = topUsers.map((user, idx) => {
      const stampsCount = user.stamps.length;
      const trustScore = calculateTrustScore(user.xp, stampsCount);
      const userDid = user.did || createUserDid(user.id);
      return {
        rank: idx + 1,
        id: userDid,
        piUsername: user.piUsername,
        walletAddress: user.walletAddress,
        tier: user.tier,
        xp: user.xp,
        trustScore,
        stampsCount,
        createdAt: user.createdAt,
      };
    });

    return apiSuccess({
      leaderboard,
    });
  } catch (error) {
    logger.error("[LEADERBOARD API] Database query failure:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve protocol leaderboard data.");
  }
}
