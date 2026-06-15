/**
 * rate-limiter.test.ts — Tests for the in-memory sliding-window rate limiter.
 *
 * Strategy:
 *  - Test the public contract (allowed / remaining / resetAt).
 *  - Verify that the window resets after timeout.
 *  - Confirm constants are correct.
 */

import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';

const SECOND = 1000;

describe('checkRateLimit (in-memory)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows first request (count = 1, maxRequests = 5)', async () => {
    const result = await checkRateLimit('test-a1', { windowMs: 60_000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks remaining correctly (count = 2, maxRequests = 3)', async () => {
    const key = 'test-b1';
    await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    const result = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('allows last allowed request (count = maxRequests)', async () => {
    const key = 'test-b2';
    await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    const result = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks when count exceeds maxRequests', async () => {
    const key = 'test-c1';
    await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    const result = await checkRateLimit(key, { windowMs: 60_000, maxRequests: 2 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns correct resetAt (approximately now + windowMs)', async () => {
    const before = Date.now();
    const result = await checkRateLimit('test-d1', { windowMs: 30_000, maxRequests: 5 });
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 30_000 - 5);
    expect(result.resetAt).toBeLessThanOrEqual(before + 30_000 + 5);
  });

  it('resets after window expires', async () => {
    jest.useFakeTimers();

    const key = 'test-e1';
    await checkRateLimit(key, { windowMs: 10 * SECOND, maxRequests: 1 });
    let result = await checkRateLimit(key, { windowMs: 10 * SECOND, maxRequests: 1 });
    expect(result.allowed).toBe(false);

    // Advance past the window
    jest.advanceTimersByTime(10 * SECOND + 1);

    // Should reset
    result = await checkRateLimit(key, { windowMs: 10 * SECOND, maxRequests: 1 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('handles multiple keys independently', async () => {
    const r1 = await checkRateLimit('key-a', { windowMs: 60_000, maxRequests: 2 });
    const r2 = await checkRateLimit('key-b', { windowMs: 60_000, maxRequests: 2 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);

    // key-a hits limit
    await checkRateLimit('key-a', { windowMs: 60_000, maxRequests: 2 });
    const r3 = await checkRateLimit('key-a', { windowMs: 60_000, maxRequests: 2 });
    expect(r3.allowed).toBe(false);

    // key-b still has one remaining
    const r4 = await checkRateLimit('key-b', { windowMs: 60_000, maxRequests: 2 });
    expect(r4.allowed).toBe(true);
    expect(r4.remaining).toBe(0);
  });

  it('RATE_LIMITS constants are correct', () => {
    expect(RATE_LIMITS.anonymous.maxRequests).toBe(30);
    expect(RATE_LIMITS.authenticated.maxRequests).toBe(100);
    expect(RATE_LIMITS.piAuth.maxRequests).toBe(5);
    expect(RATE_LIMITS.payment.maxRequests).toBe(10);
  });

  it('RATE_LIMITS.public has correct maxRequests (PR addition)', () => {
    expect(RATE_LIMITS.public.maxRequests).toBe(60);
  });

  it('RATE_LIMITS.public has 60-second window', () => {
    expect(RATE_LIMITS.public.windowMs).toBe(60_000);
  });

  it('RATE_LIMITS.public sits between anonymous (30) and authenticated (100) limits', () => {
    expect(RATE_LIMITS.public.maxRequests).toBeGreaterThan(RATE_LIMITS.anonymous.maxRequests);
    expect(RATE_LIMITS.public.maxRequests).toBeLessThan(RATE_LIMITS.authenticated.maxRequests);
  });

  it('allows exactly 60 requests under RATE_LIMITS.public before blocking', async () => {
    const key = 'public-limit-boundary-test';
    const config = RATE_LIMITS.public;

    // Make 60 requests — all should be allowed
    for (let i = 0; i < config.maxRequests; i++) {
      const result = await checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    }

    // 61st request should be blocked
    const blocked = await checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});
