import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { requireAuth } from "@/lib/auth-middleware";
import { verifyAccessToken } from "@/lib/auth-tokens";
import { logger } from "@/lib/logger";
import { revokeToken } from "@/lib/revocation-store";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const { token } = body as { token?: string };
  if (!token || typeof token !== "string") {
    return apiError("VALIDATION_ERROR", "Missing or invalid `token` field");
  }

  try {
    const payload = await verifyAccessToken(token);
    if (payload.sub !== authResult.user.did) {
      return apiError("FORBIDDEN", "Cannot revoke another agent's token");
    }
  } catch {
    return apiError("VALIDATION_ERROR", "Token is invalid or already expired");
  }

  try {
    await revokeToken(token);
  } catch (error) {
    logger.error("[OAUTH2-REVOKE] Failed to revoke token", { did: authResult.user.did, error });
    return apiError("INTERNAL_ERROR", "Failed to revoke token");
  }
  logger.info("[OAUTH2-REVOKE] Token revoked", { did: authResult.user.did });

  return apiSuccess({ revoked: true });
}
