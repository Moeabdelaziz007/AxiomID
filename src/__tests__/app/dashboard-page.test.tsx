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
import { defaultWalletCtx } from "./wallet-test-helpers";

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

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle" />,
}));


import type { Tier } from "@/lib/tiers";

const authenticatedUser = {
  id: "user-dash",
  walletAddress: "demo:dashtest",
  piUsername: "dashuser",
  xp: 150,
  tier: "Citizen" as Tier,
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

  it("handleLogout calls disconnectWallet() when the LOGOUT button is clicked", () => {
    const disconnectFn = jest.fn();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, disconnectWallet: disconnectFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(disconnectFn).toHaveBeenCalledTimes(1);
  });

  it("handleLogout navigates to '/' after calling disconnectWallet()", () => {
    const disconnectFn = jest.fn();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, disconnectWallet: disconnectFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/");
  });

  it("handleLogout navigates before calling disconnectWallet() (order check)", () => {
    const callOrder: string[] = [];
    const disconnectFn = jest.fn(() => { callOrder.push("disconnectWallet"); });
    mockRouterPush.mockImplementation(() => { callOrder.push("navigate"); });

    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser, disconnectWallet: disconnectFn }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("button", { name: /logout/i }).click();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(callOrder).toEqual(["navigate", "disconnectWallet"]);
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

describe("Dashboard page — marketplace tab navigation (PR change)", () => {
  it("clicking Marketplace tab calls router.push('/dashboard/marketplace')", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);

    act(() => {
      screen.getByRole("tab", { name: /marketplace/i }).click();
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/dashboard/marketplace");
  });

  it("marketplace tab is rendered without 'disabled' attribute (PR change: removed disabled)", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);

    const marketplaceTab = screen.getByRole("tab", { name: /marketplace/i });
    expect(marketplaceTab).not.toBeDisabled();
  });

  it("marketplace tab does not show 'Coming Soon' tooltip text", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("marketplace tab is visible in the tab list", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);

    expect(screen.getByRole("tab", { name: /marketplace/i })).toBeInTheDocument();
  });

  it("marketplace tab click does not change the active tab (navigation leaves the page)", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    render(<Dashboard />);

    // Verify passport tab is initially active (aria-selected=true)
    const passportTab = screen.getByRole("tab", { name: /passport/i });
    expect(passportTab).toHaveAttribute("aria-selected", "true");

    act(() => {
      screen.getByRole("tab", { name: /marketplace/i }).click();
    });

    // Passport should still be selected because marketplace nav redirects away
    expect(passportTab).toHaveAttribute("aria-selected", "true");
  });
});