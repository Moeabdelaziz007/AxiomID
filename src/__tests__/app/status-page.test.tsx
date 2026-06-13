/**
 * Tests for src/app/status/page.tsx
 *
 * Focuses on the changed behaviour in this PR:
 * - averageTrustScore falls back to "—" when the API omits the field
 * - verificationRate falls back to "—" when the API omits the field
 * - Other fields still default to 0 when omitted
 */

import React from "react";
import { render, waitFor, screen, act } from "@testing-library/react";
import StatusPage from "@/app/status/page";

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

function makeApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    text: async () => "",
    json: async () => ({ stats: overrides }),
  };
}

describe("StatusPage — fallback default values (PR change)", () => {
  it("shows em-dash when API returns null for averageTrustScore", async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse({ averageTrustScore: null })
    );

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API omits averageTrustScore entirely", async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse({}));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API returns null for verificationRate", async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse({ verificationRate: null })
    );

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows em-dash when API omits verificationRate entirely", async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse({}));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("uses the real averageTrustScore from API when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse({ averageTrustScore: 72.5 })
    );

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("72.5%")).toBeInTheDocument();
    });
  });

  it("uses the real verificationRate from API when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse({ verificationRate: 88.1 })
    );

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("88.1%")).toBeInTheDocument();
    });
  });

  it("defaults totalAgents, totalPayments, activeAgents, totalXpEarned to 0 when omitted", async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse({}));

    render(<StatusPage />);

    await waitFor(() => {
      // All zero-defaulted stats should show "0"
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("renders the error state when fetch fails (no stats shown)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Internal Server Error",
      json: async () => ({}),
    });

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Status")).toBeInTheDocument();
    });
  });

  it("renders the error state when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Status")).toBeInTheDocument();
    });
  });

  it("polls for updated stats every 30 seconds", async () => {
    // First call returns partial data, second call returns updated data
    mockFetch
      .mockResolvedValueOnce(makeApiResponse({ averageTrustScore: 50.0 }))
      .mockResolvedValueOnce(makeApiResponse({ averageTrustScore: 55.0 }));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    // Advance past the 30-second polling interval
    act(() => {
      jest.advanceTimersByTime(30001);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});