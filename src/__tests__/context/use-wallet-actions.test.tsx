import React, { useRef } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWalletActions } from "@/app/context/use-wallet-actions";
import { runWalletTest } from "@/lib/pi-sdk";
import { User } from "@/app/context/wallet-types";

jest.mock("@/lib/pi-sdk", () => {
  const actual = jest.requireActual("@/lib/pi-sdk");
  return {
    ...actual,
    runWalletTest: jest.fn(),
  };
});

const mockRunWalletTest = runWalletTest as jest.MockedFunction<typeof runWalletTest>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-test",
    walletAddress: "pi:user-test",
    xp: 100,
    tier: "Citizen",
    trustScore: 60,
    createdAt: new Date().toISOString(),
    actions: [],
    stamps: [],
    ...overrides,
  };
}

describe("useWalletActions — pushLog", () => {
  it("appends a timestamped message to wallet logs", () => {
    const setWalletLogs = jest.fn();
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    act(() => {
      result.current.pushLog("test message");
    });

    expect(setWalletLogs).toHaveBeenCalled();
    const updater = setWalletLogs.mock.calls[0][0];
    const newLogs = updater([]);
    expect(newLogs).toHaveLength(1);
    expect(newLogs[0]).toContain("test message");
    // Timestamp format: [HH:MM:SS AM/PM] or similar
    expect(newLogs[0]).toMatch(/^\[.+?\]/);
  });

  it("caps logs at 200 entries", () => {
    const setWalletLogs = jest.fn();
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    act(() => {
      result.current.pushLog("overflow message");
    });

    const updater = setWalletLogs.mock.calls[0][0];
    // Simulate 201 existing logs
    const existing = Array.from({ length: 201 }, (_, i) => `log-${i}`);
    const newLogs = updater(existing);
    expect(newLogs.length).toBe(200);
    // The oldest entry should be sliced off
    expect(newLogs[newLogs.length - 1]).toContain("overflow message");
  });
});

describe("useWalletActions — clearWalletLogs", () => {
  it("clears all wallet logs", () => {
    const setWalletLogs = jest.fn();
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    act(() => {
      result.current.clearWalletLogs();
    });

    expect(setWalletLogs).toHaveBeenCalledWith([]);
  });
});

describe("useWalletActions — refreshUser", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("does nothing when no walletAddress and userRef is null", async () => {
    const setUser = jest.fn();
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it("returns early when axiomid_logged_out is 'true'", async () => {
    localStorage.setItem("axiomid_wallet", "pi:user-test");
    localStorage.setItem("axiomid_logged_out", "true");

    const setUser = jest.fn();
    const userRef = { current: makeUser() };
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns early when axiomid_wallet is not in localStorage", async () => {
    // No axiomid_wallet in localStorage
    const setUser = jest.fn();
    const userRef = { current: makeUser() };
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls /api/user/status and updates user on success", async () => {
    localStorage.setItem("axiomid_wallet", "pi:user-test");
    localStorage.setItem("pi_access_token", "token-abc");

    const userRef = { current: makeUser() };
    const setUser = jest.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-test",
        walletAddress: "pi:user-test",
        xp: 200,
        tier: "Citizen",
        trustScore: 80,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/user/status", {
      headers: { Authorization: "Bearer token-abc" },
    });
    expect(setUser).toHaveBeenCalled();
  });

  it("includes Authorization header when pi_access_token is stored", async () => {
    localStorage.setItem("axiomid_wallet", "pi:user-test");
    localStorage.setItem("pi_access_token", "stored-token-xyz");

    const userRef = { current: makeUser() };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-test",
        walletAddress: "pi:user-test",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/user/status", {
      headers: { Authorization: "Bearer stored-token-xyz" },
    });
  });

  it("does not call setUser when API returns non-ok", async () => {
    localStorage.setItem("axiomid_wallet", "pi:user-test");
    const setUser = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(setUser).not.toHaveBeenCalled();
  });
});

describe("useWalletActions — claimAction", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("returns false when userRef.current is null", async () => {
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimAction("connect_wallet");
    });

    expect(res).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls /api/stamp/claim with actionType and returns true on success", async () => {
    const setUser = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        newBalance: 250,
        tier: "Citizen",
        xpEarned: 150,
        metadata: null,
      }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: "access-token-123",
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimAction("connect_wallet");
    });

    expect(res).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/stamp/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token-123",
      },
      body: JSON.stringify({ actionType: "connect_wallet", metadata: undefined }),
    });
    expect(setUser).toHaveBeenCalled();
  });

  it("includes correct provider for connect_ action types", async () => {
    const setUser = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ newBalance: 200, tier: "Citizen", xpEarned: 100, metadata: null }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.claimAction("connect_wallet");
    });

    const updaterCall = setUser.mock.calls[0][0];
    const updatedUser = updaterCall(userRef.current!);
    const lastStamp = updatedUser.stamps[updatedUser.stamps.length - 1];
    expect(lastStamp.provider).toBe("wallet");
  });

  it("uses 'system' provider for non-connect_ action types", async () => {
    const setUser = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ newBalance: 200, tier: "Citizen", xpEarned: 100, metadata: null }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.claimAction("verify_kya");
    });

    const updaterCall = setUser.mock.calls[0][0];
    const updatedUser = updaterCall(userRef.current!);
    const lastStamp = updatedUser.stamps[updatedUser.stamps.length - 1];
    expect(lastStamp.provider).toBe("system");
  });

  it("sets error and returns false when API returns non-ok", async () => {
    jest.useFakeTimers();
    const setError = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Already claimed" }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError,
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimAction("connect_wallet");
    });

    expect(res).toBe(false);
    expect(setError).toHaveBeenCalledWith("Already claimed");
    jest.useRealTimers();
  });

  it("returns false on network error", async () => {
    const userRef = { current: makeUser() };
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimAction("connect_wallet");
    });

    expect(res).toBe(false);
  });

  it("does not include Authorization header when piAccessToken is null", async () => {
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ newBalance: 100, tier: "Citizen", xpEarned: 0, metadata: null }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.claimAction("verify_kya");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/stamp/claim",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      })
    );
  });
});

