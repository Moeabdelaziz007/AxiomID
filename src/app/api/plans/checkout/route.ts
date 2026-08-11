import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { z } from "zod";
import { ghostApiKeyConfigured, provisionGhostDatabase, GHOST_PLANS } from "@/lib/ghost";

const CheckoutQuerySchema = z.object({
  plan: z.enum(["creator", "power"]),
});

export const dynamic = "force-dynamic";

/**
 * Provisions the Ghost database deliverable for a paid Aura OS plan.
 *
 * Billing model: plan pricing (P2 ~$15 / P3 ~$75) is collected on the
 * founder's side (Pi/x402 on the roadmap); Ghost usage billing covers the
 * provisioning cost. This endpoint flags checkout as started and
 * provisions the deliverable asynchronously (wait: false).
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`plans-checkout:${ip}`, RATE_LIMITS.public);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  if (!ghostApiKeyConfigured()) {
    return apiError("INTERNAL_ERROR", "Billing engine not configured. Try again later.");
  }

  let query;
  try {
    query = CheckoutQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  } catch {
    return apiError("VALIDATION_ERROR", "Plan must be one of: creator, power");
  }

  try {
    const db = await provisionGhostDatabase(query.plan);
    logger.info(`[PLANS-CHECKOUT] ${query.plan} provisioned: ${db.id}`);
    return apiSuccess({
      status: "provisioning",
      plan: query.plan,
      database: db,
      message: `${query.plan} storage provisioned — billing reference ${db.id}`,
    }, 202);
  } catch (error) {
    logger.error("[PLANS-CHECKOUT] Provisioning failed:", error);
    return apiError("INTERNAL_ERROR", "Failed to provision your plan. Contact support.");
  }
}