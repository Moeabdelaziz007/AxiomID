/**
 * Tests for src/app/dashboard/page.tsx
 *
 * Covers the new UI behaviour added in this PR:
 * - shouldShowPiBrowserPrompt banner (when !isPiBrowser && !isDemoWalletEnabled)
 * - Error banner display
 * - "Demo Account" badge when isDemoWallet is true
 * - piUsername fallback to "Agent" when piUsername is null
 * - Connect button disabled state (isConnecting || shouldShowPiBrowserPrompt)
 * - Loading skeleton
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useWallet } from "@/app/context/wallet-context";
import Dashboard from "@/app/dashboard/page";

// ---------------------------------------------------------------------------
// Mock useWallet so tests do not spin up the real WalletProvider
// ---------------------------------------------------------------------------
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockConnectWallet = jest.fn();

const defaultWalletState = {
  user: null,
  isLoading: false,
  isConnecting: false,
  levelProgress: 0,
  error: null,
  isPiBrowser: false,
  isDemoWallet: false,
  isDemoWalletEnabled: false,
  connectWallet: mockConnectWallet,
  nextXP: null,
  walletLogs: [],
  claimAction: jest.fn(),
  refreshUser: jest.fn(),
  createAgent: jest.fn(),
  activateAgent: jest.fn(),
  pauseAgent: jest.fn(),
  runWalletTest: jest.fn(),
  clearWalletLogs: jest.fn(),
} as any;

function setWalletState(overrides: Partial<typeof defaultWalletState>) {
  mockUseWallet.mockReturnValue({ ...defaultWalletState, ...overrides });
}

beforeEach(() => {
  jest.clearAllMocks();
  setWalletState({});
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("Dashboard — loading state", () => {
  it("renders loading skeleton when isLoading is true", () => {
    setWalletState({ isLoading: true });
    render(<Dashboard />);
    // When loading, neither the connected user section nor the connect prompt should show
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.queryByText("Welcome to AxiomID")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Not-connected state: shouldShowPiBrowserPrompt
// ---------------------------------------------------------------------------

describe("Dashboard — Pi Browser prompt banner", () => {
  it("shows 'Demo wallet is disabled' text when not in Pi Browser and demo wallet is disabled", () => {
    setWalletState({ isPiBrowser: false, isDemoWalletEnabled: false });
    render(<Dashboard />);

    expect(
      screen.getByText("Demo wallet is disabled for this deployment."),
    ).toBeInTheDocument();
  });

  it("disables the connect button when shouldShowPiBrowserPrompt is true", () => {
    setWalletState({ isPiBrowser: false, isDemoWalletEnabled: false });
    render(<Dashboard />);

    const btn = screen.getByRole("button", { name: /CONNECT WALLET/i });
    expect(btn).toBeDisabled();
  });

  it("does NOT show Pi Browser prompt when isDemoWalletEnabled is true", () => {
    setWalletState({ isPiBrowser: false, isDemoWalletEnabled: true });
    render(<Dashboard />);

    expect(
      screen.queryByText("Demo wallet is disabled for this deployment."),
    ).toBeNull();
  });

  it("does NOT show Pi Browser prompt when isPiBrowser is true", () => {
    setWalletState({ isPiBrowser: true, isDemoWalletEnabled: false });
    render(<Dashboard />);

    expect(
      screen.queryByText("Demo wallet is disabled for this deployment."),
    ).toBeNull();
  });

  it("connect button is enabled when shouldShowPiBrowserPrompt is false and not connecting", () => {
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: true,
      isConnecting: false,
    });
    render(<Dashboard />);

    const btn = screen.getByRole("button", { name: /CONNECT WALLET/i });
    expect(btn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Not-connected state: error banner
// ---------------------------------------------------------------------------

describe("Dashboard — error banner", () => {
  it("shows error text when there is an error and shouldShowPiBrowserPrompt is false", () => {
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: true,
      error: "افتح التطبيق من Pi Browser",
    });
    render(<Dashboard />);

    expect(
      screen.getByText("افتح التطبيق من Pi Browser"),
    ).toBeInTheDocument();
  });

  it("does NOT show error banner when shouldShowPiBrowserPrompt is true (Pi prompt takes precedence)", () => {
    // shouldShowPiBrowserPrompt = true → the else branch (error) does not render
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: false,
      error: "some error message",
    });
    render(<Dashboard />);

    expect(
      screen.getByText("Demo wallet is disabled for this deployment."),
    ).toBeInTheDocument();
    expect(screen.queryByText("some error message")).toBeNull();
  });

  it("does not render an error container when error is null", () => {
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: true,
      error: null,
    });
    const { container } = render(<Dashboard />);

    // No element with the red error container classes should exist
    const errorBanner = container.querySelector(
      "[class*='bg-red-500']",
    );
    expect(errorBanner).toBeNull();
  });

  it("calls connectWallet when the connect button is clicked", () => {
    setWalletState({ isPiBrowser: false, isDemoWalletEnabled: true });
    render(<Dashboard />);

    fireEvent.click(screen.getByRole("button", { name: /CONNECT WALLET/i }));
    expect(mockConnectWallet).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Connecting state
// ---------------------------------------------------------------------------

describe("Dashboard — connecting state", () => {
  it("shows CONNECTING... label and disables button while isConnecting", () => {
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: true,
      isConnecting: true,
    });
    render(<Dashboard />);

    const btn = screen.getByRole("button", { name: /CONNECTING\.\.\./i });
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Logged-in state
// ---------------------------------------------------------------------------

const baseUser = {
  id: "user-1",
  walletAddress: "pi:uid-1",
  stellarAddress: null,
  xp: 250,
  tier: "Bronze" as any,
  trustScore: 25,
  createdAt: new Date().toISOString(),
  piUsername: "axiomuser",
  actions: [],
  agent: null,
};

describe("Dashboard — logged-in state", () => {
  it("shows welcome message with piUsername when user is logged in", () => {
    setWalletState({ user: baseUser, isDemoWallet: false });
    render(<Dashboard />);

    expect(screen.getByText("Welcome back, axiomuser")).toBeInTheDocument();
  });

  it("shows 'Agent' as fallback username when piUsername is null", () => {
    setWalletState({
      user: { ...baseUser, piUsername: null },
      isDemoWallet: false,
    });
    render(<Dashboard />);

    expect(screen.getByText("Welcome back, Agent")).toBeInTheDocument();
  });

  it("shows tier and XP in the agent stats section", () => {
    setWalletState({ user: baseUser, isDemoWallet: false });
    render(<Dashboard />);

    expect(screen.getByText("Bronze")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("does NOT show 'Demo Account' badge for a real Pi wallet", () => {
    setWalletState({ user: baseUser, isDemoWallet: false });
    render(<Dashboard />);

    expect(screen.queryByText("Demo Account")).toBeNull();
  });

  it("shows 'Demo Account' badge when isDemoWallet is true", () => {
    setWalletState({
      user: { ...baseUser, walletAddress: "demo:abc123" },
      isDemoWallet: true,
    });
    render(<Dashboard />);

    expect(screen.getByText("Demo Account")).toBeInTheDocument();
  });

  it("shows the production warning inside the Demo Account badge", () => {
    setWalletState({
      user: { ...baseUser, walletAddress: "demo:abc123" },
      isDemoWallet: true,
    });
    render(<Dashboard />);

    expect(
      screen.getByText("Not valid for production Pi Browser/App Studio use"),
    ).toBeInTheDocument();
  });

  it("renders the XP progress bar with the correct width from levelProgress", () => {
    setWalletState({ user: baseUser, isDemoWallet: false, levelProgress: 60 });
    render(<Dashboard />);

    const progressBar = document.querySelector(
      ".from-neon-green.to-electric-blue",
    ) as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe("60%");
  });

  it("shows level-progress bar with 0% width when levelProgress is 0", () => {
    setWalletState({ user: baseUser, isDemoWallet: false, levelProgress: 0 });
    render(<Dashboard />);

    const progressBar = document.querySelector(
      ".from-neon-green.to-electric-blue",
    ) as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe("0%");
  });
});

// ---------------------------------------------------------------------------
// Header always renders
// ---------------------------------------------------------------------------

describe("Dashboard — header", () => {
  it("always renders the AxiomID Dashboard header", () => {
    render(<Dashboard />);

    expect(screen.getByText("AxiomID Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Agent Identity Layer v1.0.0"),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Boundary / regression cases
// ---------------------------------------------------------------------------

describe("Dashboard — boundary cases", () => {
  it("connect button is disabled when isConnecting is true even with demo enabled", () => {
    setWalletState({
      isPiBrowser: false,
      isDemoWalletEnabled: true,
      isConnecting: true,
    });
    render(<Dashboard />);

    const btn = screen.getByRole("button", { name: /CONNECTING\.\.\./i });
    expect(btn).toBeDisabled();
  });

  it("shows 'Welcome to AxiomID' heading when user is not connected", () => {
    setWalletState({ user: null, isLoading: false });
    render(<Dashboard />);

    expect(screen.getByText("Welcome to AxiomID")).toBeInTheDocument();
  });

  it("does not show 'Welcome to AxiomID' when user IS connected", () => {
    setWalletState({ user: baseUser, isDemoWallet: false });
    render(<Dashboard />);

    expect(screen.queryByText("Welcome to AxiomID")).toBeNull();
  });
});