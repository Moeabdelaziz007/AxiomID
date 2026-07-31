/**
 * Tests for src/app/dashboard/page.tsx
 *
 * Updated for 6-tab dashboard refactor:
 * - Tabs: home, identity, skills, wallet, memory, settings
 * - Thin orchestrator with tab delegation
 */

import React, { act } from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

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
  stamps: [],
  agent: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ skills: [] })
    })
  );
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("Dashboard page — loading state", () => {
  it("renders skeleton placeholder UI when isLoading is true", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ isLoading: true }));
    let container: HTMLElement;
    await act(async () => {
      const res = render(<Dashboard />);
      container = res.container;
    });
    const pulseElements = container!.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});

describe("Dashboard page — no user (unauthenticated)", () => {
  it("renders a 'CONNECT WALLET' button when user is null and not loading", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isLoading: false, isPiBrowser: true }));
    await act(async () => {
      render(<Dashboard />);
    });
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });
});

describe("Dashboard page — authenticated user content", () => {
  it("renders a welcome message that includes the user's piUsername", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });
    expect(screen.getByText(new RegExp(`hello.*${authenticatedUser.piUsername}`, "i"))).toBeInTheDocument();
  });

  it("shows the user's tier in the dashboard", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });
    const tierTexts = screen.getAllByText(authenticatedUser.tier);
    expect(tierTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the user's XP in the dashboard", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });
    const xpTexts = screen.getAllByText(String(authenticatedUser.xp));
    expect(xpTexts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Dashboard page — tab navigation", () => {
  // The page renders TWO tablists (desktop top bar + mobile bottom bar).
  // getAllByRole targets the first (desktop) tablist for state assertions.
  const firstTab = (name: RegExp) => screen.getAllByRole("tab", { name })[0];

  it("home tab is initially active (aria-selected=true)", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });

    expect(firstTab(/home/i)).toHaveAttribute("aria-selected", "true");
  });

  it("clicking Identity tab sets it as active", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });

    await act(async () => {
      firstTab(/identity/i).click();
    });

    expect(firstTab(/identity/i)).toHaveAttribute("aria-selected", "true");
  });

  it("all six page tabs are rendered", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });

    expect(screen.getAllByRole("tab", { name: /home/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /identity/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /skills/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /wallet/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /memory/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /settings/i }).length).toBeGreaterThan(0);
  });

  it("switching to a different tab deactivates the previously active tab", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser }));
    await act(async () => {
      render(<Dashboard />);
    });

    await act(async () => {
      firstTab(/skills/i).click();
    });

    expect(firstTab(/skills/i)).toHaveAttribute("aria-selected", "true");
    expect(firstTab(/home/i)).toHaveAttribute("aria-selected", "false");
  });
});
