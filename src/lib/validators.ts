import { z } from 'zod';

export const PiAuthSchema = z.object({
  accessToken: z.string().min(1, 'accessToken is required'),
  uid: z.string().min(1, 'uid is required'),
  username: z.string().min(1, 'username is required'),
  walletAddress: z.string().optional(),
  stellarAddress: z.string().optional(),
});

export const UserStatusSchema = z.object({
  userId: z.string().min(1).optional(),
  walletAddress: z.string().regex(/^(G[A-Z2-7]{54}|0x[a-fA-F0-9]{40}|pi:[a-zA-Z0-9_-]+|demo:[a-zA-Z0-9-]+)$/, 'Invalid wallet address').optional(),
}).refine((data) => data.userId || data.walletAddress, {
  message: 'Either userId or walletAddress is required',
});

export const ActionClaimSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  actionType: z.string().min(1, 'actionType is required').max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const WalletConnectSchema = z.object({
  walletAddress: z.string().regex(/^(G[A-Z2-7]{54}|0x[a-fA-F0-9]{40}|pi:[a-zA-Z0-9_-]+|demo:[a-zA-Z0-9-]+)$/, 'Invalid wallet address'),
  state: z.string().min(1, 'state token is required'),
  signature: z.string().optional(),
});

export const PaymentApproveSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
});

export const PaymentCompleteSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
  txid: z.string().min(1, 'txid is required'),
});

export type PiAuthInput = z.infer<typeof PiAuthSchema>;
export type UserStatusInput = z.infer<typeof UserStatusSchema>;
export type ActionClaimInput = z.infer<typeof ActionClaimSchema>;
export type WalletConnectInput = z.infer<typeof WalletConnectSchema>;
export type PaymentApproveInput = z.infer<typeof PaymentApproveSchema>;
export type PaymentCompleteInput = z.infer<typeof PaymentCompleteSchema>;
