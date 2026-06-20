import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { AgentSignSchema } from "@/lib/validators";
import { signPayloadWithAgentKey, deriveSovereignAgentKeypair } from "@/lib/sovereign-keys";
import { logger } from "@/lib/logger";

/**
 * Handles authenticated agent payload signing requests.
 *
 * Enforces rate limiting and input validation, derives a keypair from the provided DID, and signs the payload.
 *
 * @param request - The incoming HTTP request
 * @returns A JSON response containing the signature and metadata on success, or an error response
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`agent-sign:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = AgentSignSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  try {
    const didParts = parsed.data.did.split(":");
    const uid = didParts[didParts.length - 1];

    const keys = deriveSovereignAgentKeypair(uid, "axiom-root");
    const signature = signPayloadWithAgentKey(parsed.data.payload, keys.privateKey);

    return apiSuccess({
      signature,
      did: parsed.data.did,
      keyVersion: 1,
    });
  } catch (error) {
    logger.error("[AGENT-SIGN] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to sign payload");
  }
}
