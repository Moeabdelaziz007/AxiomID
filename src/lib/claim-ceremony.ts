import crypto from "crypto";

const CLAIM_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

interface ClaimRecord {
  token: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  userId: string | null;
  status: "pending" | "confirmed" | "expired";
}

const claimStore = new Map<string, ClaimRecord>();

/**
 * Generates a random user code.
 *
 * @returns A string in the format `AXIO-` followed by four random uppercase letters or digits.
 */
function generateUserCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AXIO-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generates a new claim token record for the verification ceremony.
 *
 * @param expiresInMs - Milliseconds from now until the token expires. Defaults to 10 minutes. Pass a negative value to create an already-expired token for testing.
 * @returns A new claim record containing the token, user code, verification URI, and expiration timestamp.
 */
export function createClaimToken(expiresInMs: number = CLAIM_TOKEN_EXPIRY_MS): ClaimRecord {
  const token = crypto.randomBytes(32).toString("hex");
  const userCode = generateUserCode();

  const record: ClaimRecord = {
    token,
    userCode,
    verificationUri: "https://axiomid.app/claim",
    expiresAt: Date.now() + expiresInMs,
    userId: null,
    status: "pending",
  };

  claimStore.set(token, record);
  return record;
}

/**
 * Retrieves a claim record if the token is valid.
 *
 * @param token - The claim token to verify
 * @returns The claim record if the token exists and has not expired, `null` otherwise
 */
export function verifyClaimToken(token: string): ClaimRecord | null {
  const record = claimStore.get(token);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    record.status = "expired";
    return null;
  }

  return record;
}

/**
 * Marks a claim token as confirmed and associates it with a user ID.
 *
 * `@param` token - The claim token to confirm
 * `@param` userId - The user ID to associate with the claim
 * `@throws` Error if the token does not exist.
 * `@throws` Error if the token has expired.
 */
export function confirmClaimToken(token: string, userId: string): void {
  const record = claimStore.get(token);
  if (!record) throw new Error("Claim token not found");

  if (Date.now() > record.expiresAt) {
    record.status = "expired";
    throw new Error("Claim token expired");
  }

  record.status = "confirmed";
  record.userId = userId;
}

/**
 * Retrieves a pending claim record matching the given user code.
 *
 * @param userCode - The user code to search for
 * @returns The matching pending claim record, or `null` if not found.
 */
export function findClaimByUserCode(userCode: string): ClaimRecord | null {
  for (const record of claimStore.values()) {
    if (record.userCode === userCode && record.status === "pending") {
      return record;
    }
  }
  return null;
}
