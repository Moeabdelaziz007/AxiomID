/**
 * Tests for src/components/landing/InteractiveCommandDemo.tsx
 *
 * The terminal queries the LIVE AxiomID API (GET /api/status,
 * GET /api/did-document, GET /api/explorer) and renders real response data
 * with a typewriter effect. Commands are gated so only the next command in
 * sequence can be triggered. global.fetch is mocked with realistic payloads
 * per endpoint so the tests exercise the real data-wiring paths.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InteractiveCommandDemo from "@/components/landing/InteractiveCommandDemo";

const mockStatus = {
  network: "axiomid",
  version: "1.0.0",
  timestamp: "2026-08-02T00:00:00.000Z",
  stats: {
    registeredUsers: 1200,
    totalAgents: 45,
    activeAgents: 12,
    totalPayments: 300,
    totalXpEarned: 50000,
    activeUsers: 15,
    averageTrustScore: 82,
    verificationRate: 60,
  },
};

const mockDidDocument = {
  id: "did:axiom:issuer:mainnet",
  verificationMethod: [
    { id: "did:axiom:issuer:mainnet#key-1", type: "Ed25519VerificationKey2020" },
  ],
  service: [
    { id: "did:axiom:issuer:mainnet#passport", type: "AxiomPassport", serviceEndpoint: "https://axiomid.app/passport" },
  ],
};

const mockExplorer = {
  stats: { registeredUsers: 1200, totalAgents: 45, activeAgents: 12, totalPayments: 300, totalXpEarned: 50000 },
  recentPayments: [
    { amount: 5, status: "COMPLETED", memo: "stamp claim", user: { piUsername: "pioneer", walletAddress: "GBX7..." } },
  ],
  activeNodes: [
    { piUsername: "pioneer", did: "did:axiom:usr_pioneer", tier: "Citizen", xp: 2500, agent: { name: "Sentinel", status: "ACTIVE" } },
  ],
  tierDistribution: { Visitor: 800, Citizen: 300, Validator: 80, Sovereign: 20 },
};

const KNOWN_PATHS: Record<string, unknown> = {
  "/api/status": mockStatus,
  "/api/did-document": mockDidDocument,
  "/api/explorer": mockExplorer,
};

function installFetchMock() {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const path = Object.keys(KNOWN_PATHS).find((p) => url.includes(p));
    if (!path) {
      return Promise.resolve({
        ok: false,
        json: async () => ({ error: "not found" }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: async () => KNOWN_PATHS[path],
    } as Response);
  }) as jest.Mock;
}

describe("InteractiveCommandDemo — command loop", () => {
  let scrollIntoViewMock: jest.Mock;

  beforeAll(() => {
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    installFetchMock();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    (global.fetch as jest.Mock).mockClear();
  });

  async function runStep() {
    // Covers fetch resolution (microtasks) plus the typewriter interval
    // (15-40ms/char) and 120ms inter-line pauses for the longest command.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(15000);
    });
  }

  it("renders the heading, intro log line, and all three command buttons", () => {
    render(<InteractiveCommandDemo />);
    expect(screen.getByText("Agent Command Loop")).toBeInTheDocument();
    expect(
      screen.getByText("AxiomID Agent Protocol v1.0 — live terminal (real API data)")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect to network/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify DID compliance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inspect agent registry/i })).toBeInTheDocument();
  });

  it("only enables the first command button on initial render", () => {
    render(<InteractiveCommandDemo />);
    expect(screen.getByRole("button", { name: /connect to network/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /verify DID compliance/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /inspect agent registry/i })).toBeDisabled();
  });

  it("shows an idle terminal prompt before any command has run", () => {
    const { container } = render(<InteractiveCommandDemo />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("running the first command fetches /api/status and renders real network stats", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/status"),
      expect.anything()
    );
    expect(screen.getByText("✓ Network axiomid v1.0.0 online")).toBeInTheDocument();
    expect(screen.getByText("✓ 1,200 registered identities")).toBeInTheDocument();
    expect(screen.getByText("✓ 45 agents deployed (12 ACTIVE)")).toBeInTheDocument();
    expect(screen.getByText("Network handshake complete.")).toBeInTheDocument();

    // Completed step is now locked (already done) and disabled…
    expect(screen.getByRole("button", { name: /connect to network/i })).toBeDisabled();
    // …while the next step becomes available.
    expect(screen.getByRole("button", { name: /verify DID compliance/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /inspect agent registry/i })).toBeDisabled();
  });

  it("marks a completed command button with the done styling", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();

    expect(screen.getByRole("button", { name: /connect to network/i }).className).toContain(
      "bg-neon-green/10"
    );
  });

  it("does not start a command out of order (clicking a locked future step has no effect)", () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /inspect agent registry/i }));

    expect(screen.queryByText(/\$ inspect agent registry/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect to network/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /verify DID compliance/i })).toBeDisabled();
  });

  it("renders the input log line (prefixed with $) once a command has run", async () => {
    const { container } = render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();

    const inputLines = Array.from(container.querySelectorAll(".text-white")).filter(
      (el) => el.textContent === "connect to network"
    );
    expect(inputLines.length).toBe(1);
  });

  it("runs all three commands in sequence and shows the completion summary with a working /claim link", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();

    fireEvent.click(screen.getByRole("button", { name: /verify DID compliance/i }));
    await runStep();

    fireEvent.click(screen.getByRole("button", { name: /inspect agent registry/i }));
    await runStep();

    expect(
      screen.getByText(/Live network verified — these queries ran against the real AxiomID API\./i)
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /try it for real/i });
    expect(link).toHaveAttribute("href", "/claim");

    expect(screen.getByRole("button", { name: /connect to network/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /verify DID compliance/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /inspect agent registry/i })).toBeDisabled();
  });

  it("renders the verify command output from the real DID document response", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();
    fireEvent.click(screen.getByRole("button", { name: /verify DID compliance/i }));
    await runStep();

    expect(screen.getByText("✓ DID resolved: did:axiom:issuer:mainnet")).toBeInTheDocument();
    expect(
      screen.getByText("✓ Verification method: did:axiom:issuer:mainnet#key-1")
    ).toBeInTheDocument();
    expect(screen.getByText("W3C DID compliance verified on-chain.")).toBeInTheDocument();
  });

  it("renders the deploy command output from the real explorer response", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();
    fireEvent.click(screen.getByRole("button", { name: /verify DID compliance/i }));
    await runStep();
    fireEvent.click(screen.getByRole("button", { name: /inspect agent registry/i }));
    await runStep();

    expect(screen.getByText("✓ 1 live agent nodes")).toBeInTheDocument();
    expect(
      screen.getByText("✓ Tiers — Visitor 800 · Citizen 300 · Validator 80 · Sovereign 20")
    ).toBeInTheDocument();
    expect(screen.getByText("✓ Top node: @pioneer (Sentinel, XP 2500)")).toBeInTheDocument();
    expect(screen.getByText("✓ Latest payment: 5 Pi — stamp claim")).toBeInTheDocument();
  });

  it("keeps the previously logged commands visible after running subsequent ones", async () => {
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();
    fireEvent.click(screen.getByRole("button", { name: /verify DID compliance/i }));
    await runStep();

    // Output from the first command should still be present in the log.
    expect(screen.getByText("Network handshake complete.")).toBeInTheDocument();
    // As well as the newly logged output from the second command.
    expect(screen.getByText("W3C DID compliance verified on-chain.")).toBeInTheDocument();
  });

  it("scrolls the log into view as new output is streamed", async () => {
    render(<InteractiveCommandDemo />);
    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("renders the terminal window chrome (traffic-light dots and live title)", () => {
    render(<InteractiveCommandDemo />);
    expect(screen.getByText("agent-command-loop — live")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows an error line when the API fails", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "INTERNAL_ERROR" }),
      } as Response)
    );
    render(<InteractiveCommandDemo />);

    fireEvent.click(screen.getByRole("button", { name: /connect to network/i }));
    await runStep();

    expect(screen.getByText("✗ INTERNAL_ERROR")).toBeInTheDocument();
    // Step stays locked (not completed) so the user can retry.
    expect(screen.getByRole("button", { name: /connect to network/i })).toBeEnabled();
  });
});
