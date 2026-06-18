/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { render, waitFor, act, screen } from "@testing-library/react";
import { SandboxProvider } from "@/app/context/sandbox-provider";
import { WalletProvider, useWallet } from "@/app/context/wallet-context";

jest.mock("@/lib/pi-sdk", () => {
  const actual = jest.requireActual("@/lib/pi-sdk");
  return {
    ...actual,
    connectPi: jest.fn(() => Promise.reject(
      new actual.PiSdkError(actual.PiSdkErrorCode.NOT_IN_PI_BROWSER, "Pi SDK authenticate function not available.")
    )),
  };
});


function FlowHarness() {
  const { user, isConnecting, connectWallet, error } = useWallet();

  return (
    <div>
      <h1 data-testid="title">Pi Sandbox Mainframe</h1>
      <div data-testid="user-address">{user ? user.walletAddress : "guest"}</div>
      <div data-testid="user-username">{user ? user.piUsername : "no-username"}</div>
      <div data-testid="connecting">{isConnecting ? "connecting" : "idle"}</div>
      {error && <div data-testid="error-message">{error}</div>}
      <button data-testid="connect-btn" onClick={connectWallet}>
        Connect Wallet
      </button>
    </div>
  );
}

describe("E2E Pi Sandbox WebView Flow", () => {
  const originalUserAgent = window.navigator.userAgent;
  const originalSandboxEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;
  const originalParent = window.parent;
  let mockFetch: jest.Mock;
  const originalAddEventListener = window.addEventListener;
  const listeners: { type: string; listener: any; options?: any }[] = [];

  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).Pi;
    process.env.NEXT_PUBLIC_PI_SANDBOX = "true";

    window.addEventListener = (type: string, listener: any, options?: any) => {
      listeners.push({ type, listener, options });
      originalAddEventListener.call(window, type, listener, options);
    };

    // Set User Agent to standard browser inside sandbox
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });

    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    listeners.forEach(({ type, listener, options }) => {
      window.removeEventListener(type, listener, options);
    });
    listeners.length = 0;

    jest.restoreAllMocks();
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalSandboxEnv;
    Object.defineProperty(window, "parent", {
      value: originalParent,
      writable: true,
      configurable: true,
    });
    delete (window as unknown as Record<string, unknown>).Pi;
    localStorage.clear();
  });

  it("should handle sandbox postMessage communications and allow connecting demo wallet in sandbox mode", async () => {
    const mockParent = {
      postMessage: jest.fn(),
    };

    // Simulate running inside an iframe sandbox
    Object.defineProperty(window, "parent", {
      value: mockParent,
      configurable: true,
    });

    const { unmount } = render(
      <SandboxProvider>
        <WalletProvider>
          <FlowHarness />
        </WalletProvider>
      </SandboxProvider>
    );

    // 1. Verify listeners are registered and sandbox reacts to app info requests
    const requestMsg = {
      type: "@pi:app:sdk:communication_information_request",
      id: "req-1",
      payload: { slug: "axiom-test", name: "Axiom Testing" },
    };

    const mockSource = {
      postMessage: jest.fn(),
    };

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify(requestMsg),
          origin: "https://app.minepi.com",
          source: mockSource,
        })
      );
    });

    // Verify sandbox sent back app details to origin
    expect(mockSource.postMessage).toHaveBeenCalled();
    const [responseStr, options] = mockSource.postMessage.mock.calls[0];
    const response = JSON.parse(responseStr);
    expect(response.type).toBe("@pi:app:sdk:communication_information_response");
    expect(response.payload.slug).toBe("axiom-test");
    expect(options.targetOrigin).toBe("https://app.minepi.com");

    // 2. Perform connection flow in sandbox mode
    // Mock the specific endpoints needed for connectDemoWallet
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/auth/state")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ state: "mock-state-token-123" }),
        });
      }
      if (url.includes("/api/auth/connect")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            userId: "sandbox-user-999",
            walletAddress: "demo:sandbox-1234",
            xp: 150,
            tier: "Citizen",
            createdAt: new Date().toISOString(),
            piUsername: "sandboxguy",
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });
    });

    // Click connect wallet button
    const connectButton = screen.getByTestId("connect-btn");
    await act(async () => {
      connectButton.click();
    });

    // Assert loading/connecting state resolves
    await waitFor(() => {
      expect(screen.getByTestId("user-address")).toHaveTextContent("demo:");
      expect(screen.getByTestId("user-username")).toHaveTextContent("sandboxguy");
    });

    // Verify localStorage has persisted the session
    expect(localStorage.getItem("axiomid_wallet")).toContain("demo:");

    unmount();
  });
});
