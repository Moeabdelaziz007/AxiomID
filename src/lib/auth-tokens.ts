import { SignJWT, jwtVerify, errors } from "jose";

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
 *
 * Reads from the `AUTH_TOKEN_SECRET` environment variable, falling back to a development key if unset.
 *
 * @returns The signing key as a `Uint8Array`
 */
function getSigningKey(): Uint8Array {
  const key = process.env.AUTH_TOKEN_SECRET || "dev-auth-token-secret-change-in-production";
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
