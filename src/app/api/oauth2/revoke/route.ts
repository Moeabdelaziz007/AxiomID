import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import { TokenRevocationSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";

const revokedTokens = new Set<string>();

/**
 * Checks whether a token has been revoked.
 *
 * Exported so that token-validation paths (e.g. access-token verification)
 * can consult revocation state from a single shared source.
 *
 * @param token - The token to check
 * @returns `true` if the token has been revoked, `false` otherwise
 */
export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

/**
 * Processes an OAuth2 token revocation request.
 *
 * Validates the request body and adds the token to the revocation list.
 *
 * @param request - The incoming HTTP request with the token to revoke
 * @returns An API response with a success flag or error details
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = TokenRevocationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    revokedTokens.add(parsed.data.token);
    return apiSuccess({ success: true });
  } catch (error) {
    logger.error("[OAUTH2-REVOKE] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to revoke token");
  }
}
