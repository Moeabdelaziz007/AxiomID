export type ActionTier = 'low' | 'medium' | 'high' | 'critical';

export interface ActionDefinition {
  id: string;
  xp: number;
  weight: number;
  tier: ActionTier;
}

export const ACTIONS: Record<string, ActionDefinition> = {
  CONNECT_WALLET:    { id: 'connect_wallet',     xp: 100, weight: 15, tier: 'medium' },
  COMPLETE_KYC:      { id: 'complete_kyc',       xp: 200, weight: 30, tier: 'critical' },
  PI_PAYMENT:        { id: 'pi_payment',         xp: 0,   weight: 20, tier: 'high' },
  SECURITY_CIRCLE:   { id: 'security_circle',    xp: 150, weight: 10, tier: 'medium' },
  LOCKUP_COMMITMENT: { id: 'lockup_commitment',  xp: 250, weight: 20, tier: 'high' },
  NODE_OPERATION:    { id: 'node_operation',     xp: 300, weight: 15, tier: 'high' },
  MAINNET_MIGRATION: { id: 'mainnet_migration',  xp: 150, weight: 15, tier: 'medium' },
  WALLET_AGE:        { id: 'wallet_age',         xp: 300, weight: 10, tier: 'medium' },
  MINING_STREAK:     { id: 'mining_streak',      xp: 50,  weight: 5,  tier: 'low' },
  VALIDATOR_SERVICE: { id: 'validator_service',  xp: 200, weight: 25, tier: 'critical' },
};

/** Maximum possible raw trust score (sum of all weights, including up to 5 mining streaks) */
export const MAX_TRUST_SCORE = Object.values(ACTIONS).reduce((sum, a) => sum + a.weight, 0) + 4 * ACTIONS.MINING_STREAK.weight;
