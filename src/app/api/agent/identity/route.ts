import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { AgentIdentitySchema } from "@/lib/validators";
import { createIdentityAssertion, verifyIdentityAssertion } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";
import { deriveDid } from "@/lib/did";

/**
 * Processes an agent identity request and returns either a scoped identity assertion or a claim token.
 *
 * @returns An API response containing either an identity assertion with its derived DID and scopes, or a claim token with verification details.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-identity:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AgentIdentitySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    if (parsed.data.type === "identity_assertion") {
      // Verify the incoming assertion's signature, issuer, and claims before
      // issuing a new identity token. Reject any unverified/forged assertion.
      let verified;
      try {
        verified = await verifyIdentityAssertion(parsed.data.assertion);
      } catch {
        return apiError("INVALID_ID_JAG", "Invalid or unverifiable identity assertion");
      }

      const did = deriveDid(parsed.data.assertion);
      const scopes = verified.scopes.length > 0 ? verified.scopes : ["api.read", "api.write"];
      const identityAssertion = await createIdentityAssertion(did, scopes);
      return apiSuccess({ identity_assertion: identityAssertion, did, scopes });
    }

    const claim = await createClaimToken();
    const expiresIn = Math.max(0, Math.floor((claim.expiresAt - Date.now()) / 1000));
    return apiSuccess({
      claim_token: claim.token,
      claim: {
        user_code: claim.userCode,
        verification_uri: claim.verificationUri,
        expires_in: expiresIn,
        status: claim.status,
      },
    });
  } catch (error) {

    logger.error("[AGENT-IDENTITY] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to process identity request");
  }
}
