import { NextRequest } from "next/server";
import crypto from "crypto";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";
import { AgentIdentitySchema } from "@/lib/validators";
import { createIdentityAssertion, verifyPiTokenWithJwks } from "@/lib/auth-tokens";
import { createClaimToken } from "@/lib/claim-ceremony";

/**
 * Derives a deterministic DID from an assertion string.
 *
 * @returns A DID string with the format `did:axiom:user:` followed by the first 16 hex characters of the UTF-8-encoded assertion.
 */
function deriveDid(assertion: string): string {
  const hash = crypto.createHash("sha256").update(assertion).digest("hex").slice(0, 16);
  return `did:axiom:user:${hash}`;
}

/**
 * Processes an agent identity request and returns either a scoped identity assertion or a claim token.
 *
 * This endpoint intentionally does NOT use the requireAuth middleware because it must
 * handle both authenticated (identity_assertion) and unauthenticated (anonymous) flows
 * in a single route. The identity_assertion path performs its own Pi token verification,
 * while the anonymous path is for pre-registration users.
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
      let did: string;
      try {
        const payload = await verifyPiTokenWithJwks(parsed.data.assertion);
        did = "did:axiom:axiomid.app:pi:" + payload.sub;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("[AGENT-IDENTITY] Pi JWKS verification failed, falling back to deterministic DID for dev");
          did = deriveDid(parsed.data.assertion);
        } else {
          logger.error("[AGENT-IDENTITY] Pi JWKS verification failed:", err);
          return apiError("UNAUTHORIZED", "Invalid identity assertion");
        }
      }

      const scopes = ["api.read", "api.write"];
      const identityAssertion = await createIdentityAssertion(did, scopes);
      return apiSuccess({ identity_assertion: identityAssertion, did, scopes });
    }

    const claim = createClaimToken();
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
