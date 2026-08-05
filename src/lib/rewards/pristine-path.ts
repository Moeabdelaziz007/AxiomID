import { prisma } from "@/lib/prisma";

export const PRISTINE_MULTIPLIER = 2.0;
export const REPEATED_MULTIPLIER = 0.8;
export const STALE_MULTIPLIER = 0.5;
export const STALE_THRESHOLD = 9;

export interface PristinePathResult {
  is_pristine: boolean;
  multiplier: number;
  action_type: string;
  previous_uses: number;
}

export function computePristineMultiplier(
  previousUses: number,
  actionType: string,
): PristinePathResult {
  let multiplier: number;
  let is_pristine: boolean;

  if (previousUses === 0) {
    multiplier = PRISTINE_MULTIPLIER;
    is_pristine = true;
  } else if (previousUses >= STALE_THRESHOLD) {
    multiplier = STALE_MULTIPLIER;
    is_pristine = false;
  } else {
    multiplier = REPEATED_MULTIPLIER;
    is_pristine = false;
  }

  return {
    is_pristine,
    multiplier,
    action_type: actionType,
    previous_uses: previousUses,
  };
}

export async function getActionUseCount(
  userId: string,
  actionType: string,
): Promise<number> {
  switch (actionType) {
    case "stamp_claim":
      return prisma.xpLedger.count({
        where: { userId, reason: "stamp_claim" },
      });
    case "watch_ad":
      return prisma.xpLedger.count({
        where: { userId, reason: "watch_ad" },
      });
    case "pi_payment": {
      const allActionClaims = await prisma.xpLedger.count({
        where: { userId, reason: "action_claim" },
      });
      const kycClaims = await prisma.xpLedger.count({
        where: {
          userId,
          reason: "action_claim",
          reference: { contains: "complete_kyc" },
        },
      });
      return allActionClaims - kycClaims;
    }
    case "complete_kyc":
      return prisma.xpLedger.count({
        where: {
          userId,
          reason: "action_claim",
          reference: { contains: "complete_kyc" },
        },
      });
    default:
      return prisma.xpLedger.count({
        where: { userId, reason: actionType },
      });
  }
}
