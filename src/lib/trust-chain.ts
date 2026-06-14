import { createHash } from 'crypto';
import { z } from 'zod';

const ActionHashInputSchema = z.object({
  parentHash: z.string().length(64, 'parentHash must be exactly 64 hex characters'),
  actionData: z.object({
    type: z.string().min(1),
    xp: z.number().int(),
    metadata: z.string().nullable(),
    userId: z.string().uuid(),
    timestamp: z.date(),
  }),
});

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Deterministically computes the SHA-256 state hash for a given Action and its parent hash.
 * 
 * H_n = SHA-256(H_n-1 || Action_n)
 */
export function calculateActionHash(
  parentHash: string,
  actionData: {
    type: string;
    xp: number;
    metadata: string | null;
    userId: string;
    timestamp: Date;
  }
): string {
  // Rule 0 & 1: Strict Zod validation before processing
  ActionHashInputSchema.parse({ parentHash, actionData });

  const serializedAction = JSON.stringify({
    type: actionData.type,
    xp: actionData.xp,
    metadata: actionData.metadata,
    userId: actionData.userId,
    timestamp: actionData.timestamp.toISOString(),
  });

  return createHash('sha256')
    .update(parentHash + serializedAction)
    .digest('hex');
}
