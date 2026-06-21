import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { isAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  if (!isAdmin(user)) {
    return apiError("FORBIDDEN", "Admin access required");
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`admin-skills:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  try {
    const moderations = await prisma.skillModeration.findMany({
      where: { status: "PENDING" },
      include: { skill: true },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess({ moderations });
  } catch (error) {
    logger.error("[ADMIN-SKILLS-LIST] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to list pending skills");
  }
}
