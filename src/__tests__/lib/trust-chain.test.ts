import { calculateActionHash, GENESIS_HASH } from '../../lib/trust-chain';
import { ZodError } from 'zod';

describe('TrustChain Hashing Utility', () => {
  it('should define a valid 64-character GENESIS_HASH', () => {
    expect(GENESIS_HASH).toHaveLength(64);
    expect(GENESIS_HASH).toBe('0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('should deterministically compute identical hashes for identical inputs', () => {
    const parentHash = GENESIS_HASH;
    const actionData = {
      type: 'mining_streak',
      xp: 10,
      metadata: JSON.stringify({ device: 'pi-browser' }),
      userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      timestamp: new Date('2026-06-14T12:00:00.000Z'),
    };

    const hash1 = calculateActionHash(parentHash, actionData);
    const hash2 = calculateActionHash(parentHash, { ...actionData });

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });

  it('should compute different hashes when any action attribute changes', () => {
    const parentHash = GENESIS_HASH;
    const actionData1 = {
      type: 'mining_streak',
      xp: 10,
      metadata: 'null',
      userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      timestamp: new Date('2026-06-14T12:00:00.000Z'),
    };

    const actionData2 = {
      ...actionData1,
      xp: 20, // different XP
    };

    const hash1 = calculateActionHash(parentHash, actionData1);
    const hash2 = calculateActionHash(parentHash, actionData2);

    expect(hash1).not.toBe(hash2);
  });

  it('should throw ZodError if parentHash is invalid (not 64 characters)', () => {
    const actionData = {
      type: 'mining_streak',
      xp: 10,
      metadata: null,
      userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      timestamp: new Date(),
    };

    expect(() => calculateActionHash('short-hash', actionData)).toThrow(ZodError);
  });

  it('should throw ZodError if userId is not a valid UUID', () => {
    const actionData = {
      type: 'mining_streak',
      xp: 10,
      metadata: null,
      userId: 'invalid-uuid',
      timestamp: new Date(),
    };

    expect(() => calculateActionHash(GENESIS_HASH, actionData)).toThrow(ZodError);
  });
});
