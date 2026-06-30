import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { requireAuth } from "@/lib/auth-middleware";
import { calculateTier } from "@/lib/tiers";
import { z } from "zod";

export const maxDuration = 30;

const AdsVerifySchema = z.object({
  adId: z.string().min(1, "adId is required"),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`ads-verify:${ip}`, RATE_LIMITS.payment);
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many verification attempts. Try again later.",
      undefined,
      rateLimitHeaders(rateLimit)
    );
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AdsVerifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { adId } = parsed.data;

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    logger.error("[PI-ADS] PI_API_KEY not configured");
    return apiError("INTERNAL_ERROR", "Ads system not configured");
  }

  try {
    // 1. Check for double claiming
    // 1. Check for double claiming
    const duplicateResult = await prisma.$queryRaw`
      SELECT id FROM "XpLedger"
      WHERE reason = 'watch_ad'
      AND reference::jsonb ->> 'adId' = ${adId}
      LIMIT 1
    `;
    const duplicate = Array.isArray(duplicateResult) && duplicateResult.length > 0;

    if (duplicate) {
      return apiError("CONFLICT", "This ad reward has already been claimed");
    }

    // 2. Fetch ad reward status from Pi Platform API
    const response = await fetch(`https://api.minepi.com/v2/ads_network/status/${adId}`, {
      method: "GET",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.error("[PI-ADS] Pi API ads check failed:", response.status);
      return apiError("PI_PAYMENT_FAILED", `Failed to verify ad reward: ${response.status}`);
    }

    const adData = (await response.json()) as {
      mediator_ack_status: string;
      granted_at?: string;
    };

    // 3. Verify status is "granted"
    if (adData.mediator_ack_status !== "granted") {
      return apiError("FORBIDDEN", "Ad reward has not been granted by the Pi Network");
    }

    const xpReward = 10;

    // 4. Atomically record XP reward in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: auth.user.id } });
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const newBalance = user.xp + xpReward;
      const ledgerEntry = await tx.xpLedger.create({
        data: {
          userId: auth.user.id,
          amount: xpReward,
          reason: "watch_ad",
          reference: JSON.stringify({
            adId,
            grantedAt: adData.granted_at || new Date().toISOString(),
          }),
          balance: newBalance,
        },
      });

      const newTier = calculateTier(newBalance);
      await tx.user.update({
        where: { id: auth.user.id },
        data: {
          xp: newBalance,
          tier: newTier,
          lastActive: new Date(),
        },
      });

      return { newBalance, newTier, ledgerEntry };
    });

    return apiSuccess({
      success: true,
      xpEarned: xpReward,
      newBalance: result.newBalance,
      tier: result.newTier,
      ledgerEntryId: result.ledgerEntry.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return apiError("NOT_FOUND", "User not found");
    }
    logger.error("[PI-ADS] Verification error:", error);
    return apiError("INTERNAL_ERROR", "Failed to verify ad reward");
  }
}
