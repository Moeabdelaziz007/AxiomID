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

function getSigningKey(): Uint8Array {
  const key = process.env.AUTH_TOKEN_SECRET || "dev-auth-token-secret-change-in-production";
  return new TextEncoder().encode(key);
}

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

export async function createAccessToken(did: string, scopes: string[]): Promise<string> {
  return createIdentityAssertion(did, scopes);
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; scopes: string[] }> {
  const payload = await verifyIdentityAssertion(token);
  return { sub: payload.sub, scopes: payload.scopes };
}
