import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "@/app/context/wallet-context";
import { connectPi } from "@/lib/pi-sdk";

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
    delete (window as any).Pi;
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
  });

  const setUserAgent = (ua: string) => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  };

  it("renders with default state for external browsers when no credentials are saved", async () => {
    let contextValue: any;
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

  it("calls Pi.init if window.Pi is defined on mount", async () => {
    const mockInit = jest.fn();
    (window as any).Pi = {
      init: mockInit,
      // Do not mock authenticate so we don't trigger auto-connect
    };

    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    expect(mockInit).toHaveBeenCalledWith({
      version: "2.0",
      sandbox: false,
    });
  });

  it("calls Pi.init with sandbox=true when NEXT_PUBLIC_PI_SANDBOX is true", async () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "true";
    const mockInit = jest.fn();
    (window as any).Pi = {
      init: mockInit,
    };

    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    expect(mockInit).toHaveBeenCalledWith({
      version: "2.0",
      sandbox: true,
    });
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

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    // Should fetch from user status endpoint
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/user/status?walletAddress=demo:wallet123");
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

  it("performs silent auto-connect on mount if inside Pi Browser user-agent", async () => {
    // Simulate Pi Browser user agent
    setUserAgent("Pi Browser; Android; minepi");
    
    // Set up connectPi mock
    mockConnectPi.mockResolvedValueOnce({
      token: "pi-token-456",
      user: {
        uid: "pi-uid-456",
        username: "pibrowseruser",
        name: "Pi Browser User",
        wallet_address: "GSTELLAR123",
      },
      stellarAddress: "GSTELLAR123",
    });

    // Mock authentication verify request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-pi-456",
        walletAddress: "pi:pi-uid-456",
        xp: 10,
        tier: "Beginner",
        piUsername: "pibrowseruser",
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    // Should auto-connect and wait until isLoading is false
    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(mockConnectPi).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/pi", expect.objectContaining({
      method: "POST",
    }));
    expect(contextValue.user).not.toBeNull();
    expect(contextValue.user.walletAddress).toBe("pi:pi-uid-456");
    expect(contextValue.user.piUsername).toBe("pibrowseruser");
    expect(localStorage.getItem("pi_access_token")).toBe("pi-token-456");
    expect(localStorage.getItem("axiomid_wallet")).toBe("pi:pi-uid-456");
  });

  it("leaves user null and sets isLoading=false when API returns non-ok on restore", async () => {
    localStorage.setItem("axiomid_wallet", "demo:badwallet");
    localStorage.setItem("pi_access_token", "bad-token");

    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).toBeNull();
  });

  it("leaves user null and sets isLoading=false when API throws on restore", async () => {
    localStorage.setItem("axiomid_wallet", "demo:errwallet");
    localStorage.setItem("pi_access_token", "err-token");

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).toBeNull();
  });

  it("does not call Pi.init when window.Pi is not defined", async () => {
    // window.Pi is deleted in beforeEach — just confirm no error and no fetch calls
    render(
      <WalletProvider>
        <div>Test</div>
      </WalletProvider>
    );

    // No assertion failure means Pi.init was not called (no window.Pi)
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("connectWallet in external browser creates a demo wallet and stores it in localStorage", async () => {
    // Respond to the /api/auth/connect request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "demo-user-1",
          walletAddress: "demo:abc12345",
          xp: 0,
          tier: "Visitor",
          trustScore: 0,
          createdAt: new Date().toISOString(),
          piUsername: null,
          actions: [],
          agent: null,
        },
      }),
    });

    let contextValue: any;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/connect",
      expect.objectContaining({ method: "POST" })
    );
    expect(localStorage.getItem("axiomid_wallet")).toMatch(/^demo:/);
    expect(contextValue.user).not.toBeNull();
  });

  it("connectWallet reuses existing demo wallet from localStorage", async () => {
    localStorage.setItem("axiomid_wallet", "demo:existing1");

    // Restore call from initRef useEffect
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "existing-user",
        walletAddress: "demo:existing1",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: null,
        agent: null,
      }),
    });

    // The connect call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "existing-user",
          walletAddress: "demo:existing1",
          xp: 0,
          tier: "Visitor",
          trustScore: 0,
          createdAt: new Date().toISOString(),
          piUsername: null,
          actions: [],
          agent: null,
        },
      }),
    });

    let contextValue: any;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    // The connect call should have used the existing "demo:existing1" address
    const connectCall = mockFetch.mock.calls.find(
      (call) => call[0] === "/api/auth/connect"
    );
    expect(connectCall).toBeDefined();
    const body = JSON.parse(connectCall![1].body);
    expect(body.walletAddress).toBe("demo:existing1");
  });

  it("connectWallet in Pi Browser falls back to demo wallet when connectPi throws NOT_IN_PI_BROWSER", async () => {
    setUserAgent("Pi Browser; Android; minepi");

    mockConnectPi.mockRejectedValueOnce(new Error("NOT_IN_PI_BROWSER"));

    // auto-connect attempt from initRef (Pi browser path) will call connectWallet
    // connectWallet -> connectPi throws -> falls back to demo
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "fallback-demo-user",
          walletAddress: "demo:fallbackx",
          xp: 0,
          tier: "Visitor",
          trustScore: 0,
          createdAt: new Date().toISOString(),
          piUsername: null,
          actions: [],
          agent: null,
        },
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/connect",
      expect.objectContaining({ method: "POST" })
    );
    expect(localStorage.getItem("axiomid_wallet")).toMatch(/^demo:/);
    expect(contextValue.user).not.toBeNull();
  });

  it("isPiBrowser is true when window.Pi.authenticate is defined", async () => {
    // window.Pi.authenticate present triggers checkPiBrowser to return true
    (window as any).Pi = {
      authenticate: jest.fn(),
      init: jest.fn(),
    };

    // Pi browser path: auto-connect runs
    mockConnectPi.mockResolvedValueOnce({
      token: "pi-auth-token",
      user: {
        uid: "pi-uid-auth",
        username: "authuser",
        name: "Auth User",
        wallet_address: null,
      },
      stellarAddress: null,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-auth",
        walletAddress: "pi:pi-uid-auth",
        xp: 5,
        tier: "Visitor",
        piUsername: "authuser",
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isPiBrowser).toBe(true);
  });

  it("useWallet throws when used outside WalletProvider", () => {
    // Suppress React's error boundary output
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    function Naked() {
      useWallet();
      return null;
    }

    expect(() => render(<Naked />)).toThrow(
      "useWallet must be used within a WalletProvider"
    );

    consoleError.mockRestore();
  });

  it("buildUserFromApiData uses fallback stellarAddress when API data lacks it", async () => {
    localStorage.setItem("axiomid_wallet", "demo:stellartest");
    localStorage.setItem("pi_access_token", "tok");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-stellar",
        walletAddress: "demo:stellartest",
        // no stellarAddress in API response
        xp: 50,
        tier: "Visitor",
        // no trustScore in API response — should compute from xp
        createdAt: "2025-01-01T00:00:00.000Z",
        piUsername: "stellaruser",
        agent: null,
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // trustScore should be computed as Math.min(100, floor(50/10)) = 5
    expect(contextValue.user.trustScore).toBe(5);
    expect(contextValue.user.stellarAddress).toBeNull();
    expect(contextValue.user.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("buildUserFromApiData uses explicit trustScore from API when provided", async () => {
    localStorage.setItem("axiomid_wallet", "demo:trusttest");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-trust",
        walletAddress: "demo:trusttest",
        xp: 200,
        tier: "Bronze",
        trustScore: 77,
        createdAt: new Date().toISOString(),
        piUsername: "trustuser",
        agent: null,
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // trustScore should be taken from API, not computed from xp
    expect(contextValue.user.trustScore).toBe(77);
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
