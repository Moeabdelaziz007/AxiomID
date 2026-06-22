/**
 * @jest-environment node
 *
 * Tests for src/lib/revocation-store.ts
 */

const store = new Map<string, { value: string; expiresAt: number }>();

jest.mock("@upstash/redis", () => {
  return {
    Redis: {
      fromEnv: jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation((key: string, value: string, options?: { ex?: number }) => {
          const ttl = options?.ex ?? 0;
          store.set(key, {
            value,
            expiresAt: Date.now() + ttl * 1000,
          });
          return "OK";
        }),
        get: jest.fn().mockImplementation((key: string) => {
          const entry = store.get(key);
          if (!entry) return null;
          if (Date.now() > entry.expiresAt) {
            store.delete(key);
            return null;
          }
          return entry.value;
        }),
      }),
    },
  };
});

import { Redis } from "@upstash/redis";
import { revokeToken, isTokenRevoked } from "@/lib/revocation-store";

describe("isTokenRevoked — basic behaviour", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns false for a token that has never been revoked", async () => {
    expect(await isTokenRevoked("never-revoked-token")).toBe(false);
  });

  it("returns true immediately after revoking a token", async () => {
    await revokeToken("my-revoked-token");
    expect(await isTokenRevoked("my-revoked-token")).toBe(true);
  });

  it("returns false for a different token when only one was revoked", async () => {
    await revokeToken("token-alpha");
    expect(await isTokenRevoked("token-beta")).toBe(false);
  });

  it("returns true for each token when multiple tokens are revoked", async () => {
    await revokeToken("token-x");
    await revokeToken("token-y");
    await revokeToken("token-z");

    expect(await isTokenRevoked("token-x")).toBe(true);
    expect(await isTokenRevoked("token-y")).toBe(true);
    expect(await isTokenRevoked("token-z")).toBe(true);
  });

  it("calling revokeToken a second time on the same token does not throw", async () => {
    await revokeToken("double-revoke");
    await expect(revokeToken("double-revoke")).resolves.not.toThrow();
    expect(await isTokenRevoked("double-revoke")).toBe(true);
  });

  it("handles an empty-string token", async () => {
    await revokeToken("");
    expect(await isTokenRevoked("")).toBe(true);
  });

  it("handles tokens with unicode characters", async () => {
    const unicodeToken = "token-\u{1F512}-\u00e9";
    await revokeToken(unicodeToken);
    expect(await isTokenRevoked(unicodeToken)).toBe(true);
  });

  it("handles a very long token string", async () => {
    const longToken = "a".repeat(4096);
    await revokeToken(longToken);
    expect(await isTokenRevoked(longToken)).toBe(true);
  });
});

describe("isTokenRevoked — TTL / expiry behaviour", () => {
  beforeEach(() => {
    store.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true for a freshly revoked token before TTL expires", async () => {
    const token = "ttl-fresh-token";
    await revokeToken(token);

    // Advance 23 hours — still within 24-hour TTL
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);

    expect(await isTokenRevoked(token)).toBe(true);
  });

  it("returns false and removes the entry once TTL has elapsed", async () => {
    const token = "ttl-expired-token";
    await revokeToken(token);

    // Advance just past 24-hour TTL
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    // First check triggers lazy deletion of the expired entry
    expect(await isTokenRevoked(token)).toBe(false);

    // Second check confirms the entry was removed (not re-added)
    expect(await isTokenRevoked(token)).toBe(false);
  });

  it("does not expire a token at exactly TTL boundary (not yet past)", async () => {
    const token = "ttl-boundary-token";
    await revokeToken(token);

    // Advance to 1ms before the 24-hour TTL boundary
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 - 1);

    expect(await isTokenRevoked(token)).toBe(true);
  });

  it("each revokeToken call resets the TTL for an already-revoked token", async () => {
    const token = "ttl-reset-token";
    await revokeToken(token);

    // Advance 23 hours — still valid
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(await isTokenRevoked(token)).toBe(true);

    // Re-revoke — TTL resets to another 24 hours from now
    await revokeToken(token);

    // Advance another 23 hours (total: 46 hours since first revocation,
    // but only 23 since second — still within new TTL)
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(await isTokenRevoked(token)).toBe(true);
  });

  it("expired tokens are treated as non-revoked (lazy eviction)", async () => {
    const tokenA = "lazy-evict-a";
    const tokenB = "lazy-evict-b";

    await revokeToken(tokenA);
    await revokeToken(tokenB);

    // Both valid before TTL
    expect(await isTokenRevoked(tokenA)).toBe(true);
    expect(await isTokenRevoked(tokenB)).toBe(true);

    // Expire both
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    expect(await isTokenRevoked(tokenA)).toBe(false);
    expect(await isTokenRevoked(tokenB)).toBe(false);
  });
});

describe("revokeToken — return value", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns undefined (void function)", async () => {
    const result = await revokeToken("void-check-token");
    expect(result).toBeUndefined();
  });
});
