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

  it("connects via Pi SDK when in Pi Browser and connectWallet is called", async () => {
    setUserAgent("Pi Browser; Android; minepi");
    
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

    mockConnectPi.mockRejectedValueOnce(new Error("Pi authentication failed: SDK error"));

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
});
