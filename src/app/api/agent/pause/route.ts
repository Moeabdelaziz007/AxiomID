import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

/**
 * Pauses the authenticated user's agent.
 *
 * The agent must have ACTIVE status; otherwise an error is returned.
 *
 * @returns The updated agent with its ID, public ID, and new PAUSED status
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-pause:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  const user = auth.user;

  try {
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });

    if (!agent) {
      return apiError("NOT_FOUND", "Agent not found");
    }

    if (agent.status !== "ACTIVE") {
      return apiError("CONFLICT", `Agent is ${agent.status.toLowerCase()}, not active`);
    }

    const updated = await prisma.userAgent.update({
      where: { id: agent.id },
      data: { status: "PAUSED" },
    });

    return apiSuccess({
      agentId: updated.id,
      publicId: updated.publicId,
      status: updated.status,
    });
  } catch (error) {
    logger.error("[AGENT-PAUSE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to pause agent");
  }
}
