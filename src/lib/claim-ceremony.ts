import crypto from "crypto";
import { logger } from "./logger";

// In-memory store for pending claims. In production, use a database or cache.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const claimStore = new Map<string, any>();

// TTL-based cleanup: evict expired claims every 60 seconds
const CLEANUP_INTERVAL_MS = 60 * 1000;

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    let evicted = 0;
    for (const [key, record] of claimStore) {
      if (record.expiresAt < now) {
        claimStore.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      logger.info(`[CLAIM-CEREMONY] Evicted ${evicted} expired claims (store size: ${claimStore.size})`);
    }
  }, CLEANUP_INTERVAL_MS);
}

export interface ClaimRecord {
  id: string;
  userId: string;
  stellarAddress: string;
  agentId: string;
  userCode: string;
  verificationUri: string;
  status: "pending" | "confirmed" | "approved" | "denied";
  expiresAt: number;
  token: string;
}

const CLAIM_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Generates a cryptographically secure user code.
 */
export function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

/**
 * Creates a new claim token record for the verification ceremony.
 */
export function createClaimToken(expiresInMs: number = CLAIM_TOKEN_EXPIRY_MS): ClaimRecord {
  const token = crypto.randomBytes(32).toString("hex");
  const userCode = generateUserCode();

  const record: ClaimRecord = {
    id: crypto.randomUUID(),
    token,
    userCode,
    verificationUri: "https://axiomid.app/claim",
    expiresAt: Date.now() + expiresInMs,
    userId: "",
    stellarAddress: "",
    agentId: "",
    status: "pending",
  };

  claimStore.set(token, record);
  return record;
}

/**
 * Retrieves a claim record if the token is valid.
 */
export function verifyClaimToken(token: string): ClaimRecord | null {
  const record = claimStore.get(token);
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record;
}

/**
 * Marks a claim token as confirmed and associates it with a user ID.
 * @throws Error if the token does not exist or has expired.
 */
export function confirmClaimToken(token: string, userId: string): void {
  const record = verifyClaimToken(token);
  if (!record) throw new Error("Claim token not found or expired");

  record.status = "confirmed";
  record.userId = userId;
}

/**
 * Retrieves a pending claim record matching the given user code.
 */
export function findClaimByUserCode(userCode: string): ClaimRecord | null {
  for (const record of claimStore.values()) {
    if (record.userCode === userCode && record.status === "pending") {
      return record;
    }
  }
  return null;
}
