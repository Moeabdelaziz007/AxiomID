/**
 * Tests for the PassportHero sub-component inside src/app/page.tsx.
 *
 * PassportHero is not exported, so we render the Home page with a mocked
 * useWallet hook and assert on the rendered output that corresponds to the
 * changes introduced in this PR:
 *
 * - avatarText  : "?" when no user, first letter of piUsername, or "👤"
 * - username    : "Connect Wallet" when no user, piUsername or derived from walletAddress
 * - displayAddress: "did:axiom:..." when no user, or truncated walletAddress
 * - badge class : badge-pending when no user, badge-verified when user exists
 * - bottom-bar tier: "v1.0" when no user, or user.tier.toUpperCase()
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

// Stub next/link so it renders as a plain anchor in jsdom
jest.mock("next/link", () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return Link;
});

// Mock useWallet so we control which user data the component receives
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
    levelProgress: 0,
    nextXP: null,
    walletLogs: [],
    runWalletTest: jest.fn(),
    clearWalletLogs: jest.fn(),
    disconnectWallet: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useWallet>;
}

describe("PassportHero — no user (unauthenticated)", () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx());
  });

  it("shows '?' as the avatar when there is no user", () => {
    render(<Home />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("shows 'Connect Wallet' as the username when there is no user", () => {
    render(<Home />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("shows 'did:axiom:...' as the display address when there is no user", () => {
    render(<Home />);
    expect(screen.getByText("did:axiom:...")).toBeInTheDocument();
  });

  it("shows 'v1.0' in the bottom bar when there is no user (no tier)", () => {
    render(<Home />);
    const matches = screen.getAllByText("v1.0");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders both KYA and KYC badges", () => {
    render(<Home />);
    expect(screen.getByText("KYA")).toBeInTheDocument();
    expect(screen.getByText("KYC")).toBeInTheDocument();
  });
});

describe("PassportHero — user with piUsername", () => {
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

  it("shows the first letter of piUsername (uppercased) as avatar text", () => {
    render(<Home />);
    const matches = screen.getAllByText("A");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows piUsername as the heading", () => {
    render(<Home />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows the walletAddress as the display address (short enough, not truncated)", () => {
    render(<Home />);
    // "pi:piuser123" is 12 chars — under 20 — should appear as-is
    expect(screen.getByText("pi:piuser123")).toBeInTheDocument();
  });

  it("shows the tier uppercased in the bottom bar", () => {
    render(<Home />);
    expect(screen.getByText("CITIZEN")).toBeInTheDocument();
  });
});

describe("PassportHero — user without piUsername (walletAddress only)", () => {
  const user = {
    id: "user-2",
    walletAddress: "pi:abc123def456",
    piUsername: null,
    xp: 0,
    tier: "Visitor" as Tier,
    trustScore: 0,
    createdAt: new Date().toISOString(),
    actions: [],
    agent: null,
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
  });

  it("shows '👤' as avatar when user has no piUsername", () => {
    render(<Home />);
    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("derives username from walletAddress (strips 'pi:' prefix)", () => {
    render(<Home />);
    // walletAddress is "pi:abc123def456" → slice(3) = "abc123def456"
    expect(screen.getByText("abc123def456")).toBeInTheDocument();
  });
});

describe("PassportHero — long wallet address gets truncated", () => {
  const user = {
    id: "user-3",
    walletAddress: "demo:verylongwalletaddressthatexceedstwentycharacters",
    piUsername: null,
    xp: 0,
    tier: "Visitor" as Tier,
    trustScore: 0,
    createdAt: new Date().toISOString(),
    actions: [],
    agent: null,
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
  });

  it("truncates display address to first 8 + ... + last 6 chars", () => {
    render(<Home />);
    const addr = user.walletAddress;
    const expected = `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});

describe("PassportHero — demo wallet address (starts with 'demo:')", () => {
  const user = {
    id: "user-4",
    walletAddress: "demo:abc12345",
    piUsername: null,
    xp: 0,
    tier: "Visitor" as Tier,
    trustScore: 0,
    createdAt: new Date().toISOString(),
    actions: [],
    agent: null,
  };

  beforeEach(() => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
  });

  it("shows walletAddress as-is in username when it does not start with 'pi:'", () => {
    render(<Home />);
    const matches = screen.getAllByText("demo:abc12345");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});