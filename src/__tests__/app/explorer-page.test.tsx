/**
 * Tests for src/app/explorer/page.tsx
 *
 * PR change: ExplorerPage now uses useLanguage() (t, language) for i18n.
 * Uses t() for stat labels (stat_users, stat_agents, total_xp, stat_tx),
 * and bilingual (language==="en") for headings and descriptions.
 *
 * Also tests: loading state, error state, empty state, data rendering,
 * and polling setup/cleanup.
 */

import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import ExplorerPage from "@/app/explorer/page";

// Mock Header and Footer
jest.mock("@/components/Header", () => {
  const Header = () => null;
  Header.displayName = "Header";
  return Header;
});
jest.mock("@/components/Footer", () => {
  const Footer = () => null;
  Footer.displayName = "Footer";
  return Footer;
});

// Mock NetworkGraph (dynamic import with ssr:false)
jest.mock("@/components/ui/NetworkGraph", () => {
  const NetworkGraph = ({ nodes }: { nodes: unknown[] }) => (
    <div data-testid="network-graph" data-node-count={nodes.length} />
  );
  NetworkGraph.displayName = "NetworkGraph";
  return NetworkGraph;
});

// Mock AnimatedCounter (used for live stats)
jest.mock("@/components/AnimatedCounter", () => ({
  AnimatedCounter: ({ target }: { target: number }) => (
    <span data-testid="animated-counter">{target}</span>
  ),
}));

// useLanguage is globally mocked in jest.setup.js
// t("stat_users") → "stat_users", t("stat_agents") → "stat_agents",
// t("total_xp") → "total_xp", t("stat_tx") → "stat_tx"

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockExplorerData = {
  stats: {
    registeredUsers: 42,
    totalAgents: 18,
    activeAgents: 7,
    totalPayments: 130,
    totalXpEarned: 5000,
  },
  recentPayments: [
    {
      id: "pay-1",
      amount: 1.5,
      status: "COMPLETED",
      memo: "Test payment",
      createdAt: new Date("2026-06-01T12:00:00Z").toISOString(),
      user: { piUsername: "alice", walletAddress: "GABC1234" },
    },
  ],
  activeNodes: [
    {
      id: "node-1",
      piUsername: "alice",
      walletAddress: "GABC1234",
      did: "did:pi:alice",
      tier: "Citizen" as const,
      xp: 200,
      agent: { name: "alice-agent", status: "ACTIVE" },
    },
  ],
  tierDistribution: {
    Visitor: 20,
    Citizen: 15,
    Validator: 5,
    Sovereign: 2,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ExplorerPage — loading state", () => {
  it("renders without crashing", () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    expect(() => render(<ExplorerPage />)).not.toThrow();
  });

  it("shows loading skeleton initially before fetch resolves", () => {
    // Never resolves — keep loading
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ExplorerPage />);
    // Skeleton has animate-pulse class
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders PROTOCOL EXPLORER badge", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("PROTOCOL EXPLORER")).toBeInTheDocument();
    });
  });

  it("renders 'Live Identity Ledger' heading in English", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Live Identity Ledger")).toBeInTheDocument();
    });
  });

  it("renders NETWORK STATUS: ONLINE badge", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("ONLINE")).toBeInTheDocument();
    });
  });
});

