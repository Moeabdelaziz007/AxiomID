/**
 * Tests for src/components/StampBoard.tsx
 *
 * PR change: The close button in the VC Inspector modal had its className updated
 * to add min-h-[44px] min-w-[44px] and flex items-center justify-center for mobile
 * touch target compliance. Previous: "px-2 py-0.5 rounded cursor-pointer".
 * New: "px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded cursor-pointer".
 */

import React from "react";
 
import { render, screen, act } from "@testing-library/react";
import { StampBoard } from "@/components/StampBoard";
import type { Tier } from "@/lib/tiers";

// Mock StampCard to avoid rendering the broken unconnected button state
jest.mock("@/components/StampCard", () => ({
  StampCard: ({ isConnected, onInspectVc, label }: any) => (
    <div data-testid={`stamp-card-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      {isConnected && (
        <button onClick={onInspectVc} aria-label={`inspect vc ${label}`}>
          INSPECT VC
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/TrustScoreGauge", () => ({
  TrustScoreGauge: () => <div data-testid="trust-gauge" />,
}));

jest.mock("@/lib/trust", () => ({
  calculateTrustScore: jest.fn().mockReturnValue(42),
}));

jest.mock("@/lib/tiers", () => ({
  getLevelProgress: jest.fn().mockReturnValue(55),
  getNextLevelXP: jest.fn().mockReturnValue(2500),
}));

// Polyfill HTMLDialogElement for jsdom
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  }
});

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: "u1",
    walletAddress: "demo:stampboarduser",
    piUsername: "testuser",
    xp: 200,
    tier: "Citizen" as Tier,
    actions: [],
    stamps: [],
    ...overrides,
  };
}

function makeStamp(type: string, metadata?: string) {
  return {
    type,
    provider: type,
    xpAwarded: 50,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };
}

describe("StampBoard — VC Inspector modal close button touch target (PR change)", () => {
  it("renders a close button with min-h-[44px] class in the VC modal after opening it", async () => {
    const vcPayload = JSON.stringify({ credentialSubject: { platform: "twitter" } });
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", vcPayload)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      // Click the inspect VC button (rendered by our mock StampCard)
      const inspectBtn = screen.getByRole("button", { name: /inspect vc twitter stamp/i });
      inspectBtn.click();
    });

    // Find the close button inside the dialog
    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain("min-h-[44px]");
  });

  it("close button has min-w-[44px] class", async () => {
    const vcPayload = JSON.stringify({ credentialSubject: { platform: "twitter" } });
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", vcPayload)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn.className).toContain("min-w-[44px]");
  });

  it("close button has flex items-center justify-center classes (PR change)", async () => {
    const vcPayload = JSON.stringify({ credentialSubject: { platform: "twitter" } });
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", vcPayload)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn.className).toContain("flex");
    expect(closeBtn.className).toContain("items-center");
    expect(closeBtn.className).toContain("justify-center");
  });

  it("close button has py-2 padding (PR change from py-0.5)", async () => {
    const vcPayload = JSON.stringify({ credentialSubject: { platform: "twitter" } });
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", vcPayload)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn.className).toContain("py-2");
  });

  it("close button calls dialog.close() when clicked", async () => {
    const vcPayload = JSON.stringify({ type: "VerifiableCredential" });
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", vcPayload)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const closeSpy = jest.spyOn(HTMLDialogElement.prototype, "close");
    const closeBtn = screen.getByRole("button", { name: /close/i });

    await act(async () => {
      closeBtn.click();
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
    closeSpy.mockRestore();
  });
});

describe("StampBoard — Trust Score and Progress display", () => {
  it("renders the TrustScoreGauge component", () => {
    const user = makeUser();
    render(<StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />);
    expect(screen.getByTestId("trust-gauge")).toBeInTheDocument();
  });

  it("renders the stamps grid with 6 stamp cards", () => {
    const user = makeUser();
    render(<StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />);
    // 6 stamp definitions: twitter, discord, google, daily_pow, wallet_age, verify_identity
    const stampCards = screen.getAllByTestId(/^stamp-card-/);
    expect(stampCards).toHaveLength(6);
  });

  it("shows the CURRENT tier in the progress section", () => {
    const user = makeUser({ tier: "Citizen" });
    render(<StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />);
    // t('current_tier') returns the key, tier is "Citizen"
    expect(screen.getByText("Citizen")).toBeInTheDocument();
  });
});

describe("StampBoard — VC Inspector modal content", () => {
  it("shows parsed VC JSON in the pre element after opening modal", async () => {
    const vcPayload = { credentialSubject: { platform: "twitter", handle: "@test" } };
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", JSON.stringify(vcPayload))],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("twitter");
  });

  it("shows error message in pre element when stamp metadata is null", async () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", null as unknown as string)],
    });
    render(
      <StampBoard user={user} claimAction={jest.fn()} connectWallet={jest.fn()} />
    );

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc twitter stamp/i }).click();
    });

    const pre = document.querySelector("pre");
    expect(pre?.textContent).toContain("No Verifiable Credential data available");
  });
});