import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const CLAIM_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

export interface ClaimRecord {
  token: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  userId: string | null;
  status: "pending" | "confirmed" | "expired";
}

/**
 * Generates a random user code.
 *
 * @returns A string in the format `AXIO-` followed by four random uppercase letters or digits.
 */
function generateUserCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AXIO-";
  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

/**
 * Generates a new claim token record for the verification ceremony.
 *
 * @param expiresInMs - Milliseconds from now until the token expires. Defaults to 10 minutes. Pass a negative value to create an already-expired token for testing.
 * @returns A new claim record containing the token, user code, verification URI, and expiration timestamp.
 */
export async function createClaimToken(expiresInMs: number = CLAIM_TOKEN_EXPIRY_MS): Promise<ClaimRecord> {
  const token = crypto.randomBytes(32).toString("hex");
  const userCode = generateUserCode();
  const expiresAt = new Date(Date.now() + expiresInMs);

  const claim = await prisma.claim.create({
    data: {
      token,
      userCode,
      verificationUri: "https://axiomid.app/claim",
      expiresAt,
      userId: null,
      status: "pending",
    },
  });

  return {
    token: claim.token,
    userCode: claim.userCode,
    verificationUri: claim.verificationUri,
    expiresAt: claim.expiresAt.getTime(),
    userId: claim.userId,
    status: claim.status as any,
  };
}

/**
 * Retrieves a claim record if the token is valid.
 *
 * @param token - The claim token to verify
 * @returns The claim record if the token exists and has not expired, `null` otherwise
 */
export async function verifyClaimToken(token: string): Promise<ClaimRecord | null> {
  const claim = await prisma.claim.findUnique({
    where: { token },
  });
  if (!claim) return null;

  if (Date.now() > claim.expiresAt.getTime()) {
    if (claim.status !== "expired") {
      await prisma.claim.update({
        where: { token },
        data: { status: "expired" },
      });
      claim.status = "expired";
    }
    return null;
  }

  return {
    token: claim.token,
    userCode: claim.userCode,
    verificationUri: claim.verificationUri,
    expiresAt: claim.expiresAt.getTime(),
    userId: claim.userId,
    status: claim.status as any,
  };
}

/**
 * Marks a claim token as confirmed and associates it with a user ID.
 *
 * @param token - The claim token to confirm
 * @param userId - The user ID to associate with the claim
 * @throws Error if the token does not exist.
 * @throws Error if the token has expired.
 */
export async function confirmClaimToken(token: string, userId: string): Promise<void> {
  const record = await verifyClaimToken(token);
  if (!record) {
    const exists = await prisma.claim.findUnique({
      where: { token },
    });
    throw new Error(exists ? "Claim token expired" : "Claim token not found");
  }

  await prisma.claim.update({
    where: { token },
    data: {
      status: "confirmed",
      userId,
    },
  });
}

/**
 * Retrieves a pending claim record matching the given user code.
 *
 * @param userCode - The user code to search for
 * @returns The matching pending claim record, or `null` if not found.
 */
export async function findClaimByUserCode(userCode: string): Promise<ClaimRecord | null> {
  const claim = await prisma.claim.findFirst({
    where: {
      userCode,
      status: "pending",
    },
  });

  if (!claim) return null;

  if (Date.now() > claim.expiresAt.getTime()) {
    await prisma.claim.update({
      where: { token: claim.token },
      data: { status: "expired" },
    });
    return null;
  }

  return {
    token: claim.token,
    userCode: claim.userCode,
    verificationUri: claim.verificationUri,
    expiresAt: claim.expiresAt.getTime(),
    userId: claim.userId,
    status: claim.status as any,
  };
}
