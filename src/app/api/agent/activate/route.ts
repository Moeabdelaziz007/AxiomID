import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * Activates an authenticated user's agent after rate-limit verification.
 *
 * @returns The activated agent's ID and status on success, or an error response if activation fails.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-activate:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  const user = auth.user;

  try {
    const agentDid = user.did ? `${user.did}:agent` : `did:axiom:pi:${user.piUsername || user.piUid || user.id}:agent`;

    const result = await prisma.$queryRaw<Array<{ id: string; publicId: string; status: string }>>`
      UPDATE "UserAgent"
      SET status = 'ACTIVE', did = ${agentDid}, "lastActive" = NOW(), "updatedAt" = NOW()
      WHERE "userId" = ${user.id} AND status IN ('INACTIVE', 'PAUSED')
      RETURNING id, "publicId", status
    `;

    if (result.length > 0) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: 'agent_activated',
        properties: {
          agent_id: result[0].id,
        },
      });
      await posthog.flush();

      return apiSuccess({
        agentId: result[0].id,
        status: result[0].status,
      });
    }

    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });

    if (!agent) {
      return apiError("NOT_FOUND", "Agent not found");
    }

    if (agent.status === "ACTIVE") {
      return apiError("CONFLICT", "Agent is already active");
    }

    return apiError("FORBIDDEN", `Cannot activate agent with status ${agent.status}`);
  } catch (error) {
    logger.error("[AGENT-ACTIVATE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to activate agent");
  }
}
