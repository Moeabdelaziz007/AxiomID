import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { isAdmin } from "@/lib/admin";
import { ModerationActionSchema, ModerationIdParamSchema } from "@/lib/validators";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  if (!isAdmin(user)) {
    return apiError("FORBIDDEN", "Admin access required");
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`admin-skills-action:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  const resolvedParams = await params;
  const parsedParams = ModerationIdParamSchema.safeParse(resolvedParams);
  if (!parsedParams.success) {
    return apiError("VALIDATION_ERROR", parsedParams.error.issues[0].message, parsedParams.error.issues);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = ModerationActionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { action, reason, notes } = parsed.data;
  const moderationId = parsedParams.data.id;

  try {
    const existing = await prisma.skillModeration.findUnique({
      where: { id: moderationId },
    });

    if (!existing) {
      return apiError("NOT_FOUND", "Moderation entry not found");
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const moderation = await prisma.skillModeration.update({
      where: { id: moderationId },
      data: {
        status: newStatus,
        reviewerId: user.id,
        reason: reason ?? null,
        notes: notes ?? null,
      },
    });

    // Update the skill's publish status accordingly
    await prisma.skill.update({
      where: { id: existing.skillId },
      data: {
        status: action === "approve" ? "PUBLISHED" : "DRAFT",
        isPublished: action === "approve",
      },
    });

    return apiSuccess({ moderation });
  } catch (error) {
    logger.error("[ADMIN-SKILLS-ACTION] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update moderation status");
  }
}
