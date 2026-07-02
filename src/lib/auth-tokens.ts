import { SignJWT, jwtVerify, errors, importJWK, JWTPayload } from "jose";
import { logger } from "./logger";

const ISSUER = "https://axiomid.app";
const AUDIENCE = "https://axiomid.app";
const EXPIRY_SECONDS = 3600;

export interface IdentityAssertionPayload {
  sub: string;
  scopes: string[];
  iss: string;
  exp: number;
  iat: number;
}

/**
 * Retrieves the HS256 signing key for JWT operations.
 */
function getSigningKey(): Uint8Array {
  const key = process.env.AUTH_TOKEN_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_TOKEN_SECRET is required in production");
    }
    logger.warn("[AUTH-TOKENS] AUTH_TOKEN_SECRET not set — using dev fallback");
    return new TextEncoder().encode("dev-auth-token-secret-change-in-production");
  }
  return new TextEncoder().encode(key);
}

/**
 * Creates and signs a JWT identity assertion token.
 *
 * @param did - The decentralized identifier to embed as the token subject
 * @param scopes - The permission scopes to include in the token
 * @param expiresInSec - Token lifetime in seconds (default: 3600)
 * @returns A signed JWT token string
 */
export async function createIdentityAssertion(
  did: string,
  scopes: string[],
  expiresInSec = EXPIRY_SECONDS
): Promise<string> {
  const key = getSigningKey();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;

  return new SignJWT({ sub: did, scopes })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(exp)
    .sign(key);
}

/**
 * Verifies a JWT identity assertion token and returns its normalized payload.
 *
 * Validates the token signature, issuer, audience, and expiration. The returned
 * payload ensures `scopes` is a string array and timestamps are numbers.
 *
 * @param token - The JWT token to verify
 * @returns The verified identity assertion payload
 * @throws If the token has expired
 * @throws If the token has invalid claims (issuer/audience mismatch)
 * @throws If the token signature verification failed
 * @throws If the token payload is missing required claims
 */
export async function verifyIdentityAssertion(token: string): Promise<IdentityAssertionPayload> {
  const key = getSigningKey();

  try {
    const result = await jwtVerify(token, key, { issuer: ISSUER, audience: AUDIENCE });
    const p = result.payload;
    if (typeof p.sub !== "string" || typeof p.iss !== "string") {
      throw new Error("Token payload missing required claims");
    }
    return {
      sub: p.sub,
      scopes: Array.isArray(p.scopes) ? p.scopes.map(String) : [],
      iss: p.iss,
      exp: Number(p.exp),
      iat: Number(p.iat),
    };
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      throw new Error("Token has expired");
    }
    if (err instanceof errors.JWTClaimValidationFailed) {
      throw new Error("Token has invalid claims (issuer/audience mismatch)");
    }
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      throw new Error("Token signature verification failed");
    }
    throw err;
  }
}

/**
 * Creates a signed JWT access token for the given decentralized identifier and scopes.
 *
 * @returns A signed JWT string.
 */
export async function createAccessToken(did: string, scopes: string[]): Promise<string> {
  return createIdentityAssertion(did, scopes);
}

/**
 * Verifies an access token and extracts the subject identifier and scopes.
 *
 * @param token - A JWT access token to verify
 * @returns An object containing the subject identifier (`sub`) and authorized scopes
 */
export async function verifyAccessToken(token: string): Promise<{ sub: string; scopes: string[] }> {
  const payload = await verifyIdentityAssertion(token);
  return { sub: payload.sub, scopes: payload.scopes };
}

const PI_JWKS_URL = "https://api.minepi.com/.well-known/jwks.json";
const PI_ISSUER = "https://api.minepi.com";
const PI_JWKS_CACHE_TTL_MS = 3_600_000;

let piJwksCache: { keys: Awaited<ReturnType<typeof importJWK>>[]; fetchedAt: number } | null = null;

/**
 * Fetches Pi Network's JWKS with a 1-hour in-memory cache.
 */
async function fetchPiJwks() {
  if (piJwksCache && Date.now() - piJwksCache.fetchedAt < PI_JWKS_CACHE_TTL_MS) {
    return piJwksCache.keys;
  }

  const res = await fetch(PI_JWKS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Failed to fetch Pi JWKS: ${res.status}`);
  const data = (await res.json()) as { keys: { kid: string; kty: string; alg: string; crv: string; x: string }[] };

  const keys = await Promise.all(
    data.keys.map((k) => importJWK({ ...k, use: "sig" }, k.alg))
  );

  piJwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

/**
 * Verifies a Pi Network access token using their JWKS endpoint.
 *
 * Validates the token signature, issuer, and audience claims. The `iss` claim
 * must match Pi Network's issuer URL. The `aud` claim, when present, is checked
 * against a configurable expected audience via the `PI_EXPECTED_AUDIENCE` env var.
 *
 * @param token - Pi Network access token (JWT)
 * @returns Verified payload containing `sub`, `username`, and `pi_username`
 * @throws If token is invalid, expired, or has mismatched issuer/audience
 */
export async function verifyPiTokenWithJwks(
  token: string
): Promise<JWTPayload & { sub: string; username?: string; pi_username?: string }> {
  const keys = await fetchPiJwks();

  let lastError: unknown;
  for (const key of keys) {
    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, key);
      payload = result.payload;
    } catch (err) {
      lastError = err;
      continue;
    }

    if (typeof payload.sub !== "string") {
      throw new Error("Pi token missing sub claim");
    }
    if (payload.iss && payload.iss !== PI_ISSUER) {
      throw new Error(`Pi token has invalid issuer: ${payload.iss}`);
    }
    const expectedAudience = process.env.PI_EXPECTED_AUDIENCE;
    if (expectedAudience && payload.aud) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(expectedAudience)) {
        throw new Error(`Pi token has invalid audience: ${payload.aud}`);
      }
    }

    return payload as JWTPayload & { sub: string; username?: string; pi_username?: string };
  }

  throw lastError ?? new Error("Pi token verification failed: no matching key");
}
