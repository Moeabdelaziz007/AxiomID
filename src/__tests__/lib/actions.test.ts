/**
 * @jest-environment node
 */

import { ACTIONS } from '@/lib/actions';

describe('Pi-Native ACTIONS', () => {
  it('has 10 actions defined', () => {
    expect(Object.keys(ACTIONS)).toHaveLength(10);
  });

  it('each action has id, xp, weight, and tier', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('xp');
      expect(action).toHaveProperty('weight');
      expect(action).toHaveProperty('tier');
      expect(typeof action.id).toBe('string');
      expect(typeof action.xp).toBe('number');
      expect(typeof action.weight).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(action.tier);
    }
  });

  it('connect_wallet has id connect_wallet and xp 100', () => {
    expect(ACTIONS.CONNECT_WALLET.id).toBe('connect_wallet');
    expect(ACTIONS.CONNECT_WALLET.xp).toBe(100);
  });

  it('complete_kyc has weight 30 (highest)', () => {
    expect(ACTIONS.COMPLETE_KYC.weight).toBe(30);
  });

  it('pi_payment has xp 0 (dynamic)', () => {
    expect(ACTIONS.PI_PAYMENT.xp).toBe(0);
  });

  it('mining_streak has xp 50', () => {
    expect(ACTIONS.MINING_STREAK.xp).toBe(50);
  });
});
