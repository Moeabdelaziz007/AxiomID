import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/app/context/wallet-context";
import { connectPi } from "@/lib/pi-sdk";

// Mock the Pi SDK base module (virtual — no actual package)
jest.mock('@pinetwork/pi-sdk-js', () => ({
  PiSdkBase: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    createPayment: jest.fn(),
  })),
}), { virtual: true });

// Mock the pi-sdk connectPi function
jest.mock("@/lib/pi-sdk", () => {
  const actual = jest.requireActual("@/lib/pi-sdk");
  return {
    ...actual,
    connectPi: jest.fn(),
  };
});

const mockConnectPi = connectPi as jest.MockedFunction<typeof connectPi>;

// A helper component to consume and expose the wallet context for testing assertions
function TestConsumer({ onUpdate }: { onUpdate: (value: ReturnType<typeof useWallet>) => void }) {
  const wallet = useWallet();
  React.useEffect(() => {
    onUpdate(wallet);
  }, [wallet, onUpdate]);

  return (
    <div>
      <div data-testid="status">{wallet.isLoading ? "loading" : "idle"}</div>
      <div data-testid="user">{wallet.user ? wallet.user.walletAddress : "no-user"}</div>
      <button data-testid="connect-btn" onClick={wallet.connectWallet}>Connect</button>
      <button data-testid="logout-btn" onClick={wallet.logout}>Logout</button>
    </div>
  );
}

