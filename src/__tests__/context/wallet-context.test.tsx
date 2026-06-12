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
});

// -------------------------------------------------------------------------
// PR changes: logout function + did field on User
// -------------------------------------------------------------------------

describe("WalletProvider — logout function (PR addition)", () => {
  const originalSandboxEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    delete (window as any).Pi;
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalSandboxEnv;
    sessionStorage.clear();
  });

  function LogoutConsumer({ onUpdate }: { onUpdate: (val: ReturnType<typeof useWallet>) => void }) {
    const wallet = useWallet();
    React.useEffect(() => { onUpdate(wallet); }, [wallet, onUpdate]);
    return (
      <div>
        <div data-testid="user">{wallet.user ? wallet.user.walletAddress : "no-user"}</div>
        <button data-testid="logout-btn" onClick={wallet.logout}>Logout</button>
      </div>
    );
  }

  it("exposes a logout function in the context", async () => {
    let ctx: any;
    render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));
    expect(typeof ctx.logout).toBe("function");
  });

  it("logout clears axiomid_wallet from localStorage", async () => {
    localStorage.setItem("axiomid_wallet", "demo:logouttest");
    localStorage.setItem("pi_access_token", "tok-logout");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "logout-user",
        walletAddress: "demo:logouttest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: null,
        agent: null,
      }),
    });

    let ctx: any;
    const { getByTestId } = render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(ctx.user).not.toBeNull());

    await act(async () => {
      getByTestId("logout-btn").click();
    });

    expect(localStorage.getItem("axiomid_wallet")).toBeNull();
    expect(localStorage.getItem("pi_access_token")).toBeNull();
  });

  it("logout clears axiomid_wallet and pi_access_token from sessionStorage", async () => {
    sessionStorage.setItem("axiomid_wallet", "demo:session-test");
    sessionStorage.setItem("pi_access_token", "session-tok");

    let ctx: any;
    render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));

    await act(async () => {
      ctx.logout();
    });

    expect(sessionStorage.getItem("axiomid_wallet")).toBeNull();
    expect(sessionStorage.getItem("pi_access_token")).toBeNull();
  });

  it("logout sets user to null", async () => {
    localStorage.setItem("axiomid_wallet", "demo:nulltest");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "null-user",
        walletAddress: "demo:nulltest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: null,
        agent: null,
      }),
    });

    let ctx: any;
    const { getByTestId } = render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(ctx.user).not.toBeNull());

    await act(async () => {
      getByTestId("logout-btn").click();
    });

    await waitFor(() => expect(ctx.user).toBeNull());
  });

  it("logout clears the error state", async () => {
    let ctx: any;
    render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));

    await act(async () => {
      ctx.logout();
    });

    expect(ctx.error).toBeNull();
  });

  it("logout is idempotent: calling twice does not throw", async () => {
    let ctx: any;
    render(
      <WalletProvider>
        <LogoutConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false));

    await act(async () => { ctx.logout(); });
    await act(async () => { expect(() => ctx.logout()).not.toThrow(); });
  });
});

describe("WalletProvider — did field on User (PR addition)", () => {
  const originalSandboxEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    delete (window as any).Pi;
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalSandboxEnv;
  });

  function DidConsumer({ onUpdate }: { onUpdate: (val: ReturnType<typeof useWallet>) => void }) {
    const wallet = useWallet();
    React.useEffect(() => { onUpdate(wallet); }, [wallet, onUpdate]);
    return null;
  }

  it("populates user.did from the API response via buildUserFromApiData", async () => {
    localStorage.setItem("axiomid_wallet", "demo:didtest");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "did-user",
        walletAddress: "demo:didtest",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "diduser",
        did: "did:axiom:axiomid.app:demo-didtest",
        agent: null,
      }),
    });

    let ctx: any;
    render(
      <WalletProvider>
        <DidConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(ctx.isLoading).toBe(false));

    expect(ctx.user.did).toBe("did:axiom:axiomid.app:demo-didtest");
  });

  it("sets user.did to null when did is absent in the API response", async () => {
    localStorage.setItem("axiomid_wallet", "demo:nodid");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "nodid-user",
        walletAddress: "demo:nodid",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "nodiduser",
        // no 'did' key
        agent: null,
      }),
    });

    let ctx: any;
    render(
      <WalletProvider>
        <DidConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(ctx.isLoading).toBe(false));

    expect(ctx.user.did).toBeNull();
  });

  it("sets user.did to null when API returns did: null", async () => {
    localStorage.setItem("axiomid_wallet", "demo:nulldid");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "nulldid-user",
        walletAddress: "demo:nulldid",
        xp: 0,
        tier: "Visitor",
        trustScore: 0,
        createdAt: new Date().toISOString(),
        piUsername: "nulldiduser",
        did: null,
        agent: null,
      }),
    });

    let ctx: any;
    render(
      <WalletProvider>
        <DidConsumer onUpdate={(v) => { ctx = v; }} />
      </WalletProvider>
    );

    await waitFor(() => expect(ctx.isLoading).toBe(false));

    expect(ctx.user.did).toBeNull();
  });
});
