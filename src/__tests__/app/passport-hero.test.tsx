/**
 * Tests for the landing page (src/app/page.tsx) after Stitch UI rewrite.
 *
 * PassportHero was removed in the Stitch hero rewrite. These tests verify
 * the new Stitch hero layout: centered heading, CTAs, features, tiers.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button />,
}));

jest.mock("next/link", () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

import { useWallet } from "@/app/context/wallet-context";
import type { Tier } from "@/lib/tiers";
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function defaultWalletCtx(overrides: Partial<ReturnType<typeof useWallet>> = {}): ReturnType<typeof useWallet> {
  return {
    user: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    isPiBrowser: false,
    connectWallet: jest.fn(),
    claimAction: jest.fn(),
    refreshUser: jest.fn(),
    createAgent: jest.fn(),
    activateAgent: jest.fn(),
    pauseAgent: jest.fn(),
    claimKya: jest.fn(),
    levelProgress: 0,
    nextXP: null,
    walletLogs: [],
    runWalletTest: jest.fn(),
    clearWalletLogs: jest.fn(),
    logout: jest.fn(),
    disconnectWallet: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useWallet>;
}

describe("Landing page — Stitch hero", () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx());
  });

  it("renders the main heading", () => {
    render(<Home />);
    expect(screen.getByText(/Your Identity/)).toBeInTheDocument();
  });

  it("renders the Live on Pi Network badge", () => {
    render(<Home />);
    expect(screen.getByText("Live on Pi Network Mainnet")).toBeInTheDocument();
  });

  it("renders features section", () => {
    render(<Home />);
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("renders tier cards", () => {
    render(<Home />);
    expect(screen.getByText("Visitor")).toBeInTheDocument();
    expect(screen.getByText("Citizen")).toBeInTheDocument();
    expect(screen.getByText("Validator")).toBeInTheDocument();
    expect(screen.getByText("Sovereign")).toBeInTheDocument();
  });
});

describe("Landing page — authenticated user", () => {
  const user = {
    id: "user-1",
    walletAddress: "pi:piuser123",
    piUsername: "alice",
    xp: 100,
    tier: "Citizen" as Tier,
    trustScore: 10,
    createdAt: new Date().toISOString(),
    actions: [],
    agent: null,
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
  });

  it("renders LOGOUT button when authenticated", () => {
    render(<Home />);
    const logoutButtons = screen.getAllByRole("button", { name: /logout/i });
    expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders DASHBOARD link when authenticated", () => {
    render(<Home />);
    const dashboardLinks = screen.getAllByRole("link", { name: /dashboard/i });
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("calls logout when LOGOUT button is clicked", () => {
    const logoutFn = jest.fn();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user, logout: logoutFn }));
    render(<Home />);
    const logoutButtons = screen.getAllByRole("button", { name: /logout/i });
    logoutButtons[0].click();
    expect(logoutFn).toHaveBeenCalledTimes(1);
  });
});

describe("Landing page — unauthenticated user", () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
  });

  it("does NOT render a LOGOUT button when there is no user", () => {
    render(<Home />);
    expect(screen.queryByRole("button", { name: /logout/i })).toBeNull();
  });

  it("renders CONNECT button when there is no user", () => {
    render(<Home />);
    expect(screen.getAllByRole("button", { name: /connect/i }).length).toBeGreaterThanOrEqual(1);
  });
});