describe("WalletProvider & WalletContext", () => {
  const originalUserAgent = window.navigator.userAgent;
  const originalSandboxEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).Pi;
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    
    // Reset User Agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalSandboxEnv;
    delete (window as unknown as Record<string, unknown>).Pi;
  });

  const setUserAgent = (ua: string) => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  };

  it("renders with default state for external browsers when no credentials are saved", async () => {
    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).toBeNull();
    expect(contextValue.isPiBrowser).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("detects Pi Browser via user agent", async () => {
    setUserAgent("Pi Browser; Android; minepi");

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.isPiBrowser).toBe(true);
  });

  it("detects Pi Browser via window.Pi", async () => {
    (window as unknown as Record<string, unknown>).Pi = {
      authenticate: jest.fn(),
    };

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.isPiBrowser).toBe(true);
    delete (window as unknown as Record<string, unknown>).Pi;
  });

  it("restores user status via API if external browser has saved credentials in localStorage", async () => {
    localStorage.setItem("axiomid_wallet", "demo:wallet123");
    localStorage.setItem("pi_access_token", "token123");

    const mockUserResponse = {
      userId: "user-123",
      walletAddress: "demo:wallet123",
      xp: 150,
      tier: "Bronze",
      trustScore: 85,
      createdAt: new Date().toISOString(),
      piUsername: "testuser",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserResponse,
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    // Should fetch from user status endpoint with auth header
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/status", {
        headers: { Authorization: "Bearer token123" },
      });
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).not.toBeNull();
    expect(contextValue.user.walletAddress).toBe("demo:wallet123");
    expect(contextValue.user.piUsername).toBe("testuser");
  });

  it("logout clears persisted credentials and prevents reload restoration in external browsers", async () => {
    localStorage.setItem("axiomid_wallet", "demo:logout-wallet");
    localStorage.setItem("pi_access_token", "logout-token");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-logout",
        walletAddress: "demo:logout-wallet",
        xp: 100,
        tier: "Citizen",
        trustScore: 10,
        createdAt: new Date().toISOString(),
        piUsername: "logoutuser",
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId, unmount } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user?.walletAddress).toBe("demo:logout-wallet");
    });

    act(() => {
      getByTestId("logout-btn").click();
    });

    expect(localStorage.getItem("pi_access_token")).toBeNull();
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
    expect(contextValue?.user).toBeNull();
    expect(contextValue?.error).toBeNull();

    unmount();
    mockFetch.mockClear();

    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue?.isLoading).toBe(false));

    expect(contextValue?.user).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("connects via Pi SDK when in Pi Browser and connectWallet is called", async () => {
    setUserAgent("Pi Browser; Android; minepi");
    
    mockConnectPi.mockResolvedValue({
      token: "pi-token-456",
      user: {
        uid: "pi-uid-456",
        username: "pibrowseruser",
        name: "Pi Browser User",
        wallet_address: "GSTELLAR123",
        stellarAddress: "GSTELLAR123",
      },
      stellarAddress: "GSTELLAR123",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "user-pi-456",
        walletAddress: "pi:pi-uid-456",
        xp: 10,
        tier: "Beginner",
        piUsername: "pibrowseruser",
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => {
      expect(contextValue.user).not.toBeNull();
    });

    expect(mockConnectPi).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/pi", expect.objectContaining({
      method: "POST",
    }));
    expect(contextValue.user.walletAddress).toBe("pi:pi-uid-456");
    expect(contextValue.user.piUsername).toBe("pibrowseruser");
    expect(localStorage.getItem("pi_access_token")).toBe("pi-token-456");
    expect(localStorage.getItem("axiomid_wallet")).toBe("pi:pi-uid-456");
  });

  it("sets user correctly from demo auth (flat API response)", async () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "true";
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

    // First mock the state token endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ state: "mock-state-token" }),
    });
    // Then mock the connect endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-demo-1",
        walletAddress: "demo:abc123",
        tier: "Visitor",
        xp: 5,
        did: null,
        kycStatus: null,
        isNewUser: true,
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => {
      expect(contextValue.user).not.toBeNull();
    });

    expect(contextValue.user.id).toBe("user-demo-1");
    expect(contextValue.user.walletAddress).toBe("demo:abc123");
    expect(contextValue.user.tier).toBe("Visitor");
    expect(contextValue.user.xp).toBe(5);
  });

  it("rejects auth when Pi SDK fails in production mode", async () => {
    setUserAgent("Pi Browser; Android; minepi");
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";

    mockConnectPi.mockRejectedValue(new Error("Pi authentication failed: SDK error"));

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => {
      expect(contextValue.error).toBeTruthy();
    });

    expect(mockConnectPi).toHaveBeenCalled();
    expect(contextValue.user).toBeNull();
    expect(contextValue.error).toContain("Pi authentication failed");
  });

  it("logout when user is already null leaves state clean and does not throw", async () => {
    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue?.isLoading).toBe(false));
    expect(contextValue?.user).toBeNull();

    // Calling logout when already signed out must not throw
    expect(() => {
      act(() => {
        getByTestId("logout-btn").click();
      });
    }).not.toThrow();

    expect(contextValue?.user).toBeNull();
    expect(contextValue?.error).toBeNull();
    expect(contextValue?.isLoading).toBe(false);
  });

  it("logout clears a pre-existing error", async () => {
    localStorage.setItem("axiomid_wallet", "demo:errtest");
    localStorage.setItem("pi_access_token", "errtoken");

    // Simulate an API error on restore so error state gets set
    mockFetch.mockRejectedValueOnce(new Error("restore-error"));

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue?.isLoading).toBe(false));

    // Manually set error via failed connect to then verify logout clears it
    // We know user is null at this point; trigger logout regardless
    act(() => {
      getByTestId("logout-btn").click();
    });

    expect(contextValue?.error).toBeNull();
    expect(contextValue?.user).toBeNull();
    expect(localStorage.getItem("pi_access_token")).toBeNull();
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
  });

  it("logout appends a message to walletLogs", async () => {
    localStorage.setItem("axiomid_wallet", "demo:logstest");
    localStorage.setItem("pi_access_token", "logstoken");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-logs",
        walletAddress: "demo:logstest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "logsuser",
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user).not.toBeNull();
    });

    const logsBefore = contextValue?.walletLogs.length ?? 0;

    act(() => {
      getByTestId("logout-btn").click();
    });

    expect(contextValue?.walletLogs.length).toBeGreaterThan(logsBefore);
    const lastLog = contextValue?.walletLogs[contextValue.walletLogs.length - 1] ?? "";
    expect(lastLog).toMatch(/logged out/i);
  });

  it("createAgent via callAgentApi calls /api/agent with a name in the body", async () => {
    localStorage.setItem("axiomid_wallet", "demo:agenttest");
    localStorage.setItem("pi_access_token", "agenttoken");

    // Restore user on mount
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-agent",
        walletAddress: "demo:agenttest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "agentuser",
        agent: null,
      }),
    });

    // createAgent POST succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser after createAgent
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-agent",
        walletAddress: "demo:agenttest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "agentuser",
        agent: { id: "ag1", name: "MyAgent", status: "active", lastActive: null },
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user).not.toBeNull();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue!.createAgent("MyAgent");
    });

    expect(result).toBe(true);

    const agentCall = mockFetch.mock.calls.find((c) => c[0] === "/api/agent");
    expect(agentCall).toBeDefined();
    const body = JSON.parse(agentCall![1].body);
    expect(body.name).toBe("MyAgent");
  });

  it("activateAgent via callAgentApi calls /api/agent/activate with no body", async () => {
    localStorage.setItem("axiomid_wallet", "demo:activatetest");
    localStorage.setItem("pi_access_token", "activatetoken");

    // Mount restore
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-activate",
        walletAddress: "demo:activatetest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "activateuser",
        agent: null,
      }),
    });

    // activateAgent POST
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-activate",
        walletAddress: "demo:activatetest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "activateuser",
        agent: { id: "ag2", name: "Agent", status: "active", lastActive: null },
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user).not.toBeNull();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue!.activateAgent();
    });

    expect(result).toBe(true);

    const activateCall = mockFetch.mock.calls.find((c) => c[0] === "/api/agent/activate");
    expect(activateCall).toBeDefined();
    // No body should be sent
    expect(activateCall![1].body).toBeUndefined();
  });

  it("pauseAgent via callAgentApi calls /api/agent/pause with no body", async () => {
    localStorage.setItem("axiomid_wallet", "demo:pausetest");
    localStorage.setItem("pi_access_token", "pausetoken");

    // Mount restore
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-pause",
        walletAddress: "demo:pausetest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "pauseuser",
        agent: null,
      }),
    });

    // pauseAgent POST
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-pause",
        walletAddress: "demo:pausetest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "pauseuser",
        agent: { id: "ag3", name: "Agent", status: "paused", lastActive: null },
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user).not.toBeNull();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue!.pauseAgent();
    });

    expect(result).toBe(true);

    const pauseCall = mockFetch.mock.calls.find((c) => c[0] === "/api/agent/pause");
    expect(pauseCall).toBeDefined();
    expect(pauseCall![1].body).toBeUndefined();
  });

  it("callAgentApi (via createAgent) returns false when user is null", async () => {
    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue?.isLoading).toBe(false));
    expect(contextValue?.user).toBeNull();

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue!.createAgent("ShouldNotCall");
    });

    expect(result).toBe(false);
    // No API call should have been made (no stored credentials, no Pi browser)
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("callAgentApi (via activateAgent) returns false when the API returns non-ok", async () => {
    localStorage.setItem("axiomid_wallet", "demo:apifailtest");
    localStorage.setItem("pi_access_token", "apifailtoken");

    // Mount restore
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-apifail",
        walletAddress: "demo:apifailtest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "apifailuser",
        agent: null,
      }),
    });

    // activateAgent POST fails
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue?.isLoading).toBe(false);
      expect(contextValue?.user).not.toBeNull();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue!.activateAgent();
    });

    expect(result).toBe(false);
  });
});
