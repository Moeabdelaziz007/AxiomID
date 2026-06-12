import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";

const TOTAL_STAMPS_COUNT = 6;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`stamp-get:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.");
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const stamps = await prisma.stamp.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });

    const trustScore = TOTAL_STAMPS_COUNT > 0 ? Math.round((stamps.length / TOTAL_STAMPS_COUNT) * 100) : 0;

    return apiSuccess({
      stamps,
      trustScore,
      totalStampsCount: TOTAL_STAMPS_COUNT,
      claimedStampsCount: stamps.length,
    });
  } catch (error) {
    console.error("[STAMP-GET] Database error:", error);
    return apiError("INTERNAL_ERROR", "Failed to retrieve stamps");
  }
}
