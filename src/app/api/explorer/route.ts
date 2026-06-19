import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";

/**
 * Handle GET /api/explorer to fetch dynamic blockchain network details,
 * recent payments ledger, tier distribution, and active nodes graph data.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`explorer:${ip}`, RATE_LIMITS.anonymous);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  try {
    // 1. Fetch aggregates
    const [userCount, agentCount, activeAgentCount, paymentCount, xpSum] = await Promise.all([
      prisma.user.count(),
      prisma.userAgent.count(),
      prisma.userAgent.count({ where: { status: "ACTIVE" } }),
      prisma.piPayment.count(),
      prisma.xpLedger.aggregate({ _sum: { amount: true } }),
    ]);

    // 2. Fetch recent payments
    const recentPayments = await prisma.piPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        status: true,
        memo: true,
        createdAt: true,
        user: {
          select: {
            piUsername: true,
            walletAddress: true,
          },
        },
      },
    });

    // 3. Fetch active nodes (users with agents or high XP) to render the interactive SVG Node Graph
    const activeNodes = await prisma.user.findMany({
      where: {
        OR: [
          { agent: { isNot: null } },
          { xp: { gt: 0 } },
        ],
      },
      orderBy: { xp: "desc" },
      take: 15,
      select: {
        id: true,
        piUsername: true,
        walletAddress: true,
        did: true,
        tier: true,
        xp: true,
        agent: {
          select: {
            name: true,
            status: true,
          },
        },
      },
    });

    // 4. Fetch tier aggregates
    const tierGroups = await prisma.user.groupBy({
      by: ["tier"],
      _count: {
        id: true,
      },
    });

    const tierDistribution = {
      Visitor: 0,
      Citizen: 0,
      Validator: 0,
      Sovereign: 0,
    };

    tierGroups.forEach((group) => {
      const tierKey = group.tier as keyof typeof tierDistribution;
      if (tierKey in tierDistribution) {
        tierDistribution[tierKey] = group._count.id;
      }
    });

    return apiSuccess({
      stats: {
        registeredUsers: userCount,
        totalAgents: agentCount,
        activeAgents: activeAgentCount,
        totalPayments: paymentCount,
        totalXpEarned: xpSum._sum.amount ?? 0,
      },
      recentPayments,
      activeNodes,
      tierDistribution,
    });
  } catch (error) {
    logger.error("[EXPLORER API] Failed to fetch explorer database metadata:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve network explorer datasets.");
  }
}
