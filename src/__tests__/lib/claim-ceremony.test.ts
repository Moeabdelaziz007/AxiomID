/**
 * @jest-environment node
 */

const mockStore = new Map<string, any>();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    claim: {
      create: jest.fn().mockImplementation(({ data }) => {
        const record = {
          ...data,
          id: "mock-id",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockStore.set(data.token, record);
        return Promise.resolve(record);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockStore.get(where.token) || null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        for (const claim of mockStore.values()) {
          if (claim.userCode === where.userCode && (!where.status || claim.status === where.status)) {
            return Promise.resolve(claim);
          }
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const record = mockStore.get(where.token);
        if (record) {
          Object.assign(record, data);
          mockStore.set(where.token, record);
        }
        return Promise.resolve(record);
      }),
    },
  },
}));

import {
  createClaimToken,
  verifyClaimToken,
  confirmClaimToken,
  findClaimByUserCode,
} from "@/lib/claim-ceremony";

describe("Claim Ceremony", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("creates a claim token with user code", async () => {
    const claim = await createClaimToken();

    expect(claim.token).toBeDefined();
    expect(claim.userCode).toMatch(/^AXIO-[A-Z0-9]{4}$/);
    expect(claim.verificationUri).toBe("https://axiomid.app/claim");
    expect(claim.expiresAt).toBeGreaterThan(Date.now());
    expect(claim.status).toBe("pending");
  });

  it("verifies a valid claim token", async () => {
    const claim = await createClaimToken();
    const result = await verifyClaimToken(claim.token);

    expect(result).not.toBeNull();
    expect(result!.status).toBe("pending");
  });

  it("confirms a claim token", async () => {
    const claim = await createClaimToken();
    await confirmClaimToken(claim.token, "user-123");

    const result = await verifyClaimToken(claim.token);
    expect(result!.status).toBe("confirmed");
    expect(result!.userId).toBe("user-123");
  });

  it("rejects expired claim tokens", async () => {
    const claim = await createClaimToken(100);
    // force expiration in mock store
    const record = mockStore.get(claim.token);
    if (record) {
      record.expiresAt = new Date(Date.now() - 1);
      mockStore.set(claim.token, record);
    }

    const result = await verifyClaimToken(claim.token);
    expect(result).toBeNull();

    await expect(confirmClaimToken(claim.token, "user-456")).rejects.toThrow("Claim token expired");
  });

  it("rejects unknown tokens", async () => {
    const result = await verifyClaimToken("nonexistent-token");
    expect(result).toBeNull();

    await expect(confirmClaimToken("nonexistent-token", "user-789")).rejects.toThrow("Claim token not found");
  });

  it("creates unique tokens for each call", async () => {
    const claim1 = await createClaimToken();
    const claim2 = await createClaimToken();

    expect(claim1.token).not.toBe(claim2.token);
  });

  it("sets userId to null on creation", async () => {
    const claim = await createClaimToken();
    expect(claim.userId).toBeNull();
  });

  it("creates token with custom expiry", async () => {
    const before = Date.now();
    const customExpiry = 5000;
    const claim = await createClaimToken(customExpiry);

    expect(claim.expiresAt).toBeGreaterThanOrEqual(before + customExpiry);
    expect(claim.expiresAt).toBeLessThanOrEqual(before + customExpiry + 100);
  });

  it("returns token field as 64-char hex string", async () => {
    const claim = await createClaimToken();
    expect(claim.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyClaimToken returns the same record object", async () => {
    const claim = await createClaimToken();
    const result = await verifyClaimToken(claim.token);

    expect(result!.token).toBe(claim.token);
    expect(result!.userCode).toBe(claim.userCode);
    expect(result!.verificationUri).toBe(claim.verificationUri);
  });
});

describe("findClaimByUserCode", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("finds a pending claim by user code", async () => {
    const claim = await createClaimToken();
    const found = await findClaimByUserCode(claim.userCode);

    expect(found).not.toBeNull();
    expect(found!.token).toBe(claim.token);
    expect(found!.userCode).toBe(claim.userCode);
  });

  it("returns null for non-existent user code", async () => {
    const result = await findClaimByUserCode("AXIO-ZZZZ");
    expect(result).toBeNull();
  });

  it("returns null for confirmed claims (not pending)", async () => {
    const claim = await createClaimToken();
    await confirmClaimToken(claim.token, "user-for-find-test");

    const found = await findClaimByUserCode(claim.userCode);
    expect(found).toBeNull();
  });

  it("returns null for expired claims", async () => {
    const claim = await createClaimToken(-1);
    const record = mockStore.get(claim.token);
    if (record) {
      record.expiresAt = new Date(Date.now() - 1);
      mockStore.set(claim.token, record);
    }
    await verifyClaimToken(claim.token);

    const found = await findClaimByUserCode(claim.userCode);
    expect(found).toBeNull();
  });
});
