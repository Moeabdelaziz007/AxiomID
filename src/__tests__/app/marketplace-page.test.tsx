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
 * - Error message priority: data?.message > data?.error > fallback for both
 *   purchase verification failures and install failures (PR change)
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketplacePage from "@/app/dashboard/marketplace/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

// Mock useLanguage
jest.mock("@/app/context/language-context", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => {
      const translations: Record<string, string> = {
        marketplace_dismiss: "DISMISS",
        marketplace_title: "Agentic Marketplace",
        marketplace_browse: "BROWSE",
        marketplace_publish: "PUBLISH",
        marketplace_search: "Search skills... (agent-memory, voice-wizard, sovereign-constitution)",
        marketplace_all: "ALL",
        marketplace_published: "Published Skills",
        marketplace_installs: "Total Installs",
        marketplace_pro_skills: "Pro+ Skills",
        marketplace_free_skills: "Free Skills",
        marketplace_no_skills: "No Skills Available",
        marketplace_publish_first: "Publish the first skill to the marketplace.",
        marketplace_publish_btn: "PUBLISH FIRST SKILL",
        marketplace_no_desc: "No description",
        marketplace_signed: "AxiomID Signed & Signed Attestation",
        marketplace_free: "FREE",
        marketplace_load_more: "LOAD MORE",
        marketplace_close: "CLOSE",
        marketplace_installs_label: "installs",
        marketplace_manifest: "SKILL MANIFEST (SKILL.md)",
        marketplace_script: "SPECIALIST AGENT SCRIPT",
        marketplace_test_suite: "TEST SUITE",
        marketplace_installing: "Installing...",
        marketplace_connecting: "Connecting...",
        marketplace_connect_install: "Connect Wallet to Install",
        marketplace_install_skill: "Install Skill",
        marketplace_copy_payload: "COPY PAYLOAD",
      };
      return translations[key] || key;
    },
  }),
}));

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

// Mock pi-sdk so createPiPayment can be controlled in paid-skill tests
const mockCreatePiPayment = jest.fn();
jest.mock("@/lib/pi-sdk", () => ({
  createPiPayment: (...args: unknown[]) => mockCreatePiPayment(...args),
}));

// jsdom does not implement HTMLDialogElement.showModal / .close
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
});

// Mock AbortController if not available in jsdom
if (typeof globalThis.AbortController === "undefined") {
  (globalThis as any).AbortController = class {
    signal = { aborted: false };
    abort() { this.signal.aborted = true; }
  };
}

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

const mockSkillDetail = {
  ...mockSkill,
  manifestMd: "# Test Skill",
  agentScript: null,
  testSuite: null,
  status: "PUBLISHED",
  isPublished: true,
  installationCount: 42,
  reviewCount: 10,
  updatedAt: "2024-01-01T00:00:00Z",
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
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

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
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

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
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

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
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

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

describe("MarketplacePage — install button aria-label states (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function openSkillDetail() {
    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => {
      expect(screen.getByText("# Test Skill")).toBeInTheDocument();
    });
  }

  it("aria-label is 'Connect Wallet to Install' when user is null (PR change)", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: false }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

    render(<MarketplacePage />);
    await openSkillDetail();

    const btn = screen.getByRole("button", { name: /connect wallet to install/i });
    expect(btn).toHaveAttribute("aria-label", "Connect Wallet to Install");
  });

  it("aria-label is 'Install Skill' when user is authenticated (PR change)", async () => {
    const mockUser = {
      id: "u1",
      walletAddress: "pi:user1",
      piUsername: "user1",
      xp: 0,
      tier: "Citizen" as const,
      trustScore: 0,
      createdAt: new Date().toISOString(),
      actions: [],
    };
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: mockUser, isConnecting: false }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

    render(<MarketplacePage />);
    await openSkillDetail();

    const btn = screen.getByRole("button", { name: /install skill/i });
    expect(btn).toHaveAttribute("aria-label", "Install Skill");
  });

  it("aria-label is 'Connecting' when isConnecting is true (PR change)", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: true }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

    render(<MarketplacePage />);
    await openSkillDetail();

    const btn = screen.getByRole("button", { name: /connecting/i });
    expect(btn).toHaveAttribute("aria-label", "Connecting...");
  });

  it("'Connect Wallet to Install' aria-label takes lower priority than 'Connecting' when isConnecting (PR change)", async () => {
    // isConnecting=true should show Connecting regardless of user being null
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: true }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

    render(<MarketplacePage />);
    await openSkillDetail();

    const btn = screen.getByRole("button", { name: /connecting/i });
    expect(btn).not.toHaveAttribute("aria-label", "Connect Wallet to Install");
    expect(btn).toHaveAttribute("aria-label", "Connecting...");
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

describe("MarketplacePage — Welcome Banner (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
  });

  it("renders the marketplace_welcome_banner key when not showing publish form", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_welcome_banner")).toBeInTheDocument();
    });
  });

  it("renders the marketplace_welcome_desc key under the welcome banner", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_welcome_desc")).toBeInTheDocument();
    });
  });

  it("does NOT render the welcome banner when showing the publish form", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_welcome_banner")).toBeInTheDocument();
    });

    // Click PUBLISH toggle to switch to publish form (first match is the toggle button)
    const publishButtons = screen.getAllByRole("button", { name: /PUBLISH/i });
    fireEvent.click(publishButtons[0]);

    // Welcome banner should disappear when in publish mode
    expect(screen.queryByText("marketplace_welcome_banner")).toBeNull();
  });

  it("Welcome Banner reappears when switching back from publish to browse", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_welcome_banner")).toBeInTheDocument();
    });

    // Toggle to publish (first match is the toggle button)
    const publishButtons = screen.getAllByRole("button", { name: /PUBLISH/i });
    fireEvent.click(publishButtons[0]);
    expect(screen.queryByText("marketplace_welcome_banner")).toBeNull();

    // Toggle back to browse
    fireEvent.click(screen.getByRole("button", { name: /BROWSE/i }));
    expect(screen.getByText("marketplace_welcome_banner")).toBeInTheDocument();
  });
});

