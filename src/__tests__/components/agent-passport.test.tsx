/**
 * Tests for src/components/AgentPassport.tsx
 *
 * PR changes:
 * - Copy DID button: emoji "📋" replaced with <Copy className="w-3.5 h-3.5" /> Lucide icon
 * - Copy Wallet Address button: emoji "📋" replaced with <Copy className="w-3.5 h-3.5" /> Lucide icon
 * - SYSTEM MODULES label: emoji "⚡" replaced with <Zap className="w-3 h-3 inline mr-1" /> Lucide icon
 * - WORLD ID slot icon: emoji "👁️" replaced with <Eye className="w-3 h-3" /> Lucide icon
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentPassport } from "@/components/AgentPassport";
import type { Tier } from "@/lib/tiers";

// Stub dependencies that have canvas or complex setup
jest.mock("@/components/VerificationBadge", () => ({
  VerificationBadge: ({ type, status }: { type: string; status: string }) => (
    <div data-testid={`verification-badge-${type}`} data-status={status} />
  ),
}));

jest.mock("@/components/TrustScoreGauge", () => ({
  TrustScoreGauge: ({ score }: { score: number }) => (
    <div data-testid="trust-score-gauge" data-score={score} />
  ),
}));

const defaultProps = {
  username: "testuser",
  walletAddress: "pi:testuid123",
  stellarAddress: null,
  tier: "Citizen" as Tier,
  trustScore: 75,
  kyaStatus: "verified" as const,
  kycStatus: "verified" as const,
  issuedDate: "2024-01-15T00:00:00.000Z",
  did: "did:axiom:pi:testuid123",
  xp: 500,
};

// ─────────────────────────────────────────────────────────────────────────────
// Copy DID button — PR change: "📋" emoji → <Copy /> Lucide SVG icon
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — Copy DID button (PR change: emoji → Lucide SVG)", () => {
  it("renders the Copy DID button with aria-label 'Copy DID'", () => {
    render(<AgentPassport {...defaultProps} />);
    expect(screen.getByRole("button", { name: /copy did/i })).toBeInTheDocument();
  });

  it("Copy DID button renders an SVG icon, not emoji text", () => {
    render(<AgentPassport {...defaultProps} />);
    const copyDidButton = screen.getByRole("button", { name: /copy did/i });
    expect(copyDidButton.querySelector("svg")).toBeInTheDocument();
    // Old emoji "📋" should NOT appear as text
    expect(copyDidButton.textContent).not.toContain("📋");
  });

  it("Copy DID button calls navigator.clipboard.writeText with the DID on click", () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(<AgentPassport {...defaultProps} did="did:axiom:pi:testuid123" />);
    fireEvent.click(screen.getByRole("button", { name: /copy did/i }));

    expect(writeTextMock).toHaveBeenCalledWith("did:axiom:pi:testuid123");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Copy Wallet Address button — PR change: "📋" emoji → <Copy /> Lucide SVG icon
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — Copy Wallet Address button (PR change: emoji → Lucide SVG)", () => {
  it("renders the Copy Wallet Address button with aria-label when walletAddress is present", () => {
    render(<AgentPassport {...defaultProps} walletAddress="pi:testuid123" />);
    expect(screen.getByRole("button", { name: /copy wallet address/i })).toBeInTheDocument();
  });

  it("Copy Wallet Address button renders an SVG icon, not emoji text", () => {
    render(<AgentPassport {...defaultProps} walletAddress="pi:walletabc" />);
    const copyWalletButton = screen.getByRole("button", { name: /copy wallet address/i });
    expect(copyWalletButton.querySelector("svg")).toBeInTheDocument();
    expect(copyWalletButton.textContent).not.toContain("📋");
  });

  it("prefers stellarAddress over walletAddress when both are provided", () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(
      <AgentPassport
        {...defaultProps}
        walletAddress="pi:testuid123"
        stellarAddress="GSTELLAR123ABCDEF"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /copy wallet address/i }));
    // Should copy stellarAddress, not walletAddress
    expect(writeTextMock).toHaveBeenCalledWith("GSTELLAR123ABCDEF");
  });

  it("does not render Copy Wallet Address button when both walletAddress and stellarAddress are null", () => {
    render(<AgentPassport {...defaultProps} walletAddress={null} stellarAddress={null} />);
    expect(screen.queryByRole("button", { name: /copy wallet address/i })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM MODULES header — PR change: "⚡" emoji → <Zap /> Lucide SVG icon
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — SYSTEM MODULES Zap icon (PR change: emoji → Lucide SVG)", () => {
  it("renders 'SYSTEM MODULES' label in the passport card", () => {
    render(<AgentPassport {...defaultProps} />);
    expect(screen.getByText(/system modules/i)).toBeInTheDocument();
  });

  it("renders an SVG element near the SYSTEM MODULES label (Zap icon)", () => {
    render(<AgentPassport {...defaultProps} />);
    const modulesLabel = screen.getByText(/system modules/i);
    const parentSpan = modulesLabel.closest("span");
    expect(parentSpan).not.toBeNull();
    expect(parentSpan?.querySelector("svg")).toBeInTheDocument();
  });

  it("does not render '⚡' emoji text in the SYSTEM MODULES section", () => {
    const { container } = render(<AgentPassport {...defaultProps} />);
    // The old "⚡" emoji should not appear as a text node
    expect(container.textContent).not.toContain("⚡");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WORLD ID slot — PR change: "👁️" emoji → <Eye /> Lucide SVG icon
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — WORLD ID Eye icon (PR change: emoji → Lucide SVG)", () => {
  it("renders 'WORLD ID' text in the system modules grid", () => {
    render(<AgentPassport {...defaultProps} />);
    expect(screen.getByText("WORLD ID")).toBeInTheDocument();
  });

  it("renders an SVG element in the WORLD ID slot (Eye icon)", () => {
    render(<AgentPassport {...defaultProps} />);
    const worldIdText = screen.getByText("WORLD ID");
    const parentDiv = worldIdText.closest("div");
    expect(parentDiv).not.toBeNull();
    expect(parentDiv?.querySelector("svg")).toBeInTheDocument();
  });

  it("does not render '👁️' emoji text for the WORLD ID slot icon", () => {
    const { container } = render(<AgentPassport {...defaultProps} />);
    expect(container.textContent).not.toContain("👁️");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// General rendering — ensure core identity data still renders correctly
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — core identity rendering", () => {
  it("renders the username", () => {
    render(<AgentPassport {...defaultProps} username="axiomuser" />);
    expect(screen.getByText("axiomuser")).toBeInTheDocument();
  });

  it("renders the DID text", () => {
    render(<AgentPassport {...defaultProps} did="did:axiom:pi:abc123" />);
    expect(screen.getByText("did:axiom:pi:abc123")).toBeInTheDocument();
  });

  it("renders the tier badge text", () => {
    render(<AgentPassport {...defaultProps} tier="Sovereign" />);
    expect(screen.getByText(/sovereign/i)).toBeInTheDocument();
  });

  it("renders the TrustScoreGauge with the correct score", () => {
    render(<AgentPassport {...defaultProps} trustScore={88} />);
    const gauge = screen.getByTestId("trust-score-gauge");
    expect(gauge).toBeInTheDocument();
    expect(gauge.getAttribute("data-score")).toBe("88");
  });

  it("renders the XP value", () => {
    render(<AgentPassport {...defaultProps} xp={1250} />);
    expect(screen.getByText("1,250")).toBeInTheDocument();
  });

  it("renders agentName and agentStatus when both are provided", () => {
    render(
      <AgentPassport {...defaultProps} agentName="AxiomBot" agentStatus="ACTIVE" />
    );
    expect(screen.getByText("AxiomBot")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("does not render agent section when agentName is not provided", () => {
    render(<AgentPassport {...defaultProps} agentName={undefined} />);
    expect(screen.queryByText("ACTIVE")).toBeNull();
  });

  it("renders a short truncated address when walletAddress exceeds 20 chars", () => {
    render(
      <AgentPassport
        {...defaultProps}
        walletAddress="GAAAAABBBBBBCCCCCCDDDDDDEEEEEE"
        stellarAddress={null}
      />
    );
    // The shortened form contains "..." — look for an element with the address fragment
    const shortAddr = screen.getByText(/\.\.\./);
    expect(shortAddr).toBeInTheDocument();
  });
});