/**
 * Shared helpers for passport API route handlers.
 * Used by both GET /api/passport/[slug] and POST /api/passport/[slug]/publish.
 */

export type VerificationStatus = "verified" | "pending" | "denied";

/**
 * Determines the Know Your Agent (KYA) status from the user's KYC status and
 * available verification stamps. KYA requires the user to have completed KYC
 * (proving they are a verified human). Additionally, at least one identity
 * verification stamp or a Pi provider stamp must be present.
 */
export function getKyaStatus(
  stamps: { type: string; provider: string }[] | undefined,
  kycStatus: string | null | undefined
): VerificationStatus {
  if (kycStatus !== "VERIFIED") return "pending";
  if (!stamps || stamps.length === 0) return "pending";
  const hasIdentityStamp = stamps.some(
    (s) => s.type === "complete_kyc" || s.provider === "pi"
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