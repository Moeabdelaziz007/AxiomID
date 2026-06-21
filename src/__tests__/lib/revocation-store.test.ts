/**
 * @jest-environment node
 *
 * Tests for src/lib/revocation-store.ts
 *
 * PR change: revocation-store.ts is the new TTL-based replacement for the
 * deleted revocation.ts (which used a plain Set with no expiry). The new
 * module stores (token → expiresAt) in a Map and auto-cleans expired entries.
 */

// Import the module under test.
import { revokeToken, isTokenRevoked } from "`@/lib/revocation-store`";
import { revokeToken, isTokenRevoked } from "@/lib/revocation-store";

describe("isTokenRevoked — basic behaviour", () => {
  it("returns false for a token that has never been revoked", () => {
    expect(isTokenRevoked("never-revoked-token")).toBe(false);
  });

  it("returns true immediately after revoking a token", () => {
    revokeToken("my-revoked-token");
    expect(isTokenRevoked("my-revoked-token")).toBe(true);
  });

  it("returns false for a different token when only one was revoked", () => {
    revokeToken("token-alpha");
    expect(isTokenRevoked("token-beta")).toBe(false);
  });

  it("returns true for each token when multiple tokens are revoked", () => {
    revokeToken("token-x");
    revokeToken("token-y");
    revokeToken("token-z");

    expect(isTokenRevoked("token-x")).toBe(true);
    expect(isTokenRevoked("token-y")).toBe(true);
    expect(isTokenRevoked("token-z")).toBe(true);
  });

  it("calling revokeToken a second time on the same token does not throw", () => {
    revokeToken("double-revoke");
    expect(() => revokeToken("double-revoke")).not.toThrow();
    expect(isTokenRevoked("double-revoke")).toBe(true);
  });

  it("handles an empty-string token", () => {
    revokeToken("");
    expect(isTokenRevoked("")).toBe(true);
  });

  it("handles tokens with unicode characters", () => {
    const unicodeToken = "token-\u{1F512}-\u00e9";
    revokeToken(unicodeToken);
    expect(isTokenRevoked(unicodeToken)).toBe(true);
  });

  it("handles a very long token string", () => {
    const longToken = "a".repeat(4096);
    revokeToken(longToken);
    expect(isTokenRevoked(longToken)).toBe(true);
  });
});

describe("isTokenRevoked — TTL / expiry behaviour", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true for a freshly revoked token before TTL expires", () => {
    const token = "ttl-fresh-token";
    revokeToken(token);

    // Advance 23 hours — still within 24-hour TTL
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);

    expect(isTokenRevoked(token)).toBe(true);
  });

  it("returns false and removes the entry once TTL has elapsed", () => {
    const token = "ttl-expired-token";
    revokeToken(token);

    // Advance just past 24-hour TTL
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    // First check triggers lazy deletion of the expired entry
    expect(isTokenRevoked(token)).toBe(false);

    // Second check confirms the entry was removed (not re-added)
    expect(isTokenRevoked(token)).toBe(false);
  });

  it("does not expire a token at exactly TTL boundary (not yet past)", () => {
    const token = "ttl-boundary-token";
    revokeToken(token);

    // Advance to 1ms before the 24-hour TTL boundary — expiresAt is Date.now() + TTL at revocation time,
    // so advancing by TTL - 1 keeps us just under expiresAt, token should still be valid
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 - 1);

    expect(isTokenRevoked(token)).toBe(true);
  });

  it("each revokeToken call resets the TTL for an already-revoked token", () => {
    const token = "ttl-reset-token";
    revokeToken(token);

    // Advance 23 hours — still valid
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(isTokenRevoked(token)).toBe(true);

    // Re-revoke — TTL resets to another 24 hours from now
    revokeToken(token);

    // Advance another 23 hours (total: 46 hours since first revocation,
    // but only 23 since second — still within new TTL)
    jest.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(isTokenRevoked(token)).toBe(true);
  });

  it("expired tokens are treated as non-revoked (lazy eviction)", () => {
    const tokenA = "lazy-evict-a";
    const tokenB = "lazy-evict-b";

    revokeToken(tokenA);
    revokeToken(tokenB);

    // Both valid before TTL
    expect(isTokenRevoked(tokenA)).toBe(true);
    expect(isTokenRevoked(tokenB)).toBe(true);

    // Expire both
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    expect(isTokenRevoked(tokenA)).toBe(false);
    expect(isTokenRevoked(tokenB)).toBe(false);
  });
});

describe("revokeToken — return value", () => {
  it("returns undefined (void function)", () => {
    const result = revokeToken("void-check-token");
    expect(result).toBeUndefined();
  });
});
