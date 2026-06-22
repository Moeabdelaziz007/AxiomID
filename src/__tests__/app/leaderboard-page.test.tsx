/**
 * Tests for src/app/leaderboard/page.tsx
 *
 * PR change: LeaderboardPage now uses useLanguage() (language) for bilingual
 * text rendering (English/Arabic headings, empty state, pioneer registry label).
 * The page also has a search filter and tier filter functionality.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LeaderboardPage from "@/app/leaderboard/page";

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

// Mock TopThreeCards
jest.mock("@/components/ui/TopThreeCards", () => {
  const TopThreeCards = ({ users }: { users: unknown[] }) => (
    <div data-testid="top-three-cards" data-count={users.length} />
  );
  TopThreeCards.displayName = "TopThreeCards";
  return TopThreeCards;
});

// Mock next/link
jest.mock("next/link", () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// Mock useLanguage locally (global mock in jest.setup.js may not propagate)
jest.mock("@/app/context/language-context", () => ({
  useLanguage: jest.fn(() => ({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => key,
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeUser(overrides: Partial<{
  rank: number;
  id: string;
  piUsername: string | null;
  walletAddress: string;
  tier: string;
  xp: number;
  trustScore: number;
  stampsCount: number;
  createdAt: string;
}> = {}) {
  return {
    rank: 1,
    id: "user-1",
    piUsername: "pioneer1",
    walletAddress: "GABC1234567890",
    tier: "Citizen",
    xp: 300,
    trustScore: 75,
    stampsCount: 3,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockLeaderboardResponse(users: ReturnType<typeof makeUser>[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { leaderboard: users } }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  const { useLanguage } = jest.requireMock("@/app/context/language-context");
  useLanguage.mockImplementation(() => ({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }));
});

describe("LeaderboardPage — loading state", () => {
  it("renders without crashing", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    expect(() => render(<LeaderboardPage />)).not.toThrow();
  });

  it("shows loading skeleton initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { container } = render(<LeaderboardPage />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders GLOBAL STANDINGS badge", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByText("GLOBAL STANDINGS")).toBeInTheDocument();
  });

  it("renders 'Sovereign Leaderboard' heading in English", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<LeaderboardPage />);
    expect(screen.getByText("Sovereign Leaderboard")).toBeInTheDocument();
  });
});

describe("LeaderboardPage — empty state (PR change: bilingual)", () => {
  beforeEach(() => {
    mockLeaderboardResponse([]);
  });

  it("renders 'Be the First Sovereign' heading in English when list is empty", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Be the First Sovereign")).toBeInTheDocument();
    });
  });

  it("renders 'Launch App' CTA link in empty state", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Launch App")).toBeInTheDocument();
    });
  });

  it("does NOT render the leaderboard table in empty state", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.queryByText("PIONEER REGISTRY")).toBeNull();
    });
  });

  it("renders Arabic empty state heading when language='ar'", async () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValue({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("كن السيادي الأول")).toBeInTheDocument();
    });
  });
});

describe("LeaderboardPage — data state", () => {
  const users = [
    makeUser({ rank: 1, piUsername: "alice", xp: 900, tier: "Validator" }),
    makeUser({ rank: 2, piUsername: "bob", xp: 600, tier: "Citizen", id: "user-2", walletAddress: "GXYZ" }),
    makeUser({ rank: 3, piUsername: "charlie", xp: 400, tier: "Citizen", id: "user-3", walletAddress: "GDEF" }),
    makeUser({ rank: 4, piUsername: "dave", xp: 200, tier: "Citizen", id: "user-4", walletAddress: "GHIJ" }),
  ];

  beforeEach(() => {
    mockLeaderboardResponse(users);
  });

  it("renders the TopThreeCards component with top 3 users", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      const topCards = screen.getByTestId("top-three-cards");
      expect(topCards).toBeInTheDocument();
      expect(topCards.getAttribute("data-count")).toBe("3");
    });
  });

  it("renders the PIONEER REGISTRY table", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("PIONEER REGISTRY")).toBeInTheDocument();
    });
  });

  it("renders table headers: PIONEER, TIER, STAMPS, TRUST, XP", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("PIONEER")).toBeInTheDocument();
      expect(screen.getByText("TIER")).toBeInTheDocument();
      expect(screen.getByText("STAMPS")).toBeInTheDocument();
      expect(screen.getByText("TRUST")).toBeInTheDocument();
      expect(screen.getByText("XP")).toBeInTheDocument();
    });
  });

  it("only shows rank > 3 users in the table (top 3 are in podium)", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      // "dave" is rank 4 → shown in table
      expect(screen.getByText("@dave")).toBeInTheDocument();
    });
    // "alice", "bob", "charlie" are rank ≤ 3, NOT in the table (in TopThreeCards)
    expect(screen.queryByText("@alice")).toBeNull();
    expect(screen.queryByText("@bob")).toBeNull();
  });

  it("renders '1 FOUND' count in table header for rank 4+ users", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByText("1 FOUND")).toBeInTheDocument();
    });
  });

  it("renders link to user passport for table rows", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      const link = screen.getByText("@dave").closest("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("/passport/dave");
    });
  });

  it("renders walletAddress truncated as username when piUsername is null", async () => {
    const noUsernameUser = makeUser({
      rank: 5,
      piUsername: null,
      walletAddress: "GXXXXXXXXXXXXXXXX1234",
      id: "user-5",
    });
    mockLeaderboardResponse([...users, noUsernameUser]);

    render(<LeaderboardPage />);
    await waitFor(() => {
      // Format: @{walletAddress.slice(0,8)}...{walletAddress.slice(-6)}
      expect(screen.getByText("@GXXXXXXX...XX1234")).toBeInTheDocument();
    });
  });
});

describe("LeaderboardPage — search functionality (PR change)", () => {
  const users = [
    makeUser({ rank: 1, piUsername: "alice", xp: 900, tier: "Validator" }),
    makeUser({ rank: 2, piUsername: "bob", xp: 600, tier: "Citizen", id: "user-2", walletAddress: "GXYZ" }),
    makeUser({ rank: 4, piUsername: "charlie-dev", xp: 200, tier: "Visitor", id: "user-4", walletAddress: "GHIJ" }),
  ];

  beforeEach(() => {
    mockLeaderboardResponse(users);
  });

  it("renders the search input", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search handle or address...")).toBeInTheDocument();
    });
  });

  it("shows matching users when searching by piUsername", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search handle or address...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search handle or address..."), {
      target: { value: "charlie" },
    });

    // "charlie-dev" should appear (rank 4)
    expect(screen.getByText("@charlie-dev")).toBeInTheDocument();
  });

  it("hides TopThreeCards when search query is non-empty", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("top-three-cards")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search handle or address..."), {
      target: { value: "alice" },
    });

    expect(screen.queryByTestId("top-three-cards")).toBeNull();
  });

  it("shows 'No pioneers matched query search.' when no users match", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search handle or address...")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Search handle or address..."), {
      target: { value: "zzz-no-match" },
    });

    expect(screen.getByText("No pioneers matched query search.")).toBeInTheDocument();
  });
});

describe("LeaderboardPage — tier filter (PR change)", () => {
  const users = [
    makeUser({ rank: 1, piUsername: "alice", tier: "Validator", xp: 900 }),
    makeUser({ rank: 4, piUsername: "dave", tier: "Citizen", xp: 200, id: "user-4", walletAddress: "GHIJ" }),
    makeUser({ rank: 5, piUsername: "eve", tier: "Visitor", xp: 50, id: "user-5", walletAddress: "GKLM" }),
  ];

  beforeEach(() => {
    mockLeaderboardResponse(users);
  });

  it("renders tier filter tabs: All, Sovereign, Validator, Citizen, Visitor", async () => {
    render(<LeaderboardPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sovereign" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Validator" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Citizen" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Visitor" })).toBeInTheDocument();
    });
  });

  it("clicking 'Visitor' filter shows only Visitor-tier users in table", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Visitor" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Visitor" }));

    // "eve" is Visitor (rank 5, in table since rank > 3)
    await waitFor(() => {
      expect(screen.getByText("@eve")).toBeInTheDocument();
    });
    // "dave" is Citizen — should be hidden
    expect(screen.queryByText("@dave")).toBeNull();
  });

  it("clicking 'All' shows all users after filtering", async () => {
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Visitor" })).toBeInTheDocument();
    });

    // First filter by Visitor
    fireEvent.click(screen.getByRole("button", { name: "Visitor" }));
    // Then reset to All
    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await waitFor(() => {
      // Both dave (Citizen rank4) and eve (Visitor rank5) back in table
      expect(screen.getByText("@dave")).toBeInTheDocument();
      expect(screen.getByText("@eve")).toBeInTheDocument();
    });
  });
});

describe("LeaderboardPage — Arabic language (bilingual PR change)", () => {
  it("renders Arabic leaderboard heading when language='ar'", async () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValue({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    mockLeaderboardResponse([]);
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("لوحة الصدارة العامة")).toBeInTheDocument();
    });
  });

  it("renders Arabic search placeholder when language='ar'", async () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValue({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    const users = [makeUser({ rank: 4 })];
    mockLeaderboardResponse(users);
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("ابحث عن اسم مستخدم أو عنوان...")
      ).toBeInTheDocument();
    });
  });

  it("renders Arabic PIONEER REGISTRY label when language='ar'", async () => {
    const { useLanguage } = jest.requireMock("@/app/context/language-context");
    useLanguage.mockReturnValue({
      language: "ar",
      setLanguage: jest.fn(),
      t: (key: string) => key,
    });

    const users = [makeUser({ rank: 4 })];
    mockLeaderboardResponse(users);
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText("سجل رواد البروتوكول")).toBeInTheDocument();
    });
  });
});