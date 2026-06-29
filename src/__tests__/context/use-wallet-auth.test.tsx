import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWalletAuth } from "@/app/context/use-wallet-auth";
import { connectPi, checkPiBrowser, PiSdkError, PiSdkErrorCode, determineSandboxMode } from "@/lib/pi-sdk";

jest.mock("@/lib/pi-sdk", () => {
  const actual = jest.requireActual("@/lib/pi-sdk");
  return {
    ...actual,
    connectPi: jest.fn(),
    checkPiBrowser: jest.fn(),
    determineSandboxMode: jest.fn(),
  };
});

const mockConnectPi = connectPi as jest.MockedFunction<typeof connectPi>;
const mockCheckPiBrowser = checkPiBrowser as jest.MockedFunction<typeof checkPiBrowser>;
const mockDetermineSandboxMode = determineSandboxMode as jest.MockedFunction<typeof determineSandboxMode>;

function makeAuthParams(overrides: Partial<Parameters<typeof useWalletAuth>[0]> = {}) {
  return {
    setUser: jest.fn(),
    setPiAccessToken: jest.fn(),
    setIsConnecting: jest.fn(),
    setError: jest.fn(),
    setIsLoading: jest.fn(),
    pushLog: jest.fn(),
    ...overrides,
  };
}

describe("useWalletAuth — logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("removes pi_access_token from localStorage", () => {
    localStorage.setItem("pi_access_token", "token-to-clear");
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("pi_access_token")).toBeNull();
  });

  it("removes axiomid_wallet from localStorage", () => {
    localStorage.setItem("axiomid_wallet", "pi:user123");
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
  });

  it("sets axiomid_logged_out to 'true' in localStorage", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("axiomid_logged_out")).toBe("true");
  });

  it("calls setUser(null)", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.setUser).toHaveBeenCalledWith(null);
  });

  it("calls setPiAccessToken(null)", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.setPiAccessToken).toHaveBeenCalledWith(null);
  });

  it("calls setError(null)", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.setError).toHaveBeenCalledWith(null);
  });

  it("calls setIsLoading(false)", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.setIsLoading).toHaveBeenCalledWith(false);
  });

  it("calls setIsConnecting(false)", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.setIsConnecting).toHaveBeenCalledWith(false);
  });

  it("pushes a logout log message", () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    act(() => {
      result.current.logout();
    });

    expect(params.pushLog).toHaveBeenCalledWith(
      expect.stringMatching(/logged out/i)
    );
  });
});