describe("ExplorerPage — data state (PR change: t() for stat labels)", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
  });

  it("renders t('stat_users') as stat label", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      // Global mock returns key string for unknown keys
      expect(screen.getByText("stat_users")).toBeInTheDocument();
    });
  });

  it("renders t('stat_agents') as stat label", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("stat_agents")).toBeInTheDocument();
    });
  });

  it("renders t('total_xp') as stat label", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("total_xp")).toBeInTheDocument();
    });
  });

  it("renders t('stat_tx') as stat label", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("stat_tx")).toBeInTheDocument();
    });
  });

  it("renders AnimatedCounter with registeredUsers value", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      const counters = screen.getAllByTestId("animated-counter");
      const values = counters.map((el) => el.textContent);
      expect(values).toContain("42");
    });
  });

  it("renders AnimatedCounter with totalXpEarned value", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      const counters = screen.getAllByTestId("animated-counter");
      const values = counters.map((el) => el.textContent);
      expect(values).toContain("5000");
    });
  });

  it("renders NetworkGraph with active nodes", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      const graph = screen.getByTestId("network-graph");
      expect(graph).toBeInTheDocument();
      expect(graph.getAttribute("data-node-count")).toBe("1");
    });
  });

  it("renders tier distribution section headings", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Identity Tier Distribution")).toBeInTheDocument();
    });
  });

  it("renders all four tier labels in distribution section", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("SOVEREIGN")).toBeInTheDocument();
      expect(screen.getByText("VALIDATOR")).toBeInTheDocument();
      expect(screen.getByText("CITIZEN")).toBeInTheDocument();
      expect(screen.getByText("VISITOR")).toBeInTheDocument();
    });
  });

  it("renders Recent Payments Ledger section", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Recent Payments Ledger")).toBeInTheDocument();
    });
  });

  it("renders the payment amount from recent payments", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("+1.5 PI")).toBeInTheDocument();
    });
  });

  it("renders payment user's piUsername", async () => {
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("@alice")).toBeInTheDocument();
    });
  });
});

describe("ExplorerPage — empty state (registeredUsers = 0)", () => {
  it("renders 'No Agents Registered Yet' when registeredUsers is 0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplorerData,
        stats: { ...mockExplorerData.stats, registeredUsers: 0 },
      }),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("No Agents Registered Yet")).toBeInTheDocument();
    });
  });

  it("renders 'Launch App' link in empty state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplorerData,
        stats: { ...mockExplorerData.stats, registeredUsers: 0 },
      }),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Launch App")).toBeInTheDocument();
    });
  });
});

describe("ExplorerPage — error state", () => {
  it("renders error heading when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Unable to Fetch Explorer Data")).toBeInTheDocument();
    });
  });

  it("renders the error message", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders RETRY button in error state", async () => {
    mockFetch.mockRejectedValue(new Error("fail"));
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  it("renders error state when fetch returns non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Unable to Fetch Explorer Data")).toBeInTheDocument();
    });
  });
});

describe("ExplorerPage — payments section edge cases", () => {
  it("renders 'No payments found on ledger' when recentPayments is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplorerData,
        recentPayments: [],
      }),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("No payments found on ledger")).toBeInTheDocument();
    });
  });

  it("renders wallet address fallback when piUsername is null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplorerData,
        recentPayments: [
          {
            id: "pay-2",
            amount: 2,
            status: "COMPLETED",
            memo: null,
            createdAt: new Date().toISOString(),
            user: { piUsername: null, walletAddress: "GXYZ987654321" },
          },
        ],
      }),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      // Shows first 10 chars of walletAddress when piUsername is null
      expect(screen.getByText("@GXYZ987654")).toBeInTheDocument();
    });
  });

  it("renders 'Gas Fee Payment' as fallback memo when memo is null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplorerData,
        recentPayments: [
          {
            id: "pay-3",
            amount: 0.5,
            status: "COMPLETED",
            memo: null,
            createdAt: new Date().toISOString(),
            user: { piUsername: "bob", walletAddress: "GABC000" },
          },
        ],
      }),
    });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("Gas Fee Payment")).toBeInTheDocument();
    });
  });
});

describe("ExplorerPage — polling behavior (PR change)", () => {
  it("calls fetch again after 15 seconds (polling interval)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    render(<ExplorerPage />);

    // Wait for initial fetch
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Advance 15 seconds
    act(() => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("stops polling on component unmount", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    const { unmount } = render(<ExplorerPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    unmount();

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should still be only 1 call (no polling after unmount)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("ExplorerPage — Arabic language (bilingual PR change)", () => {
  it("renders Arabic heading when language='ar'", async () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValue({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    mockFetch.mockResolvedValue({ ok: true, json: async () => mockExplorerData });
    render(<ExplorerPage />);
    await waitFor(() => {
      expect(screen.getByText("مستكشف الهوية المباشر")).toBeInTheDocument();
    });
  });
});