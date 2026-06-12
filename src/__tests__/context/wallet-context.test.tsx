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

  it("calls Pi.init if window.Pi is defined on mount", async () => {
    const mockInit = jest.fn();
    (window as unknown as Record<string, unknown>).Pi = {
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
    (window as unknown as Record<string, unknown>).Pi = {
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

    let contextValue: ReturnType<typeof useWallet> | undefined;
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

    let contextValue: ReturnType<typeof useWallet> | undefined;
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

  it("sets user correctly from demo auth (flat API response)", async () => {
    // Not in Pi Browser
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

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

    // No auto-connect for external browser, so click the button
    await act(async () => {
      getByTestId("connect-btn").click();
    });

    await waitFor(() => {
      expect(contextValue.user).not.toBeNull();
    });

    // Should have set the user from flat API response
    expect(contextValue.user.id).toBe("user-demo-1");
    expect(contextValue.user.walletAddress).toBe("demo:abc123");
    expect(contextValue.user.tier).toBe("Visitor");
    expect(contextValue.user.xp).toBe(5);
  });

  it("falls back to demo wallet when Pi SDK fails", async () => {
    // Simulate Pi Browser user agent
    setUserAgent("Pi Browser; Android; minepi");

    // connectPi fails
    mockConnectPi.mockRejectedValueOnce(new Error("Pi authentication failed: SDK error"));

    // Demo auth fallback
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: "user-fallback-1",
        walletAddress: "demo:fallback1",
        tier: "Visitor",
        xp: 0,
        did: null,
        kycStatus: null,
        isNewUser: true,
      }),
    });

    let contextValue: ReturnType<typeof useWallet> | undefined;
    render(
      <WalletProvider>
        <TestConsumer onUpdate={(val) => { contextValue = val; }} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    // connectPi was called but failed
    expect(mockConnectPi).toHaveBeenCalled();
    // Fallback to /api/auth/connect with demo wallet
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/connect", expect.objectContaining({
      method: "POST",
    }));
    // User should be set from demo response (flat mapping, NOT data.user)
    expect(contextValue.user).not.toBeNull();
    expect(contextValue.user.id).toBe("user-fallback-1");
    expect(contextValue.user.walletAddress).toBe("demo:fallback1");
  });
});
