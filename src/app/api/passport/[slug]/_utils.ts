/**
 * Shared helpers for passport API route handlers.
 * Used by both GET /api/passport/[slug] and POST /api/passport/[slug]/publish.
 */

export type VerificationStatus = "verified" | "pending" | "denied";

/**
 * Determines the Know Your Account (KYA) status from available verification stamps.
 * Returns "verified" if an identity verification or Pi stamp is present, "pending" otherwise.
 */
export function getKyaStatus(
  stamps: { type: string; provider: string }[] | undefined
): VerificationStatus {
  if (!stamps || stamps.length === 0) return "pending";
  const hasIdentityStamp = stamps.some(
    (s) => s.type === "verify_identity" || s.provider === "pi"
  );
  return hasIdentityStamp ? "verified" : "pending";
}

/**
 * Normalizes a raw KYC status string to a standard verification state.
 * Returns "verified" for "VERIFIED", "pending" for missing/"PENDING"/"NONE", "denied" otherwise.
 */
export function getKycStatus(kycStatus: string | undefined | null): VerificationStatus {
  if (kycStatus === "VERIFIED") return "verified";
  if (!kycStatus || kycStatus === "PENDING" || kycStatus === "NONE") return "pending";
  return "denied";
}