describe("useWalletAuth — connectWallet (Pi Browser / test env)", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // In test env (NODE_ENV=test), the sandbox shortcut is disabled.
    // So connectPi will be called when not in Pi Browser.
    mockCheckPiBrowser.mockReturnValue(false);
    mockDetermineSandboxMode.mockReturnValue(false);
  });

  it("sets isConnecting(true) at start and isConnecting(false) after completion", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "pi-token",
      user: { uid: "uid1", username: "user1", name: "User One", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "uid1",
        walletAddress: "pi:uid1",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setIsConnecting).toHaveBeenCalledWith(true);
    expect(params.setIsConnecting).toHaveBeenCalledWith(false);
  });

  it("removes axiomid_logged_out from localStorage at start", async () => {
    localStorage.setItem("axiomid_logged_out", "true");
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "pi-token",
      user: { uid: "uid1", username: "user1", name: "User One", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "uid1",
        walletAddress: "pi:uid1",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(localStorage.getItem("axiomid_logged_out")).toBeNull();
  });

  it("calls connectPi, then /api/auth/pi, then setUser on success", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "pi-access-token",
      user: { uid: "pi-uid-1", username: "piuser1", name: "Pi User One", stellarAddress: "GSTELLAR1" },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "pi-uid-1",
        walletAddress: "pi:pi-uid-1",
        xp: 50,
        tier: "Visitor",
        trustScore: 10,
        createdAt: new Date().toISOString(),
        piUsername: "piuser1",
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(mockConnectPi).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/pi",
      expect.objectContaining({ method: "POST" })
    );
    expect(params.setUser).toHaveBeenCalled();
    expect(params.setPiAccessToken).toHaveBeenCalledWith("pi-access-token");
    expect(localStorage.getItem("pi_access_token")).toBe("pi-access-token");
    expect(localStorage.getItem("axiomid_wallet")).toBe("pi:pi-uid-1");
  });

  it("sets error when /api/auth/pi returns non-ok", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "bad-token",
      user: { uid: "uid2", username: "user2", name: "User Two", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized", code: "UNAUTH" }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Unauthorized")
    );
    expect(params.setUser).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("sets error when connectPi throws a non-SDK error", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    mockConnectPi.mockRejectedValueOnce(new Error("Generic Pi failure"));

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Generic Pi failure")
    );
    jest.useRealTimers();
  });

  it("throws a user-friendly error when Pi SDK is unavailable (NOT_IN_PI_BROWSER)", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    const sdkError = new PiSdkError(PiSdkErrorCode.NOT_IN_PI_BROWSER, "Pi SDK unavailable");
    mockConnectPi.mockRejectedValueOnce(sdkError);

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Pi Browser required")
    );
    jest.useRealTimers();
  });

  it("prevents concurrent connectWallet calls", async () => {
    const params = makeAuthParams();
    let resolveConnect: () => void;
    const connectPromise = new Promise<void>((res) => { resolveConnect = res; });

    mockConnectPi.mockImplementationOnce(async () => {
      await connectPromise;
      return { token: "t", user: { uid: "u", username: "u", name: "U", stellarAddress: null } };
    });

    const { result } = renderHook(() => useWalletAuth(params));

    // Start first call (not awaited)
    const call1 = act(async () => { result.current.connectWallet(); });
    // Second call should return immediately without calling connectPi again
    await act(async () => { await result.current.connectWallet(); });

    // Resolve first call
    resolveConnect!();
    await call1;

    expect(mockConnectPi).toHaveBeenCalledTimes(1);
  });

  it("includes Stellar address log when stellarAddress is present", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "tok",
      user: { uid: "u1", username: "usr1", name: "Usr", stellarAddress: "GSTELLAR123" },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "u1",
        walletAddress: "pi:u1",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    const stellarLog = params.pushLog.mock.calls.find((c: string[]) =>
      c[0].includes("Stellar Address")
    );
    expect(stellarLog).toBeDefined();
  });
});

describe("useWalletAuth — disconnectWallet", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("calls /api/auth/logout with stored token when token exists", async () => {
    localStorage.setItem("pi_access_token", "stored-logout-token");
    const params = makeAuthParams();
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.disconnectWallet();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer stored-logout-token" },
    });
  });

  it("calls logout even when /api/auth/logout fails", async () => {
    localStorage.setItem("pi_access_token", "token");
    const params = makeAuthParams();
    mockFetch.mockRejectedValueOnce(new Error("Server down"));

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.disconnectWallet();
    });

    // logout was still called
    expect(params.setUser).toHaveBeenCalledWith(null);
    expect(localStorage.getItem("axiomid_logged_out")).toBe("true");
  });

  it("calls logout even when no token is stored (skips API call)", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.disconnectWallet();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(params.setUser).toHaveBeenCalledWith(null);
  });
});

describe("useWalletAuth — connectDemo", () => {
  let mockFetch: jest.Mock;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: "demo-sandbox-token" } }),
    });
    // connectDemo fetches server token only in development mode
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("sets a demo user with correct wallet address", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const setUserCall = params.setUser.mock.calls[0][0];
    expect(setUserCall.walletAddress).toBe("pi:demo_alice");
  });

  it("stores axiomid_wallet and pi_access_token in localStorage", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    expect(localStorage.getItem("axiomid_wallet")).toBe("pi:demo_alice");
    expect(localStorage.getItem("pi_access_token")).toBe("demo-sandbox-token");
  });

  it("removes axiomid_logged_out from localStorage", async () => {
    localStorage.setItem("axiomid_logged_out", "true");
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    expect(localStorage.getItem("axiomid_logged_out")).toBeNull();
  });

  it("sets isConnecting(false) at end", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const connectingCalls = params.setIsConnecting.mock.calls;
    const lastCall = connectingCalls[connectingCalls.length - 1];
    expect(lastCall[0]).toBe(false);
  });

  it("sets demo user with expected fields", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const demoUser = params.setUser.mock.calls[0][0];
    expect(demoUser.piUsername).toBe("AliceDemo");
    expect(demoUser.kycStatus).toBe("VERIFIED");
    expect(demoUser.xp).toBe(450);
    expect(demoUser.tier).toBe("Citizen");
    expect(demoUser.did).toBe("did:axiom:demo_alice_did_hash_12345");
    expect(demoUser.agent?.name).toBe("Axiom Sentinel");
  });

  it("demo user has 2 actions and 2 stamps", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const demoUser = params.setUser.mock.calls[0][0];
    expect(demoUser.actions).toHaveLength(2);
    expect(demoUser.stamps).toHaveLength(2);
  });

  it("pushes a success log message", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    expect(params.pushLog).toHaveBeenCalledWith(
      expect.stringMatching(/demo mode initialized/i)
    );
  });
});

