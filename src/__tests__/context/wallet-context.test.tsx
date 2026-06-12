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
function TestConsumer({
  onUpdate,
}: {
  onUpdate: (value: ReturnType<typeof useWallet>) => void;
}) {
  const wallet = useWallet();
  React.useEffect(() => {
    onUpdate(wallet);
  }, [wallet, onUpdate]);

  return (
    <div>
      <div data-testid="status">{wallet.isLoading ? "loading" : "idle"}</div>
      <div data-testid="user">
        {wallet.user ? wallet.user.walletAddress : "no-user"}
      </div>
      <button data-testid="connect-btn" onClick={wallet.connectWallet}>
        Connect
      </button>
    </div>
  );
}

describe("WalletProvider & WalletContext", () => {
  const originalUserAgent = window.navigator.userAgent;
  const originalSandboxEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;
  const originalDemoWalletEnv = process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete (window as any).Pi;
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "false";

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
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = originalDemoWalletEnv;
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).toBeNull();
    expect(contextValue.isPiBrowser).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("blocks demo wallet creation outside Pi Browser when demo mode is disabled", async () => {
    let contextValue: any;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    expect(contextValue.error).toBe("افتح التطبيق من Pi Browser");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
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
      </WalletProvider>,
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
      </WalletProvider>,
    );

    expect(mockInit).toHaveBeenCalledWith({
      version: "2.0",
      sandbox: true,
    });
  });

  it("restores user status via API if external browser has saved credentials in localStorage", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    // Should fetch from user status endpoint
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user/status?walletAddress=demo:wallet123",
      );
      expect(contextValue.isLoading).toBe(false);
    });

    expect(contextValue.user).not.toBeNull();
    expect(contextValue.user.walletAddress).toBe("demo:wallet123");
    expect(contextValue.user.piUsername).toBe("testuser");
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    // Should auto-connect and wait until isLoading is false
    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    expect(mockConnectPi).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/pi",
      expect.objectContaining({
        method: "POST",
      }),
    );
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
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
      </WalletProvider>,
    );

    // No assertion failure means Pi.init was not called (no window.Pi)
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("connectWallet in external browser creates a demo wallet and stores it in localStorage", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/connect",
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorage.getItem("axiomid_wallet")).toMatch(/^demo:/);
    expect(contextValue.user).not.toBeNull();
  });

  it("connectWallet reuses existing demo wallet from localStorage", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    // The connect call should have used the existing "demo:existing1" address
    const connectCall = mockFetch.mock.calls.find(
      (call) => call[0] === "/api/auth/connect",
    );
    expect(connectCall).toBeDefined();
    const body = JSON.parse(connectCall![1].body);
    expect(body.walletAddress).toBe("demo:existing1");
  });

  it("connectWallet in Pi Browser falls back to demo wallet when connectPi throws NOT_IN_PI_BROWSER", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/connect",
      expect.objectContaining({ method: "POST" }),
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isPiBrowser).toBe(true);
  });

  it("useWallet throws when used outside WalletProvider", () => {
    // Suppress React's error boundary output
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function Naked() {
      useWallet();
      return null;
    }

    expect(() => render(<Naked />)).toThrow(
      "useWallet must be used within a WalletProvider",
    );

    consoleError.mockRestore();
  });

  it("buildUserFromApiData uses fallback stellarAddress when API data lacks it", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // trustScore should be computed as Math.min(100, floor(50/10)) = 5
    expect(contextValue.user.trustScore).toBe(5);
    expect(contextValue.user.stellarAddress).toBeNull();
    expect(contextValue.user.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("buildUserFromApiData uses explicit trustScore from API when provided", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
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
        <TestConsumer
          onUpdate={(val) => {
            contextValue = val;
          }}
        />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // trustScore should be taken from API, not computed from xp
    expect(contextValue.user.trustScore).toBe(77);
  });

  // ---------------------------------------------------------------------------
  // New context fields: isDemoWallet, isDemoWalletEnabled
  // ---------------------------------------------------------------------------

  it("isDemoWallet is true after connecting with a demo wallet via connectWallet", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "demo-user-x",
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
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => expect(contextValue.isConnecting).toBe(false));

    expect(contextValue.isDemoWallet).toBe(true);
  });

  it("isDemoWallet is false when user wallet address starts with 'pi:'", async () => {
    setUserAgent("Pi Browser; Android; minepi");

    mockConnectPi.mockResolvedValueOnce({
      token: "pi-token-dm",
      user: {
        uid: "pi-uid-999",
        username: "realpiuser",
        name: "Real Pi User",
        wallet_address: null,
      },
      stellarAddress: null,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-pi-999",
        walletAddress: "pi:pi-uid-999",
        xp: 50,
        tier: "Bronze",
        piUsername: "realpiuser",
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isDemoWallet).toBe(false);
    expect(contextValue.user?.walletAddress).toBe("pi:pi-uid-999");
  });

  it("isDemoWallet is false when no user is connected", async () => {
    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isDemoWallet).toBe(false);
    expect(contextValue.user).toBeNull();
  });

  it("isDemoWalletEnabled is true when NEXT_PUBLIC_ENABLE_DEMO_WALLET=true", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isDemoWalletEnabled).toBe(true);
  });

  it("isDemoWalletEnabled is false when NEXT_PUBLIC_ENABLE_DEMO_WALLET=false", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "false";

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.isDemoWalletEnabled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // getStoredWallet: purges demo wallet from localStorage when demo disabled
  // ---------------------------------------------------------------------------

  it("purges a stored demo wallet from localStorage on mount when demo mode is disabled", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "false";
    localStorage.setItem("axiomid_wallet", "demo:shouldbepurged");

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // The demo wallet must have been removed from localStorage
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
    // No API call should have been made since the wallet was invalid
    expect(mockFetch).not.toHaveBeenCalled();
    expect(contextValue.user).toBeNull();
  });

  it("does not purge a stored demo wallet from localStorage when demo mode is enabled", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";
    localStorage.setItem("axiomid_wallet", "demo:keepme");

    // No need to wait for isLoading – just verify the purge did not happen
    render(
      <WalletProvider>
        <div />
      </WalletProvider>,
    );

    // Synchronously: the initial useState call already ran getStoredWallet(); the wallet
    // should not have been removed because demo mode is enabled.
    expect(localStorage.getItem("axiomid_wallet")).toBe("demo:keepme");
  });

  // ---------------------------------------------------------------------------
  // connectWallet: NOT_IN_PI_BROWSER with demo disabled blocks fallback
  // ---------------------------------------------------------------------------

  it("connectWallet in Pi Browser sets error when connectPi throws NOT_IN_PI_BROWSER and demo is disabled", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "false";
    setUserAgent("Pi Browser; Android; minepi");

    mockConnectPi.mockRejectedValueOnce(new Error("NOT_IN_PI_BROWSER"));

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    expect(contextValue.error).toBe("افتح التطبيق من Pi Browser");
    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
    expect(contextValue.user).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // callAgentApi refactor: createAgent, activateAgent, pauseAgent
  // Use the Pi Browser auto-connect path to get an authenticated user first.
  // ---------------------------------------------------------------------------

  function setupPiBrowserUser(uid: string, username: string) {
    setUserAgent("Pi Browser; Android; minepi");
    mockConnectPi.mockResolvedValueOnce({
      token: `token-${uid}`,
      user: { uid, username, name: username, wallet_address: null },
      stellarAddress: null,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: `user-${uid}`,
        walletAddress: `pi:${uid}`,
        xp: 0,
        tier: "Visitor",
        piUsername: username,
      }),
    });
  }

  it("createAgent posts to /api/agent with name body and returns true on success", async () => {
    setupPiBrowserUser("uid-agent1", "agentuser1");

    // createAgent fetch
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser fetch after createAgent
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-uid-agent1",
        walletAddress: "pi:uid-agent1",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "agentuser1",
        agent: { id: "agent-id", name: "MyAgent", status: "active", lastActive: null },
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));
    expect(contextValue.user).not.toBeNull();

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue.createAgent("MyAgent");
    });

    expect(result).toBe(true);
    const agentCall = mockFetch.mock.calls.find((c) => c[0] === "/api/agent");
    expect(agentCall).toBeDefined();
    expect(agentCall![1].method).toBe("POST");
    const body = JSON.parse(agentCall![1].body);
    expect(body.name).toBe("MyAgent");
  });

  it("activateAgent posts to /api/agent/activate with no body and returns true on success", async () => {
    setupPiBrowserUser("uid-agentact", "agentact");

    // activateAgent fetch
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-uid-agentact",
        walletAddress: "pi:uid-agentact",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "agentact",
        agent: null,
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue.activateAgent();
    });

    expect(result).toBe(true);
    const activateCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/agent/activate",
    );
    expect(activateCall).toBeDefined();
    expect(activateCall![1].method).toBe("POST");
  });

  it("pauseAgent posts to /api/agent/pause and returns true on success", async () => {
    setupPiBrowserUser("uid-agentpause", "agentpause");

    // pauseAgent fetch
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // refreshUser
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-uid-agentpause",
        walletAddress: "pi:uid-agentpause",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "agentpause",
        agent: null,
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue.pauseAgent();
    });

    expect(result).toBe(true);
    const pauseCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/agent/pause",
    );
    expect(pauseCall).toBeDefined();
    expect(pauseCall![1].method).toBe("POST");
  });

  it("createAgent returns false when user is not logged in", async () => {
    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));
    expect(contextValue.user).toBeNull();

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue.createAgent("TestAgent");
    });

    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalledWith("/api/agent", expect.anything());
  });

  it("callAgentApi returns false when the API call returns non-ok", async () => {
    setupPiBrowserUser("uid-agentfail", "agentfail");

    // activateAgent fetch returns error
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    let result: boolean | undefined;
    await act(async () => {
      result = await contextValue.activateAgent();
    });

    expect(result).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // claimAction: uses authHeaders (Authorization Bearer token)
  // ---------------------------------------------------------------------------

  it("claimAction sends Authorization header when piAccessToken is set via Pi Browser login", async () => {
    setUserAgent("Pi Browser; Android; minepi");

    mockConnectPi.mockResolvedValueOnce({
      token: "bearer-token-xyz",
      user: {
        uid: "pi-uid-claim",
        username: "claimuser",
        name: "Claim User",
        wallet_address: null,
      },
      stellarAddress: null,
    });

    // Auth/pi endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-claim",
        walletAddress: "pi:pi-uid-claim",
        xp: 0,
        tier: "Visitor",
        piUsername: "claimuser",
      }),
    });

    // claimAction endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        newBalance: 100,
        tier: "Bronze",
        xpEarned: 100,
      }),
    });

    let contextValue: any;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));
    expect(contextValue.user).not.toBeNull();

    let claimed: boolean | undefined;
    await act(async () => {
      claimed = await contextValue.claimAction("CONNECT_WALLET");
    });

    expect(claimed).toBe(true);
    const claimCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/action/claim",
    );
    expect(claimCall).toBeDefined();
    expect(claimCall![1].headers["Authorization"]).toBe("Bearer bearer-token-xyz");
  });

  it("claimAction omits Authorization header when no piAccessToken (demo wallet)", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";

    // Connect via demo wallet (no piAccessToken is set in this path)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "u-notoken",
          walletAddress: "demo:claimnotoken",
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

    // claimAction endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        newBalance: 50,
        tier: "Visitor",
        xpEarned: 50,
      }),
    });

    let contextValue: any;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    // Connect via demo path (button click in external browser)
    await act(async () => {
      getByTestId("connect-btn").click();
    });
    await waitFor(() => expect(contextValue.isConnecting).toBe(false));
    expect(contextValue.user).not.toBeNull();

    let claimed: boolean | undefined;
    await act(async () => {
      claimed = await contextValue.claimAction("SOCIAL_CONNECT");
    });

    expect(claimed).toBe(true);
    const claimCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/action/claim",
    );
    expect(claimCall).toBeDefined();
    expect(claimCall![1].headers["Authorization"]).toBeUndefined();
  });

  it("claimAction returns false and sets error when API returns non-ok", async () => {
    process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET = "true";

    // Connect via demo path
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          userId: "u-claimerr",
          walletAddress: "demo:claimerr",
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

    // claimAction returns error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Action already claimed" }),
    });

    let contextValue: any;
    const { getByTestId } = render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>,
    );

    await waitFor(() => expect(contextValue.isLoading).toBe(false));

    await act(async () => {
      getByTestId("connect-btn").click();
    });
    await waitFor(() => expect(contextValue.isConnecting).toBe(false));
    expect(contextValue.user).not.toBeNull();

    let claimed: boolean | undefined;
    await act(async () => {
      claimed = await contextValue.claimAction("ALREADY_DONE");
    });

    expect(claimed).toBe(false);
    await waitFor(() => {
      expect(contextValue.error).toBe("Action already claimed");
    });
  });
});
