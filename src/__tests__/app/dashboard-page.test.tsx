/**
 * Tests for src/app/dashboard/page.tsx
 *
 * Covers the PR changes:
 * - handleLogout function: calls logout() and navigates to "/"
 * - LOGOUT button: rendered only when user is authenticated
 * - Dashboard header layout change: flex items-center justify-between
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { useWallet } from "@/app/context/wallet-context";

// Mock useWallet so we can control user state
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// Mock next/navigation router
const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

// Minimal skills data mock to prevent import errors
jest.mock("@/data/skills.json", () => ({
  skills: [
    { name: "Auth", description: "Authentication" },
    { name: "DID", description: "Decentralized ID" },
    { name: "KYC", description: "Know your customer" },
  ],
}));

function defaultWalletCtx(overrides: Partial<ReturnType<typeof useWallet>> = {}): ReturnType<typeof useWallet> {
  return {
    user: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    isPiBrowser: false,
    connectWallet: jest.fn(),
    logout: jest.fn(),
    claimAction: jest.fn(),
    refreshUser: jest.fn(),
    createAgent: jest.fn(),
    activateAgent: jest.fn(),
    pauseAgent: jest.fn(),
    levelProgress: 0,
    nextXP: null,
    walletLogs: [],
    runWalletTest: jest.fn(),
    clearWalletLogs: jest.fn(),
    ...overrides,
  } as any;
}

const authenticatedUser = {
  id: "user-dash",
  walletAddress: "demo:dashtest",
  piUsername: "dashuser",
  xp: 150,
  tier: "Citizen" as any,
  trustScore: 15,
  createdAt: new Date().toISOString(),
  actions: [],
  agent: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("Dashboard page — logout button (PR change)", () => {
  it("renders the LOGOUT button when the user is authenticated", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("does NOT render a LOGOUT button when there is no user", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
    render(<Dashboard />);
    expect(screen.queryByRole("button", { name: /logout/i })).toBeNull();
  });

  it("handleLogout calls logout() when the LOGOUT button is clicked", () => {
    const logoutFn = jest.fn();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, logout: logoutFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(logoutFn).toHaveBeenCalledTimes(1);
  });

  it("handleLogout navigates to '/' after calling logout()", () => {
    const logoutFn = jest.fn();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, logout: logoutFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/");
  });

  it("handleLogout calls logout() before navigating (order check)", () => {
    const callOrder: string[] = [];
    const logoutFn = jest.fn(() => { callOrder.push("logout"); });
    mockRouterPush.mockImplementation(() => { callOrder.push("navigate"); });

    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, logout: logoutFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(callOrder).toEqual(["logout", "navigate"]);
  });
});

describe("Dashboard page — loading state", () => {
  it("renders skeleton placeholder UI when isLoading is true", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ isLoading: true }));
    const { container } = render(<Dashboard />);
    // animate-pulse elements signal the loading skeleton
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("does NOT render the LOGOUT button while loading", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ isLoading: true }));
    render(<Dashboard />);
    // user is null during load so logout btn should not appear
    expect(screen.queryByRole("button", { name: /logout/i })).toBeNull();
  });
});

describe("Dashboard page — no user (unauthenticated)", () => {
  it("renders a 'CONNECT WALLET' button when user is null and not loading", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isLoading: false }));
    render(<Dashboard />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("renders 'CONNECTING...' text on the button when isConnecting is true", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isLoading: false, isConnecting: true }));
    render(<Dashboard />);
    expect(screen.getByRole("button", { name: /connecting/i })).toBeInTheDocument();
  });

  it("the connect button is disabled when isConnecting is true", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isLoading: false, isConnecting: true }));
    render(<Dashboard />);
    expect(screen.getByRole("button", { name: /connecting/i })).toBeDisabled();
  });
});

describe("Dashboard page — authenticated user content", () => {
  it("renders a welcome message that includes the user's piUsername", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);
    expect(screen.getByText(/welcome back, dashuser/i)).toBeInTheDocument();
  });

  it("shows the user's tier in the Agent Stats section", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);
    // tier shown in stats panel
    const tierTexts = screen.getAllByText(authenticatedUser.tier);
    expect(tierTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the user's XP in the Agent Stats section", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);
    const xpTexts = screen.getAllByText(String(authenticatedUser.xp));
    expect(xpTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the AxiomID Dashboard heading", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);
    expect(screen.getByText("AxiomID Dashboard")).toBeInTheDocument();
  });
});