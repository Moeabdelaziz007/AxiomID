/**
 * Tests for src/app/status/page.tsx
 *
 * Focuses on the changed behaviour in this PR:
 * - averageTrustScore falls back to "—" when the API omits the field
 * - verificationRate falls back to "—" when the API omits the field
 * - Other fields still default to 0 when omitted
 * - Health endpoint provides service-level checks
 */

import React from "react";
import { render, waitFor, screen, act } from "@testing-library/react";
import StatusPage from "@/app/status/page";

// Mock useLanguage
jest.mock("@/app/context/language-context", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        status_network_title: "Network Status",
        status_network_desc: "Real-time monitoring of AxiomID protocol and agent network",
        status_retry: "RETRY",
        status_registered_agents: "REGISTERED AGENTS",
        status_active_onchain: "Active on-chain",
        status_total_transactions: "TOTAL TRANSACTIONS",
        status_pi_payments: "Pi payments processed",
        status_avg_trust: "AVG TRUST SCORE",
        status_network_safety: "Network safety index",
        status_active_agents: "ACTIVE AGENTS",
        status_executing_loops: "Currently executing loops",
        status_total_xp: "TOTAL XP EARNED",
        status_accumulated: "Accumulated rewards",
        status_verification_rate: "VERIFICATION RATE",
        status_kyc_index: "KYC success index",
        status_protocol_details: "PROTOCOL DETAILS",
        status_network: "Network",
        status_version: "Version",
        status_refreshed: "Refreshed",
        status_ago: "s ago",
        status_service_health: "SERVICE HEALTH",
        status_uptime: "UPTIME",
        status_manifest_api: "AGENT MANIFEST API",
        status_manifest_desc: "Access any agent's JSON-LD identity manifest via the public API.",
        status_get: "GET",
        status_unable_load: "Unable to Load Status",
        status_could_not_fetch: "Could not fetch network statistics. Please try again later.",
      };
      return translations[key] || key;
    },
  }),
}));

// StatusPage is a client component that calls fetch internally
let mockFetch: jest.Mock;

beforeEach(() => {
  mockFetch = jest.fn();
  global.fetch = mockFetch;
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

function makeStatusResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    text: async () => "",
    json: async () => ({ stats: overrides }),
  };
}

function makeHealthResponse() {
  return {
    ok: true,
    text: async () => "",
    json: async () => ({
      status: "healthy",
      uptime: 100,
      services: [
        { name: "Database", status: "ONLINE", latencyMs: 12 },
        { name: "Stellar Network", status: "ONLINE", latencyMs: 200 },
        { name: "Pi Network", status: "ONLINE", latencyMs: 150 },
        { name: "Workers AI", status: "DEGRADED", latencyMs: 0 },
      ],
      timestamp: new Date().toISOString(),
    }),
  };
}

function mockBothCalls(statusOverrides: Record<string, unknown> = {}) {
  mockFetch
    .mockResolvedValueOnce(makeStatusResponse(statusOverrides))
    .mockResolvedValueOnce(makeHealthResponse());
}

describe("StatusPage — fallback default values (PR change)", () => {
  it("shows em-dash when API returns null for averageTrustScore", async () => {
    mockBothCalls({ averageTrustScore: null });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API omits averageTrustScore entirely", async () => {
    mockBothCalls({});

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API returns null for verificationRate", async () => {
    mockBothCalls({ verificationRate: null });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API omits verificationRate entirely", async () => {
    mockBothCalls({});

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("uses the real averageTrustScore from API when provided", async () => {
    mockBothCalls({ averageTrustScore: 72.5 });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("72.5%")).toBeInTheDocument();
    });
  });

  it("uses the real verificationRate from API when provided", async () => {
    mockBothCalls({ verificationRate: 88.1 });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("88.1%")).toBeInTheDocument();
    });
  });

  it("defaults totalAgents, totalPayments, activeAgents, totalXpEarned to 0 when omitted", async () => {
    mockBothCalls({});

    render(<StatusPage />);

    await waitFor(() => {
      // All zero-defaulted stats should show "0"
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("renders the error state when status fetch fails", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "Internal Server Error",
        json: async () => ({}),
      })
      .mockResolvedValueOnce(makeHealthResponse());

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Status")).toBeInTheDocument();
    });
  });

  it("renders the error state when fetch throws a network error", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(makeHealthResponse());

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Status")).toBeInTheDocument();
    });
  });

  it("polls for updated stats every 60 seconds", async () => {
    mockFetch
      .mockResolvedValueOnce(makeStatusResponse({ averageTrustScore: 50.0 }))
      .mockResolvedValueOnce(makeHealthResponse())
      .mockResolvedValueOnce(makeStatusResponse({ averageTrustScore: 55.0 }))
      .mockResolvedValueOnce(makeHealthResponse());

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    // Advance past the 60-second polling interval
    act(() => {
      jest.advanceTimersByTime(60001);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  it("displays service health checks from /api/health", async () => {
    mockBothCalls({});

    await act(async () => {
      render(<StatusPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("SERVICE HEALTH")).toBeInTheDocument();
      expect(screen.getByText("Database")).toBeInTheDocument();
      expect(screen.getByText("Stellar Network")).toBeInTheDocument();
      expect(screen.getByText("Pi Network")).toBeInTheDocument();
      expect(screen.getByText("Workers AI")).toBeInTheDocument();
      // Multiple ONLINE badges exist (hero + health cards), just verify health section renders
      expect(screen.getAllByText("ONLINE").length).toBeGreaterThanOrEqual(3);
    });
  });
});
