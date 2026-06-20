/**
 * @jest-environment node
 */

import {
  createClaimToken,
  verifyClaimToken,
  confirmClaimToken,
  findClaimByUserCode,
} from "@/lib/claim-ceremony";

describe("Claim Ceremony", () => {
  it("creates a claim token with user code", () => {
    const claim = createClaimToken();

    expect(claim.token).toBeDefined();
    expect(claim.userCode).toMatch(/^AXIO-[A-Z0-9]{4}$/);
    expect(claim.verificationUri).toBe("https://axiomid.app/claim");
    expect(claim.expiresAt).toBeGreaterThan(Date.now());
    expect(claim.status).toBe("pending");
  });

  it("verifies a valid claim token", () => {
    const claim = createClaimToken();
    const result = verifyClaimToken(claim.token);

    expect(result).not.toBeNull();
    expect(result!.status).toBe("pending");
  });

  it("confirms a claim token", () => {
    const claim = createClaimToken();
    confirmClaimToken(claim.token, "user-123");

    const result = verifyClaimToken(claim.token);
    expect(result!.status).toBe("confirmed");
    expect(result!.userId).toBe("user-123");
  });

  it("rejects expired claim tokens", () => {
    const claim = createClaimToken(100); // 100ms expiry
    claim.expiresAt = Date.now() - 1; // force expiration

    const result = verifyClaimToken(claim.token);
    expect(result).toBeNull();

    expect(() => confirmClaimToken(claim.token, "user-456")).toThrow("Claim token expired");
  });

  it("rejects unknown tokens", () => {
    const result = verifyClaimToken("nonexistent-token");
    expect(result).toBeNull();

    expect(() => confirmClaimToken("nonexistent-token", "user-789")).toThrow("Claim token not found");
  });

  it("creates unique tokens for each call", () => {
    const claim1 = createClaimToken();
    const claim2 = createClaimToken();

    expect(claim1.token).not.toBe(claim2.token);
  });

  it("sets userId to null on creation", () => {
    const claim = createClaimToken();
    expect(claim.userId).toBeNull();
  });

  it("creates token with custom expiry", () => {
    const before = Date.now();
    const customExpiry = 5000; // 5 seconds
    const claim = createClaimToken(customExpiry);

    expect(claim.expiresAt).toBeGreaterThanOrEqual(before + customExpiry);
    expect(claim.expiresAt).toBeLessThanOrEqual(before + customExpiry + 100);
  });

  it("returns token field as 64-char hex string", () => {
    const claim = createClaimToken();
    expect(claim.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyClaimToken returns the same record object", () => {
    const claim = createClaimToken();
    const result = verifyClaimToken(claim.token);

    expect(result!.token).toBe(claim.token);
    expect(result!.userCode).toBe(claim.userCode);
    expect(result!.verificationUri).toBe(claim.verificationUri);
  });
});

describe("findClaimByUserCode", () => {
  it("finds a pending claim by user code", () => {
    const claim = createClaimToken();
    const found = findClaimByUserCode(claim.userCode);

    expect(found).not.toBeNull();
    expect(found!.token).toBe(claim.token);
    expect(found!.userCode).toBe(claim.userCode);
  });

  it("returns null for non-existent user code", () => {
    const result = findClaimByUserCode("AXIO-ZZZZ");
    expect(result).toBeNull();
  });

  it("returns null for confirmed claims (not pending)", () => {
    const claim = createClaimToken();
    confirmClaimToken(claim.token, "user-for-find-test");

    const found = findClaimByUserCode(claim.userCode);
    expect(found).toBeNull();
  });

  it("returns null for expired claims", () => {
    const claim = createClaimToken(-1);
    // Mark it expired by verifying (which marks status = expired)
    verifyClaimToken(claim.token);

    const found = findClaimByUserCode(claim.userCode);
    expect(found).toBeNull();
  });
});
