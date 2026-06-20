import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateAgentSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

/**
 * Creates a new agent for an authenticated user.
 *
 * Returns HTTP 201 with agent details on success, or an error response if the request
 * is invalid, rate-limited, unauthenticated, or if the user already has an agent.
 *
 * @param request - The incoming HTTP request
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-create:${ip}`, RATE_LIMITS.authenticated);
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

  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const existing = await prisma.userAgent.findUnique({ where: { userId: user.id } });
    if (existing) {
      return apiError("CONFLICT", "User already has an agent");
    }

    const agent = await prisma.userAgent.create({
      data: {
        userId: user.id,
        name: parsed.data.name || "My Agent",
        description: parsed.data.description || null,
        status: "INACTIVE",
      },
    });

    return apiSuccess({
      agentId: agent.id,
      publicId: agent.publicId,
      name: agent.name,
      status: agent.status,
    }, 201);
  } catch (error) {
    logger.error("[AGENT-CREATE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to create agent");
  }
}
