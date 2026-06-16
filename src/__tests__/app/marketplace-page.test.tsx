/**
 * Tests for src/app/dashboard/marketplace/page.tsx
 *
 * PR changes covered:
 * - useWallet integration: user, connectWallet, isConnecting
 * - Error state management (setError on fetch failure and install failure)
 * - Error banner rendering with dismiss button
 * - handleInstall: calls connectWallet() when user is null
 * - Install button text changes based on auth/connecting state
 * - Install button disabled when isConnecting is true
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketplacePage from "@/app/dashboard/marketplace/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

// Mock useWallet
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn() },
  writable: true,
});

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Dna: () => <svg data-testid="icon-dna" />,
  Download: () => <svg data-testid="icon-download" />,
  Star: () => <svg data-testid="icon-star" />,
  Coins: () => <svg data-testid="icon-coins" />,
  Package: () => <svg data-testid="icon-package" />,
}));

const mockSkill = {
  id: "skill-1",
  slug: "test-skill",
  name: "Test Skill",
  description: "A test skill",
  tier: "BASIC_TOOL",
  pricePi: 0,
  version: "1.0.0",
  installCount: 42,
  avgRating: 4.5,
  ratingCount: 10,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("MarketplacePage — initial load and error handling (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
  });

  it("shows loading skeleton on initial load", () => {
    // Never resolves to keep loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MarketplacePage />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders skills when fetch succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });
  });

  it("shows error banner when skills fetch fails (PR change: error state)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("error banner contains the error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/Failed to load skills \(500\)/);
    });
  });

  it("error banner has a DISMISS button (PR change)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    });
  });

  it("dismissing the error clears the error banner", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows network error in the error banner on fetch throw", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    render(<MarketplacePage />);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Network failure");
    });
  });
});

describe("MarketplacePage — install button state (PR change: wallet integration)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows 'CONNECT WALLET TO INSTALL' when no user and skill detail is open", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: false }));
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSkill,
          manifestMd: "# Test",
          agentScript: null,
          testSuite: null,
          status: "PUBLISHED",
          isPublished: true,
          installationCount: 42,
          reviewCount: 10,
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    // Open skill detail
    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connect wallet to install/i })).toBeInTheDocument();
    });
  });

  it("shows 'CONNECTING...' when isConnecting is true", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: true }));
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSkill,
          manifestMd: "# Test",
          agentScript: null,
          testSuite: null,
          status: "PUBLISHED",
          isPublished: true,
          installationCount: 42,
          reviewCount: 10,
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connecting/i })).toBeInTheDocument();
    });
  });

  it("install button is disabled when isConnecting is true (PR change)", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: true }));
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSkill,
          manifestMd: "# Test",
          agentScript: null,
          testSuite: null,
          status: "PUBLISHED",
          isPublished: true,
          installationCount: 42,
          reviewCount: 10,
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /connecting/i });
      expect(btn).toBeDisabled();
    });
  });
});

describe("MarketplacePage — handleInstall wallet flow (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls connectWallet() when user is null and install is triggered", async () => {
    const connectWalletFn = jest.fn();
    mockUseWallet.mockReturnValue(
      defaultWalletCtx({ user: null, connectWallet: connectWalletFn })
    );
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSkill,
          manifestMd: "# Test",
          agentScript: null,
          testSuite: null,
          status: "PUBLISHED",
          isPublished: true,
          installationCount: 42,
          reviewCount: 10,
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    // Open detail
    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /connect wallet to install/i })).toBeInTheDocument();
    });

    // Click install
    fireEvent.click(screen.getByRole("button", { name: /connect wallet to install/i }));

    expect(connectWalletFn).toHaveBeenCalledTimes(1);
  });

  it("shows install error in the error banner when install fails (PR change)", async () => {
    const mockUserObj = {
      id: "u1",
      walletAddress: "pi:user1",
      piUsername: "user1",
      xp: 0,
      tier: "Beginner" as const,
      trustScore: 0,
      createdAt: new Date().toISOString(),
      actions: [],
      stamps: [],
    };

    mockUseWallet.mockReturnValue(
      defaultWalletCtx({ user: mockUserObj })
    );
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSkill,
          manifestMd: "# Test",
          agentScript: null,
          testSuite: null,
          status: "PUBLISHED",
          isPublished: true,
          installationCount: 42,
          reviewCount: 10,
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      })
      .mockResolvedValueOnce({
        // install request fails
        ok: false,
        status: 403,
        json: async () => ({ error: "Permission denied" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
    });
  });
});

describe("MarketplacePage — empty state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx());
  });

  it("shows 'No Skills Available' when skills list is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("No Skills Available")).toBeInTheDocument();
    });
  });
});