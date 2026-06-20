import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { findClaimByUserCode } from "@/lib/claim-ceremony";
import { z } from "zod";

const ClaimCheckSchema = z.object({
  user_code: z.string().min(1, "user_code is required"),
});

/**
 * Retrieves an identity claim by user code.
 *
 * @returns An API response containing the claim details (status, verification URI, and expiration time) if found, or an error response if validation fails or the claim is not found.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-claim:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = ClaimCheckSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const claim = await findClaimByUserCode(parsed.data.user_code);
    if (!claim) {
      return apiError("NOT_FOUND", "Claim not found for the given user_code");
    }

    return apiSuccess({
      status: claim.status,
      user_code: claim.userCode,
      verification_uri: claim.verificationUri,
      expires_at: claim.expiresAt,
    });
  } catch (error) {
    logger.error("[AGENT-IDENTITY-CLAIM] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to check claim status");
  }
}
