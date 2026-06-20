import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { findClaimByUserCode } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ClaimQuerySchema = z.object({
  user_code: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = ClaimQuerySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const claim = findClaimByUserCode(parsed.data.user_code);

    if (!claim) {
      return apiError("CLAIM_NOT_FOUND", "Invalid or expired user code");
    }

    return apiSuccess({
      status: claim.status,
      verification_uri: claim.verificationUri,
      expires_in: Math.max(0, Math.floor((claim.expiresAt - Date.now()) / 1000)),
    });
  } catch (error) {
    logger.error("[AGENT-CLAIM] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to process claim");
  }
}
