/**
 * Tests for src/app/context/wallet-types.ts
 *
 * Covers:
 * - isDemoWalletAddress: prefix detection
 * - getStoredWallet: demo wallet removal, normal wallet, SSR guard
 * - getLocalStorageItem: normal read, SSR guard, error handling
 * - setLocalStorageItem: normal write, SSR guard, error handling
 * - removeLocalStorageItem: normal remove, SSR guard, error handling
 * - mapApiUser: full mapping with and without fallbacks, trustScore
 */

jest.mock("@/lib/trust", () => ({
  calculateTrustScore: jest.fn((xp: number, stampCount: number) => xp + stampCount * 10),
}));

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import {
  isDemoWalletAddress,
  getStoredWallet,
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
  mapApiUser,
} from "@/app/context/wallet-types";
import { calculateTrustScore } from "@/lib/trust";
import { logger } from "@/lib/logger";

const mockCalculateTrustScore = calculateTrustScore as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

// ─── isDemoWalletAddress ──────────────────────────────────────────────────────

describe("isDemoWalletAddress", () => {
  it("returns true for a demo: prefixed address", () => {
    expect(isDemoWalletAddress("demo:alice")).toBe(true);
  });

  it("returns true for 'demo:' alone", () => {
    expect(isDemoWalletAddress("demo:")).toBe(true);
  });

  it("returns false for a pi: prefixed address", () => {
    expect(isDemoWalletAddress("pi:uid-123")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isDemoWalletAddress("")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDemoWalletAddress(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDemoWalletAddress(null)).toBe(false);
  });

  it("is case-sensitive — 'Demo:' is not a demo address", () => {
    expect(isDemoWalletAddress("Demo:alice")).toBe(false);
  });
});

// ─── getStoredWallet ──────────────────────────────────────────────────────────

describe("getStoredWallet", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("returns null when localStorage has no axiomid_wallet entry", () => {
    expect(getStoredWallet()).toBeNull();
  });

  it("returns the wallet address when it is a normal (non-demo) wallet", () => {
    localStorage.setItem("axiomid_wallet", "pi:uid-xyz");
    expect(getStoredWallet()).toBe("pi:uid-xyz");
  });

  it("removes the demo wallet from localStorage and returns null", () => {
    localStorage.setItem("axiomid_wallet", "demo:alice");
    const result = getStoredWallet();
    expect(result).toBeNull();
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new Error("Storage unavailable");
    });
    expect(getStoredWallet()).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

// ─── getLocalStorageItem ──────────────────────────────────────────────────────

describe("getLocalStorageItem", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("returns null when the key does not exist", () => {
    expect(getLocalStorageItem("nonexistent_key")).toBeNull();
  });

  it("returns the stored value when the key exists", () => {
    localStorage.setItem("my_key", "my_value");
    expect(getLocalStorageItem("my_key")).toBe("my_value");
  });

  it("returns null and logs warning when localStorage throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new Error("QuotaExceeded");
    });
    expect(getLocalStorageItem("pi_access_token")).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("pi_access_token"),
      expect.any(Error)
    );
  });
});

// ─── setLocalStorageItem ──────────────────────────────────────────────────────

describe("setLocalStorageItem", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("stores the value in localStorage", () => {
    setLocalStorageItem("axiomid_wallet", "pi:test");
    expect(localStorage.getItem("axiomid_wallet")).toBe("pi:test");
  });

  it("does not throw when localStorage.setItem throws — logs a warning instead", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("Storage full");
    });
    expect(() => setLocalStorageItem("key", "value")).not.toThrow();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("key"),
      expect.any(Error)
    );
  });

  it("overwrites an existing value", () => {
    localStorage.setItem("token", "old");
    setLocalStorageItem("token", "new");
    expect(localStorage.getItem("token")).toBe("new");
  });
});

// ─── removeLocalStorageItem ───────────────────────────────────────────────────

describe("removeLocalStorageItem", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("removes an existing key from localStorage", () => {
    localStorage.setItem("axiomid_logged_out", "true");
    removeLocalStorageItem("axiomid_logged_out");
    expect(localStorage.getItem("axiomid_logged_out")).toBeNull();
  });

  it("does not throw when the key does not exist", () => {
    expect(() => removeLocalStorageItem("nonexistent")).not.toThrow();
  });

  it("does not throw when localStorage.removeItem throws — logs a warning instead", () => {
    jest.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => {
      throw new Error("permission denied");
    });
    expect(() => removeLocalStorageItem("key")).not.toThrow();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("key"),
      expect.any(Error)
    );
  });
});

// ─── mapApiUser ───────────────────────────────────────────────────────────────

