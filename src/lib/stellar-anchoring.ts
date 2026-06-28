import { createHash } from "crypto";
import { canonicalize } from "./sanitize";

/**
 * Computes a deterministic SHA-256 hash of a signed Verifiable Credential.
 * The VC is canonicalized (sorted keys) before hashing to ensure determinism.
 */
export function computeVcHash(signedVc: Record<string, unknown>): string {
  const canonical = canonicalize(signedVc);
  const json = JSON.stringify(canonical, null, 0);
  return createHash("sha256").update(json).digest("hex");
}
