import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { TokenExchangeSchema } from "@/lib/validators";
import { verifyIdentityAssertion, createAccessToken } from "@/lib/auth-tokens";
import { verifyClaimToken } from "@/lib/claim-ceremony";
import { logger } from "@/lib/logger";

/**
 * Exchanges authentication credentials for an access token via OAuth2 token exchange.
 *
 * Supports JWT-bearer assertion and claim token exchange flows.
 *
 * @returns An API response containing the access token, pending status, or error information
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-token:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = TokenExchangeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    if (parsed.data.grant_type === "jwt-bearer") {
      const payload = await verifyIdentityAssertion(parsed.data.assertion);
      const accessToken = await createAccessToken(payload.sub, payload.scopes);

      return apiSuccess({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    const claim = verifyClaimToken(parsed.data.claim_token);

    if (!claim) {
      return apiError("CLAIM_EXPIRED", "Claim token expired or invalid");
    }

    if (claim.status === "pending") {
      return apiSuccess({ status: "pending" });
    }

    if (claim.status === "confirmed" && claim.userId) {
      const accessToken = await createAccessToken(`did:axiom:axiomid.app:pi:${claim.userId}`, ["api.read", "api.write"]);
      return apiSuccess({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        identity_assertion: accessToken,
        scopes: ["api.read", "api.write"],
      });
    }

    return apiError("CLAIM_EXPIRED", "Claim in invalid state");
  } catch (error) {
    logger.error("[AGENT-TOKEN] Error:", error);
    return apiError("INVALID_GRANT", "Token exchange failed");
  }
}