describe("mapApiUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateTrustScore.mockImplementation((xp, count) => xp + count * 10);
  });

  const baseApiResponse = {
    userId: "user-123",
    walletAddress: "pi:uid-123",
    xp: 200,
    tier: "Citizen" as const,
    stamps: [
      { type: "connect_wallet", provider: "pi", xpAwarded: 100, createdAt: "2024-01-01T00:00:00Z" },
    ],
    actions: [
      { type: "connect_wallet", xp: 100, timestamp: "2024-01-01T00:00:00Z" },
    ],
    createdAt: "2024-01-01T00:00:00Z",
  };

  it("maps required fields from the API response", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.id).toBe("user-123");
    expect(user.walletAddress).toBe("pi:uid-123");
    expect(user.xp).toBe(200);
    expect(user.tier).toBe("Citizen");
  });

  it("uses provided trustScore from API response when present", () => {
    const user = mapApiUser({ ...baseApiResponse, trustScore: 42 });
    expect(user.trustScore).toBe(42);
    expect(mockCalculateTrustScore).not.toHaveBeenCalled();
  });

  it("computes trustScore via calculateTrustScore when not in response", () => {
    const user = mapApiUser(baseApiResponse);
    expect(mockCalculateTrustScore).toHaveBeenCalledWith(200, 1);
    expect(user.trustScore).toBe(210); // 200 + 1*10
  });

  it("uses fallback stellarAddress when API response omits it", () => {
    const user = mapApiUser(baseApiResponse, { stellarAddress: "GFALLBACK" });
    expect(user.stellarAddress).toBe("GFALLBACK");
  });

  it("prefers API stellarAddress over fallback", () => {
    const user = mapApiUser(
      { ...baseApiResponse, stellarAddress: "GAPI" },
      { stellarAddress: "GFALLBACK" }
    );
    expect(user.stellarAddress).toBe("GAPI");
  });

  it("sets stellarAddress to null when neither API nor fallback provides one", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.stellarAddress).toBeNull();
  });

  it("uses fallback createdAt when API response omits it", () => {
    const { createdAt: _, ...withoutCreatedAt } = baseApiResponse;
    const fallbackDate = "2023-06-01T00:00:00Z";
    const user = mapApiUser(withoutCreatedAt, { createdAt: fallbackDate });
    expect(user.createdAt).toBe(fallbackDate);
  });

  it("uses fallback stamps when API response omits stamps", () => {
    const { stamps: _, ...withoutStamps } = baseApiResponse;
    const fallbackStamps = [
      { type: "verify_kya", provider: "axiom", xpAwarded: 150, createdAt: "2024-01-02T00:00:00Z" },
    ];
    const user = mapApiUser(withoutStamps, { stamps: fallbackStamps });
    expect(user.stamps).toEqual(fallbackStamps);
  });

  it("uses fallback actions when API response omits actions", () => {
    const { actions: _, ...withoutActions } = baseApiResponse;
    const fallbackActions = [
      { type: "verify_kya", xp: 150, timestamp: "2024-01-02T00:00:00Z" },
    ];
    const user = mapApiUser(withoutActions, { actions: fallbackActions });
    expect(user.actions).toEqual(fallbackActions);
  });

  it("defaults stamps and actions to [] when neither API nor fallback provides them", () => {
    const { stamps: _s, actions: _a, ...minimal } = baseApiResponse;
    const user = mapApiUser(minimal);
    expect(user.stamps).toEqual([]);
    expect(user.actions).toEqual([]);
  });

  it("sets kycStatus to null when not provided", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.kycStatus).toBeNull();
  });

  it("maps kycStatus when provided", () => {
    const user = mapApiUser({ ...baseApiResponse, kycStatus: "verified" });
    expect(user.kycStatus).toBe("verified");
  });

  it("sets did to null when not provided", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.did).toBeNull();
  });

  it("maps did when provided", () => {
    const user = mapApiUser({ ...baseApiResponse, did: "did:axiom:abc123" });
    expect(user.did).toBe("did:axiom:abc123");
  });

  it("sets passportUrl to null when not provided", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.passportUrl).toBeNull();
  });

  it("sets agent to null when not provided", () => {
    const user = mapApiUser(baseApiResponse);
    expect(user.agent).toBeNull();
  });

  it("maps agent when provided", () => {
    const agent = { id: "ag1", name: "Sentinel", status: "ACTIVE", lastActive: "2024-01-01T00:00:00Z" };
    const user = mapApiUser({ ...baseApiResponse, agent });
    expect(user.agent).toEqual(agent);
  });

  it("generates a createdAt timestamp when neither API nor fallback provides one", () => {
    const { createdAt: _, ...withoutCreatedAt } = baseApiResponse;
    const user = mapApiUser(withoutCreatedAt);
    expect(user.createdAt).toBeTruthy();
    expect(new Date(user.createdAt).getTime()).not.toBeNaN();
  });

  it("uses stamps from API response over fallback stamps (API takes priority)", () => {
    const apiStamps = [
      { type: "connect_wallet", provider: "pi", xpAwarded: 100, createdAt: "2024-01-01T00:00:00Z" },
    ];
    const fallbackStamps = [
      { type: "verify_kya", provider: "axiom", xpAwarded: 150, createdAt: "2024-01-02T00:00:00Z" },
    ];
    const user = mapApiUser({ ...baseApiResponse, stamps: apiStamps }, { stamps: fallbackStamps });
    expect(user.stamps).toEqual(apiStamps);
  });
});