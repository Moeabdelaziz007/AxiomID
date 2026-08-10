import { NextRequest } from "next/server";
import { apiError, apiSuccess, rateLimitHeaders } from "@/lib/errors";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/ip";
import { logger } from "@/lib/logger";

interface GoogleIdentity {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
}

/**
 * Verifies a Google ID token (from Google Identity Services) server-side and
 * returns the verified profile. Identity is verified via Google's tokeninfo
 * endpoint and the audience must match our configured client ID.
 *
 * NOTE: This CONNECTS a Google identity for the onboarding wizard — it does
 * not create a Pi-centric AxiomID user record. Linking a verified Google
 * identity to a user wallet is a separate (future) step.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`google-auth:${ip}`, RATE_LIMITS.piAuth);
  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many attempts. Try again later.", undefined, rateLimitHeaders(rateLimit));
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const idToken = (body as { idToken?: unknown })?.idToken;
  if (typeof idToken !== "string" || idToken.length === 0 || idToken.length > 8192) {
    return apiError("VALIDATION_ERROR", "Missing or invalid idToken");
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    logger.error("[GOOGLE-AUTH] NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured");
    return apiError("INTERNAL_ERROR", "Google auth is not configured");
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      logger.error(`[GOOGLE-AUTH] tokeninfo returned ${res.status}`);
      return apiError("UNAUTHORIZED", "Google rejected the token");
    }
    const identity = (await res.json()) as GoogleIdentity;

    if (!identity.sub || !identity.email || identity.aud !== clientId) {
      logger.error("[GOOGLE-AUTH] token audience/claims mismatch");
      return apiError("UNAUTHORIZED", "Token audience mismatch");
    }

    return apiSuccess({
      sub: identity.sub,
      email: identity.email,
      emailVerified: identity.email_verified === true,
      name: identity.name || "",
      picture: identity.picture || "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[GOOGLE-AUTH] tokeninfo fetch failed: ${message}`);
    return apiError("UNAUTHORIZED", "Failed to verify Google token");
  }
}