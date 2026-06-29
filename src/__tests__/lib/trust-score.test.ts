/**
 * @jest-environment node
 */

import { computeTrustScore } from '@/lib/trust-score';

describe('computeTrustScore', () => {
  const now = new Date();

  it('returns 0 for empty actions', () => {
    expect(computeTrustScore([], false, null)).toBe(0);
  });

  it('returns 100 for all actions completed', () => {
    const allActions = [
      { type: 'connect_wallet', xp: 100, timestamp: now },
      { type: 'complete_kyc', xp: 200, timestamp: now },
      { type: 'pi_payment', xp: 5, timestamp: now },
      { type: 'security_circle', xp: 150, timestamp: now },
      { type: 'lockup_commitment', xp: 250, timestamp: now },
      { type: 'node_operation', xp: 300, timestamp: now },
      { type: 'mainnet_migration', xp: 150, timestamp: now },
      { type: 'wallet_age', xp: 300, timestamp: now },
      { type: 'mining_streak', xp: 50, timestamp: now },
      { type: 'validator_service', xp: 200, timestamp: now },
    ];
    expect(computeTrustScore(allActions, false, now)).toBe(100);
  });

  it('returns higher score with stellar anchor bonus', () => {
    const actions = [
      { type: 'connect_wallet', xp: 100, timestamp: now },
      { type: 'complete_kyc', xp: 200, timestamp: now },
    ];
    const withoutAnchor = computeTrustScore(actions, false, now);
    const withAnchor = computeTrustScore(actions, true, now);
    expect(withAnchor).toBeGreaterThan(withoutAnchor);
  });

  it('applies inactivity decay', () => {
    const actions = [{ type: 'connect_wallet', xp: 100, timestamp: now }];
    const recent = computeTrustScore(actions, false, now);
    const old = computeTrustScore(actions, false, new Date('2020-01-01'));
    expect(old).toBeLessThanOrEqual(recent);
  });

  it('caps mining_streak weight at 5 months', () => {
    const streaks = Array.from({ length: 10 }, (_, i) => ({
      type: 'mining_streak',
      xp: 50,
      timestamp: new Date(now.getTime() - i * 30 * 86400000),
    }));
    const score = computeTrustScore(streaks, false, now);
    const fiveStreaks = streaks.slice(0, 5);
    const scoreCapped = computeTrustScore(fiveStreaks, false, now);
    expect(score).toBe(scoreCapped);
  });

  it('ignores unknown action types', () => {
    const actions = [
      { type: 'fake_action', xp: 999, timestamp: now },
      { type: 'connect_wallet', xp: 100, timestamp: now },
    ];
    const score = computeTrustScore(actions, false, now);
    const walletOnly = computeTrustScore(
      [{ type: 'connect_wallet', xp: 100, timestamp: now }],
      false, now
    );
    expect(score).toBe(walletOnly);
  });
});