describe("MarketplacePage — stats description labels (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
  });

  it("renders marketplace_published_desc key under Published Skills stat", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_published_desc")).toBeInTheDocument();
    });
  });

  it("renders marketplace_installs_desc key under Total Installs stat", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_installs_desc")).toBeInTheDocument();
    });
  });

  it("renders marketplace_pro_skills_desc key under Pro+ Skills stat", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_pro_skills_desc")).toBeInTheDocument();
    });
  });

  it("renders marketplace_free_skills_desc key under Free Skills stat", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("marketplace_free_skills_desc")).toBeInTheDocument();
    });
  });
});

describe("MarketplacePage — i18n text changes (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
  });

  it("renders 'Agentic Marketplace' as the page title from t(marketplace_title)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Agentic Marketplace")).toBeInTheDocument();
    });
  });

  it("renders marketplace_signed key for skill attestation badge", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(
        screen.getByText("AxiomID Signed & Signed Attestation")
      ).toBeInTheDocument();
    });
  });

  it("renders 'FREE' for zero-price skills from t(marketplace_free)", async () => {
    // mockSkill has pricePi: 0
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [mockSkill] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("FREE")).toBeInTheDocument();
    });
  });

  it("renders marketplace_publish_first key in empty state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Publish the first skill to the marketplace.")
      ).toBeInTheDocument();
    });
  });

  it("renders 'PUBLISH FIRST SKILL' button in empty state from t(marketplace_publish_btn)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ skills: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /PUBLISH FIRST SKILL/i })
      ).toBeInTheDocument();
    });
  });

  it("renders marketplace_manifest_desc key in skill detail modal", async () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ skills: [mockSkill] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText("Test Skill")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Test Skill"));

    await waitFor(() => {
      // marketplace_manifest_desc is a new PR key rendered under the manifest section
      expect(screen.getByText("marketplace_manifest_desc")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// PR change: error message priority — data?.message > data?.error > fallback
// ---------------------------------------------------------------------------

const mockUserWithAgent = {
  id: "u1",
  walletAddress: "pi:user1",
  piUsername: "user1",
  xp: 0,
  tier: "Citizen" as const,
  trustScore: 0,
  createdAt: new Date().toISOString(),
  actions: [],
  agent: { id: "agent-1", name: "My Agent", status: "ACTIVE" },
};

const mockPaidSkill = {
  id: "skill-paid",
  slug: "paid-skill",
  name: "Paid Skill",
  description: "A paid skill",
  tier: "PRO",
  pricePi: 5,
  version: "1.0.0",
  installCount: 10,
  avgRating: 4.0,
  ratingCount: 5,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockPaidSkillDetail = {
  ...mockPaidSkill,
  manifestMd: "# Paid Skill",
  agentScript: null,
  testSuite: null,
  status: "PUBLISHED",
  isPublished: true,
  installationCount: 10,
  reviewCount: 5,
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("MarketplacePage — install error message priority (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: mockUserWithAgent }));
  });

  it("shows data.message when both message and error are present in install failure response", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Permission denied via message", error: "Old error field" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Test Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Permission denied via message");
    });
  });

  it("does NOT show data.error when data.message is present in install failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: "Message field wins", error: "Error field loses" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Test Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).not.toHaveTextContent("Error field loses");
    });
  });

  it("falls back to data.error when data.message is absent in install failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Fallback error field" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Test Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Fallback error field");
    });
  });

  it("uses status-code fallback string when neither message nor error present in install failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Test Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Install failed (503)");
    });
  });

  it("install fallback message includes the HTTP status code (boundary: different status)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({}),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Test Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Test Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Install failed (422)");
    });
  });
});

describe("MarketplacePage — purchase verification error message priority (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatePiPayment.mockResolvedValue("mock-txid-123");
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: mockUserWithAgent }));
  });

  it("shows data.message when both message and error present in order creation failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      // order creation fails with both message and error
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ message: "Payment required via message", error: "Old error field" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Payment required via message");
    });
  });

  it("does NOT show data.error when data.message is present in order creation failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ message: "Message wins", error: "Error loses" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).not.toHaveTextContent("Error loses");
    });
  });

  it("falls back to data.error when data.message is absent in order creation failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: "Insufficient balance" }),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Insufficient balance");
    });
  });

  it("uses status-code fallback string when neither message nor error present in order creation failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({}),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Purchase verification failed (402)");
    });
  });

  it("purchase verification fallback includes the HTTP status code (boundary: different status)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Purchase verification failed (500)");
    });
  });

  it("order creation json() parse failure still produces fallback error (regression)", async () => {
    // order creation fails and json() itself throws — catch(() => ({})) should give empty obj
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ skills: [mockPaidSkill] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPaidSkillDetail })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => { throw new Error("Not JSON"); },
      });

    render(<MarketplacePage />);

    await waitFor(() => expect(screen.getByText("Paid Skill")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Paid Skill"));
    await waitFor(() => expect(screen.getByRole("button", { name: /install skill/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /install skill/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Purchase verification failed (503)");
    });
  });
});