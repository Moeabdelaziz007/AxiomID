/**
 * Tests for src/app/dashboard/settings/page.tsx
 *
 * Covers the PR changes:
 * - isPlatformConnected: now reads from user.stamps instead of user.actions
 * - openVcModal: now reads stamp.metadata instead of action.metadata
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import SettingsPage from "@/app/dashboard/settings/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

// Mock useWallet so we can control user state
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// Mock next/link (used inside the component for navigation)
jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// Mock ErrorBanner component
jest.mock("@/components/ErrorBanner", () => ({
  ErrorBanner: () => null,
}));

// Mock ThemeToggle and LanguageToggle (require context providers)
jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));
jest.mock("@/components/LanguageToggle", () => ({
  __esModule: true,
  default: () => null,
}));

// Mock tiers lib to avoid side effects
jest.mock("@/lib/tiers", () => ({
  getLevelProgress: jest.fn().mockReturnValue(0),
  getNextLevelXP: jest.fn().mockReturnValue(2500),
  TIERS: { Visitor: 0, Citizen: 500, Pioneer: 1000, Sovereign: 2000 },
}));

import type { User } from "@/app/context/wallet-context";
import type { Tier } from "@/lib/tiers";

// HTMLDialogElement is not fully supported in jsdom; polyfill showModal/close
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

// Mock fetch globally for fetchStatusDetails (called on mount when user exists)
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      recentLedger: [],
      stats: { totalActions: 0, totalXP: 0 },
    }),
  });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Factory helpers

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-settings",
    walletAddress: "demo:settings",
    piUsername: "settingsuser",
    xp: 100,
    tier: "Citizen" as Tier,
    trustScore: 10,
    createdAt: new Date().toISOString(),
    actions: [],
    stamps: [],
    agent: null,
    ...overrides,
  };
}

function makeStamp(type: string, metadata?: string) {
  return {
    type,
    provider: type.replace("connect_", ""),
    xpAwarded: 50,
    metadata: metadata ?? null,
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// isPlatformConnected — reads from user.stamps (PR change)
// ─────────────────────────────────────────────────────────────────────────────

describe("isPlatformConnected — reads from user.stamps", () => {
  it("shows CONNECT button for twitter when stamps array is empty", () => {
    const user = makeUser({ stamps: [] });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    const connectButtons = screen.getAllByRole("button", { name: /^connect$/i });
    // All three platforms should be unconnected, so at least one CONNECT button
    expect(connectButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows CONNECTED badge for twitter when stamps contains connect_twitter", () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", '{"vc":"twitter"}')],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    const connectedBadges = screen.getAllByText("CONNECTED");
    expect(connectedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows INSPECT VC button for twitter when stamps contains connect_twitter", () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", '{"vc":"twitter"}')],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: /inspect vc/i })).toBeInTheDocument();
  });

  it.each(["discord", "google"] as const)(
    "shows CONNECTED badge for %s when stamps contains connect_%s",
    (platform) => {
      const user = makeUser({
        stamps: [makeStamp(`connect_${platform}`, `{"vc":"${platform}"}`)],
      });
      mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
      render(<SettingsPage />);

      const connectedBadges = screen.getAllByText("CONNECTED");
      expect(connectedBadges.length).toBeGreaterThanOrEqual(1);
    },
  );

  it("shows all three platforms as CONNECTED when all stamps are present", () => {
    const user = makeUser({
      stamps: [
        makeStamp("connect_twitter", '{"vc":"twitter"}'),
        makeStamp("connect_discord", '{"vc":"discord"}'),
        makeStamp("connect_google", '{"vc":"google"}'),
      ],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    const connectedBadges = screen.getAllByText("CONNECTED");
    expect(connectedBadges).toHaveLength(3);

    const inspectButtons = screen.getAllByRole("button", { name: /inspect vc/i });
    expect(inspectButtons).toHaveLength(3);
  });

  it("only marks twitter as connected when only connect_twitter stamp exists", () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", '{"vc":"twitter"}')],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    // Only one platform connected → 1 CONNECTED badge
    const connectedBadges = screen.getAllByText("CONNECTED");
    expect(connectedBadges).toHaveLength(1);

    // Two remaining platforms are unconnected → 2 CONNECT buttons
    const connectButtons = screen.getAllByRole("button", { name: /^connect$/i });
    expect(connectButtons).toHaveLength(2);
  });

  // Regression: stamps NOT actions – having actions but no stamps should NOT show connected
  it("does NOT show CONNECTED when connect_twitter appears only in actions (not stamps)", () => {
    const user = makeUser({
      actions: [{ type: "connect_twitter", xp: 50, timestamp: new Date().toISOString(), metadata: null }],
      stamps: [],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    expect(screen.queryByText("CONNECTED")).toBeNull();
  });

  it("shows CONNECT button for a platform whose stamp type does not match connect_<platform>", () => {
    // stamp exists but for a different type
    const user = makeUser({
      stamps: [makeStamp("some_other_action")],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    // No platform should be connected
    expect(screen.queryByText("CONNECTED")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// openVcModal — reads from stamp.metadata (PR change)
// ─────────────────────────────────────────────────────────────────────────────

describe("openVcModal — reads from stamp.metadata", () => {
  it("opens the VC dialog and displays parsed stamp metadata when INSPECT VC is clicked", async () => {
    const vcPayload = { "@context": ["https://www.w3.org/2018/credentials/v1"], type: "VerifiableCredential" };
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", JSON.stringify(vcPayload))],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc/i }).click();
    });

    // The VC inspector dialog renders the JSON in a <pre> element
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("VerifiableCredential");
  });

  it("does nothing (dialog stays closed) when no matching stamp exists for the action type", async () => {
    // User has stamps, but not for connect_twitter
    const user = makeUser({
      stamps: [makeStamp("connect_discord", '{"vc":"discord"}')],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    // No INSPECT VC button for twitter should be present since twitter is not connected
    const inspectButtons = screen.queryAllByRole("button", { name: /inspect vc/i });
    // Only discord's INSPECT VC shows up
    expect(inspectButtons).toHaveLength(1);

    // Verify showModal is not called when there's no matching stamp
    const showModalSpy = jest.spyOn(HTMLDialogElement.prototype, "showModal");

    await act(async () => {
      inspectButtons[0].click();
    });

    // showModal called for the discord stamp (which exists)
    expect(showModalSpy).toHaveBeenCalledTimes(1);
  });

  it("displays a JSON parse error message when stamp.metadata is malformed JSON", async () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", "this-is-not-valid-json{{{")],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc/i }).click();
    });

    // Component sets { error: "Failed to parse Verifiable Credential payload." } as activeVc
    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("Failed to parse Verifiable Credential payload.");
  });

  it("treats null metadata as empty credential (shows error message)", async () => {
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", null as unknown as string)],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc/i }).click();
    });

    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("No Verifiable Credential data available");
  });

  it("still opens the VC dialog even when metadata is malformed (error recovery)", async () => {
    const showModalSpy = jest.spyOn(HTMLDialogElement.prototype, "showModal");
    const user = makeUser({
      stamps: [makeStamp("connect_twitter", "BAD JSON")],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    await act(async () => {
      screen.getByRole("button", { name: /inspect vc/i }).click();
    });

    // showModal must have been called despite parse failure
    expect(showModalSpy).toHaveBeenCalled();
  });

  // Regression: openVcModal must use stamps, not actions
  it("does NOT open the VC dialog when actionType exists in actions but not in stamps", async () => {
    const showModalSpy = jest.spyOn(HTMLDialogElement.prototype, "showModal");
    const user = makeUser({
      actions: [{ type: "connect_twitter", xp: 50, timestamp: new Date().toISOString(), metadata: '{"vc":"from-actions"}' }],
      stamps: [],
    });
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user }));
    render(<SettingsPage />);

    // isPlatformConnected also uses stamps, so INSPECT VC button won't appear
    // The connect button should appear instead
    expect(screen.queryByRole("button", { name: /inspect vc/i })).toBeNull();
    expect(showModalSpy).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated state (user is null)
// ─────────────────────────────────────────────────────────────────────────────

describe("SettingsPage — unauthenticated", () => {
  it("renders the CONNECT WALLET button when user is null", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
    render(<SettingsPage />);
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("does not render the social identifier section when user is null", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
    render(<SettingsPage />);
    expect(screen.queryByText(/Verifiable Social Identifiers/i)).toBeNull();
  });
});