describe("useWalletActions — claimKya", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("axiomid_wallet", "pi:user-test");
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns false when userRef.current is null", async () => {
    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimKya("alice");
    });

    expect(res).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls /api/pi/kya/claim and returns true on success", async () => {
    const userRef = { current: makeUser() };

    // POST /api/pi/kya/claim
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser: GET /api/user/status
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-test",
        walletAddress: "pi:user-test",
        xp: 250,
        tier: "Citizen",
        trustScore: 90,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: "kya-token",
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimKya("alice");
    });

    expect(res).toBe(true);
    const kyaCall = mockFetch.mock.calls.find((c) => c[0] === "/api/pi/kya/claim");
    expect(kyaCall).toBeDefined();
    expect(kyaCall![1].method).toBe("POST");
  });

  it("sets error and returns false when API returns non-ok", async () => {
    jest.useFakeTimers();
    const setError = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "KYA not eligible" }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError,
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimKya("alice");
    });

    expect(res).toBe(false);
    expect(setError).toHaveBeenCalledWith("KYA not eligible");
    jest.useRealTimers();
  });

  it("returns false on network error", async () => {
    const userRef = { current: makeUser() };
    mockFetch.mockRejectedValueOnce(new Error("Network down"));

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.claimKya("alice");
    });

    expect(res).toBe(false);
  });
});

describe("useWalletActions — runTest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears logs and calls runWalletTest", async () => {
    const setWalletLogs = jest.fn();
    mockRunWalletTest.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    await act(async () => {
      await result.current.runTest();
    });

    // clearWalletLogs sets logs to []
    expect(setWalletLogs).toHaveBeenCalledWith([]);
    expect(mockRunWalletTest).toHaveBeenCalled();
  });

  it("pushes an error log when runWalletTest throws", async () => {
    const setWalletLogs = jest.fn();
    mockRunWalletTest.mockRejectedValueOnce(new Error("SDK exploded"));

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    await act(async () => {
      await result.current.runTest();
    });

    const logCalls = setWalletLogs.mock.calls.map((c) => {
      const arg = c[0];
      // The updater might be a function or direct value
      return typeof arg === "function" ? arg([]) : arg;
    });
    const allLogs = logCalls.flat();
    const errorLog = allLogs.find((l: string) => l?.includes("❌"));
    expect(errorLog).toContain("SDK exploded");
  });

  it("pushes initial '🚀 Starting...' log before calling runWalletTest", async () => {
    const setWalletLogs = jest.fn();
    mockRunWalletTest.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs,
      })
    );

    await act(async () => {
      await result.current.runTest();
    });

    // Find the pushLog call that contains the starting message
    const logCalls = setWalletLogs.mock.calls.map((c) => {
      const arg = c[0];
      return typeof arg === "function" ? arg([]) : arg;
    });
    const allLogs = logCalls.flat();
    const startLog = allLogs.find((l: string) => l?.includes("🚀"));
    expect(startLog).toContain("Starting");
  });
});

describe("useWalletActions — refreshUser with explicit walletAddress", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("uses explicit walletAddress when userRef.current is null", async () => {
    localStorage.setItem("axiomid_wallet", "pi:explicit-addr");
    const setUser = jest.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "explicit-user",
        walletAddress: "pi:explicit-addr",
        xp: 50,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef: { current: null },
        setUser,
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.refreshUser("pi:explicit-addr");
    });

    // fetch should be called because addr is provided
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("useWalletActions — claimAction with metadata", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("sends metadata in the request body when provided", async () => {
    const userRef = { current: makeUser() };
    const metadata = { platform: "twitter", handle: "@alice" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ newBalance: 200, tier: "Citizen", xpEarned: 100, metadata: null }),
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError: jest.fn(),
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.claimAction("connect_wallet", metadata);
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.metadata).toEqual(metadata);
  });

  it("uses 'Failed to claim' fallback when API returns error without message", async () => {
    jest.useFakeTimers();
    const setError = jest.fn();
    const userRef = { current: makeUser() };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // no error field
    });

    const { result } = renderHook(() =>
      useWalletActions({
        piAccessToken: null,
        userRef,
        setUser: jest.fn(),
        setError,
        setWalletLogs: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.claimAction("verify_kya");
    });

    expect(setError).toHaveBeenCalledWith("Failed to claim");
    jest.useRealTimers();
  });
});