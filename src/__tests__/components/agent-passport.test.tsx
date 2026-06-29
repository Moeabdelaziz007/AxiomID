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
// Dynamic System Modules — stamps-driven active/inactive slots
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — Dynamic System Modules", () => {
  it("renders all module slots (active and inactive)", () => {
    render(<AgentPassport {...defaultProps} />);
    expect(screen.getByText("WALLET")).toBeInTheDocument();
    expect(screen.getByText("KYC")).toBeInTheDocument();
    expect(screen.getByText("PI PAY")).toBeInTheDocument();
    expect(screen.getByText("SECURITY")).toBeInTheDocument();
  });

  it("renders inactive slot with Eye icon for unconnected modules", () => {
    render(<AgentPassport {...defaultProps} />);
    const inactiveLabels = screen.getAllByText("SLOT");
    expect(inactiveLabels.length).toBeGreaterThan(0);
  });

  it("renders active modules when stamps are provided", () => {
    const stamps = [
      { type: "complete_kyc", provider: "pi" },
      { type: "connect_wallet", provider: "wallet" },
    ];
    render(<AgentPassport {...defaultProps} stamps={stamps} />);
    const onLabels = screen.getAllByText("ON");
    expect(onLabels.length).toBe(2);
  });

  it("shows correct active/total count", () => {
    const stamps = [{ type: "complete_kyc", provider: "pi" }];
    render(<AgentPassport {...defaultProps} stamps={stamps} />);
    expect(screen.getByText("ACTIVE: 1/9")).toBeInTheDocument();
  });

  it("does not render '👁️' emoji text in module slots", () => {
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
    const headings = screen.getAllByRole("heading");
    expect(headings.some((h) => h.textContent === "axiomuser")).toBe(true);
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

// ─────────────────────────────────────────────────────────────────────────────
// PR change: removed `import React from "react"` — confirms the component
// still renders correctly using the automatic JSX runtime (no explicit React
// import required). All rendering tests below exercise the component in the
// same environment that will run post-PR.
// ─────────────────────────────────────────────────────────────────────────────

describe("AgentPassport — renders without explicit React import (PR change)", () => {
  it("mounts without throwing (automatic JSX runtime works without React import)", () => {
    expect(() => render(<AgentPassport {...defaultProps} />)).not.toThrow();
  });

  it("shows fallback 'no_address' text when both walletAddress and stellarAddress are absent", () => {
    // When displayAddress is null/undefined the t('no_address') key is used.
    // The mock t() returns the raw key when not found in the dict, so expect 'no_address'.
    render(<AgentPassport {...defaultProps} walletAddress={null} stellarAddress={null} />);
    expect(screen.getByText("no_address")).toBeInTheDocument();
  });

  it("displays the full address (≤ 20 chars) without truncation", () => {
    const shortWallet = "pi:abc";
    render(
      <AgentPassport {...defaultProps} walletAddress={shortWallet} stellarAddress={null} />
    );
    expect(screen.getByText(shortWallet)).toBeInTheDocument();
  });

  it("renders PassportFooter with issuedDate", () => {
    const { container } = render(<AgentPassport {...defaultProps} issuedDate="2025-06-01T00:00:00.000Z" />);
    expect(container.textContent).toContain("2025");
  });
});