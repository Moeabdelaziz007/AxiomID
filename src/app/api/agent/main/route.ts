import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { AgentMainSchema } from "@/lib/validators";

/**
 * Executes an authenticated agent action for the current user.
 *
 * @returns An API response containing the executed action details and timestamp, or an error response.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-main:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AgentMainSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const agent = await prisma.userAgent.findUnique({ where: { userId: user.id } });

    if (!agent) {
      return apiError("NOT_FOUND", "Agent not found");
    }

    if (agent.status !== "ACTIVE") {
      return apiError("FORBIDDEN", `Agent is ${agent.status.toLowerCase()}, not active`);
    }

    await prisma.$transaction([
      prisma.agentLog.create({
        data: {
          userId: user.id,
          agentId: agent.id,
          level: "info",
          source: "agent",
          message: `Executed action: ${parsed.data.action}`,
          metadata: parsed.data.params ? JSON.stringify(parsed.data.params) : null,
        },
      }),
      prisma.userAgent.update({
        where: { id: agent.id },
        data: { lastActive: new Date() },
      }),
    ]);


    return apiSuccess({
      agentId: agent.id,
      action: parsed.data.action,
      result: `Executed ${parsed.data.action} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[AGENT-MAIN] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to execute agent action");
  }
}
