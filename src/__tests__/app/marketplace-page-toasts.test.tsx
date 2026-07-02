/**
 * Tests for src/app/dashboard/marketplace/page.tsx (PR change)
 *
 * Covers the toast-based error handling and unmount-abort behavior added in
 * this PR:
 * - Tag load failure now shows toast.error("Failed to load tags") instead of
 *   console.error (via a languageRef to avoid stale closures).
 * - Review/version load failures show toast.error with a localized message,
 *   but are silently ignored when the failure is an AbortError.
 * - A new cleanup effect aborts in-flight detail fetches (reviews/versions/
 *   stats) when the component unmounts, to prevent error toasts firing after
 *   the user has navigated away.
 *
 * This is a separate file from marketplace-page.test.tsx (which covers the
 * pre-existing install/error-banner behavior) to keep the fetch/toast mocking
 * for these new code paths isolated and easy to reason about.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketplacePage from "@/app/dashboard/marketplace/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";
import { toast } from "sonner";

jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("lucide-react", () => ({
  Dna: () => <svg data-testid="icon-dna" />,
  Download: () => <svg data-testid="icon-download" />,
  Star: () => <svg data-testid="icon-star" />,
  Coins: () => <svg data-testid="icon-coins" />,
  Package: () => <svg data-testid="icon-package" />,
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

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockToastError = toast.error as jest.Mock;

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
  soulPrinciple: null,
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
  isInstalled: false,
  tags: [],
  updatedAt: "2024-01-01T00:00:00Z",
};

type FetchHandler = (url: string, init?: RequestInit) => Promise<unknown>;

/**
 * Builds a fetch mock that routes by URL to per-endpoint handlers, defaulting
 * to successful empty/basic responses for endpoints not explicitly overridden.
 */
function buildFetchMock(overrides: {
  skills?: FetchHandler;
  tags?: FetchHandler;
  detail?: FetchHandler;
  review?: FetchHandler;
  versions?: FetchHandler;
  stats?: FetchHandler;
}) {
  return jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/api/skills/tags")) {
      return (overrides.tags ?? (() => Promise.resolve({ ok: true, json: async () => ({ tags: [] }) })))(url, init);
    }
    if (url.includes("/review")) {
      return (overrides.review ?? (() => Promise.resolve({ ok: true, json: async () => [] })))(url, init);
    }
    if (url.includes("/versions")) {
      return (overrides.versions ?? (() => Promise.resolve({ ok: true, json: async () => ({ versions: [] }) })))(url, init);
    }
    if (url.includes("/stats")) {
      return (overrides.stats ?? (() => Promise.resolve({ ok: true, json: async () => null })))(url, init);
    }
    if (/\/api\/skills\/[^/?]+$/.test(url)) {
      return (overrides.detail ?? (() => Promise.resolve({ ok: true, json: async () => mockSkillDetail })))(url, init);
    }
    return (overrides.skills ?? (() => Promise.resolve({ ok: true, json: async () => ({ skills: [mockSkill] }) })))(url, init);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));
});

describe("MarketplacePage — tag load failure toast (PR change)", () => {
  it("shows an English error toast when /api/skills/tags fails", async () => {
    global.fetch = buildFetchMock({
      tags: () => Promise.reject(new Error("network down")),
    }) as unknown as typeof fetch;

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load tags");
    });
  });

  it("does not show a tags error toast when /api/skills/tags succeeds", async () => {
    global.fetch = buildFetchMock({}) as unknown as typeof fetch;

    render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    expect(mockToastError).not.toHaveBeenCalledWith("Failed to load tags");
  });
});

describe("MarketplacePage — review load failure toast (PR change)", () => {
  it("shows an English error toast when the review fetch rejects with a non-abort error", async () => {
    global.fetch = buildFetchMock({
      review: () => Promise.reject(new Error("boom")),
    }) as unknown as typeof fetch;

    render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    fireEvent.click(screen.getByRole("button", { name: /Test Skill/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load reviews");
    });
  });

  it("does not show a review error toast when the review fetch is aborted", async () => {
    global.fetch = buildFetchMock({
      review: () => Promise.reject(new DOMException("The operation was aborted", "AbortError")),
    }) as unknown as typeof fetch;

    render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    fireEvent.click(screen.getByRole("button", { name: /Test Skill/i }));

    // Wait for the detail fetch to resolve before asserting the absence of a toast
    await waitFor(() => screen.getByText("# Test Skill"));

    expect(mockToastError).not.toHaveBeenCalledWith("Failed to load reviews");
  });
});

describe("MarketplacePage — versions load failure toast (PR change)", () => {
  it("shows an English error toast when the versions fetch rejects with a non-abort error", async () => {
    global.fetch = buildFetchMock({
      versions: () => Promise.reject(new Error("boom")),
    }) as unknown as typeof fetch;

    render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    fireEvent.click(screen.getByRole("button", { name: /Test Skill/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to load versions");
    });
  });

  it("does not show a versions error toast when the versions fetch is aborted", async () => {
    global.fetch = buildFetchMock({
      versions: () => Promise.reject(new DOMException("The operation was aborted", "AbortError")),
    }) as unknown as typeof fetch;

    render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    fireEvent.click(screen.getByRole("button", { name: /Test Skill/i }));

    await waitFor(() => screen.getByText("# Test Skill"));

    expect(mockToastError).not.toHaveBeenCalledWith("Failed to load versions");
  });
});

describe("MarketplacePage — abort in-flight detail fetches on unmount (PR change)", () => {
  it("calls AbortController.abort() on the active controller when the component unmounts", async () => {
    const abortSpy = jest.fn();
    class MockAbortController {
      signal: { aborted: boolean } = { aborted: false };
      abort() {
        this.signal.aborted = true;
        abortSpy();
      }
    }
    const OriginalAbortController = globalThis.AbortController;
    (globalThis as unknown as { AbortController: unknown }).AbortController = MockAbortController;

    global.fetch = buildFetchMock({}) as unknown as typeof fetch;

    const { unmount } = render(<MarketplacePage />);
    await waitFor(() => screen.getByText("Test Skill"));

    fireEvent.click(screen.getByRole("button", { name: /Test Skill/i }));
    await waitFor(() => screen.getByText("# Test Skill"));

    expect(abortSpy).not.toHaveBeenCalled();

    unmount();

    expect(abortSpy).toHaveBeenCalled();

    (globalThis as unknown as { AbortController: unknown }).AbortController = OriginalAbortController;
  });
});