describe("useWalletAuth — connectWallet returns boolean", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockCheckPiBrowser.mockReturnValue(false);
    mockDetermineSandboxMode.mockReturnValue(false);
  });

  it("returns true when authentication succeeds", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "ok-token",
      user: { uid: "uid-ok", username: "user-ok", name: "User OK", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "uid-ok",
        walletAddress: "pi:uid-ok",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.connectWallet();
    });

    expect(res).toBe(true);
  });

  it("sets error when /api/auth/pi returns non-ok", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "fail-token",
      user: { uid: "uid-fail", username: "user-fail", name: "Fail", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Auth rejected", code: "AUTH_FAIL" }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Auth rejected")
    );
    jest.useRealTimers();
  });

  it("sets error when connectPi throws", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    mockConnectPi.mockRejectedValueOnce(new Error("Connection refused"));

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Connection refused")
    );
    jest.useRealTimers();
  });

  it("throws Pi Browser required for SDK_NOT_AVAILABLE error", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    const sdkError = new PiSdkError(PiSdkErrorCode.SDK_NOT_AVAILABLE, "SDK not available");
    mockConnectPi.mockRejectedValueOnce(sdkError);

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Pi Browser required")
    );
    jest.useRealTimers();
  });

  it("throws Pi Browser required for SDK_SCRIPT_LOAD_FAILED error", async () => {
    jest.useFakeTimers();
    const params = makeAuthParams();
    const sdkError = new PiSdkError(PiSdkErrorCode.SDK_SCRIPT_LOAD_FAILED, "Script load failed");
    mockConnectPi.mockRejectedValueOnce(sdkError);

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.setError).toHaveBeenCalledWith(
      expect.stringContaining("Pi Browser required")
    );
    jest.useRealTimers();
  });

  it("pushes 'Wallet authenticated successfully!' log on success", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "success-token",
      user: { uid: "uid-success", username: "success-user", name: "Success", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "uid-success",
        walletAddress: "pi:uid-success",
        xp: 100,
        tier: "Visitor",
        trustScore: 20,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    expect(params.pushLog).toHaveBeenCalledWith("Wallet authenticated successfully!");
  });

  it("sends correct JSON body to /api/auth/pi", async () => {
    const params = makeAuthParams();
    mockConnectPi.mockResolvedValueOnce({
      token: "body-test-token",
      user: { uid: "uid-body", username: "bodyuser", name: "Body User", stellarAddress: null },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "uid-body",
        walletAddress: "pi:uid-body",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useWalletAuth(params));
    await act(async () => {
      await result.current.connectWallet();
    });

    const authCall = mockFetch.mock.calls.find((c) => c[0] === "/api/auth/pi");
    expect(authCall).toBeDefined();
    const body = JSON.parse(authCall![1].body);
    expect(body.accessToken).toBe("body-test-token");
    expect(body.uid).toBe("uid-body");
    expect(body.username).toBe("bodyuser");
  });
});

describe("useWalletAuth — connectDemo idempotency", () => {
  let mockFetch: jest.Mock;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: "demo-token-123" } }),
    });
    // connectDemo fetches server token only in development mode
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("sets setPiAccessToken to the sandbox dev token", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    expect(params.setPiAccessToken).toHaveBeenCalledWith("demo-token-123");
  });

  it("demo user has Stellar address set", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const demoUser = params.setUser.mock.calls[0][0];
    expect(demoUser.stellarAddress).toBeTruthy();
    expect(demoUser.stellarAddress).toMatch(/^G/);
  });

  it("demo user has trustScore=85", async () => {
    const params = makeAuthParams();
    const { result } = renderHook(() => useWalletAuth(params));

    await act(async () => {
      await result.current.connectDemo();
    });

    const demoUser = params.setUser.mock.calls[0][0];
    expect(demoUser.trustScore).toBe(85);
  });
});
