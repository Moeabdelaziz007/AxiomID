import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import MarketplacePage from "@/app/dashboard/marketplace/page";
import { useWallet } from "@/app/context/wallet-context";
import { defaultWalletCtx } from "./wallet-test-helpers";

// Mock useWallet
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Dna: () => <span data-testid="icon-dna" />,
  Download: () => <span data-testid="icon-download" />,
  Star: () => <span data-testid="icon-star" />,
  Coins: () => <span data-testid="icon-coins" />,
  Package: () => <span data-testid="icon-package" />,
}));

const mockSkills = [
  {
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
    createdAt: "2024-01-01",
  },
  {
    id: "skill-2",
    slug: "pro-skill",
    name: "Pro Skill",
    description: "A pro skill",
    tier: "PRO",
    pricePi: 5,
    version: "2.0.0",
    installCount: 100,
    avgRating: 5.0,
    ratingCount: 25,
    createdAt: "2024-01-02",
  },
];

const mockSkillDetail = {
  ...mockSkills[0],
  manifestMd: "# Test Skill\nThis is the manifest.",
  agentScript: "export function run() {}",
  testSuite: null,
  status: "PUBLISHED",
  isPublished: true,
  installationCount: 42,
  reviewCount: 10,
  updatedAt: "2024-01-01",
};

describe("MarketplacePage", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue(defaultWalletCtx());
    fetchMock = jest.spyOn(global, "fetch");
    // Default: successful skills load
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ skills: mockSkills }),
    } as Response);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe("initial rendering and loading", () => {
    it("renders the Agentic Marketplace heading", async () => {
      render(<MarketplacePage />);
      expect(screen.getByText("Agentic Marketplace")).toBeInTheDocument();
    });

    it("renders BACK TO DASHBOARD link", async () => {
      render(<MarketplacePage />);
      const link = screen.getByRole("link", { name: /dashboard/i });
      expect(link).toHaveAttribute("href", "/dashboard");
    });

    it("shows loading skeleton while fetching skills", () => {
      // Delay the fetch so we can observe loading state
      fetchMock.mockImplementation(() => new Promise(() => {}));
      render(<MarketplacePage />);

      const { container } = render(<MarketplacePage />);
      const pulseElements = container.querySelectorAll(".animate-pulse");
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it("renders skills after successful fetch", async () => {
      render(<MarketplacePage />);
      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
      });
    });

    it("renders all skills returned from the API", async () => {
      render(<MarketplacePage />);
      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
        expect(screen.getByText("Pro Skill")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows an error alert when the API returns a non-ok response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to load skills \(500\)/i);
    });

    it("shows an error alert when the network request fails", async () => {
      fetchMock.mockRejectedValue(new Error("Network error"));

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });

    it("can dismiss the error alert via the DISMISS button", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows 'No Skills Available' when the API returns an empty skills array", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ skills: [] }),
      } as Response);

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByText("No Skills Available")).toBeInTheDocument();
      });
    });
  });

  describe("install button — unauthenticated user", () => {
    it("shows 'CONNECT WALLET TO INSTALL' when no user is logged in", async () => {
      // Load skill detail to see the install button
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ skills: mockSkills }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSkillDetail,
        } as Response);

      mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null }));

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Skill"));

      await waitFor(() => {
        expect(screen.getByText("CONNECT WALLET TO INSTALL")).toBeInTheDocument();
      });
    });

    it("calls connectWallet() when install is clicked without a user", async () => {
      const connectWalletFn = jest.fn();
      mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, connectWallet: connectWalletFn }));

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ skills: mockSkills }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSkillDetail,
        } as Response);

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
      });

      // Click skill to open detail
      fireEvent.click(screen.getByText("Test Skill"));

      await waitFor(() => {
        expect(screen.getByText("CONNECT WALLET TO INSTALL")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("CONNECT WALLET TO INSTALL"));

      expect(connectWalletFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("install button — wallet connecting state", () => {
    it("shows 'CONNECTING...' and is disabled when wallet is connecting", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ skills: mockSkills }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockSkillDetail,
        } as Response);

      mockUseWallet.mockReturnValue(defaultWalletCtx({ user: null, isConnecting: true }));

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Skill"));

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /connecting/i });
        expect(btn).toBeInTheDocument();
        expect(btn).toBeDisabled();
      });
    });
  });

  describe("install — authenticated user", () => {
    const authenticatedUser = {
      id: "user-1",
      walletAddress: "pi:alice",
      piUsername: "alice",
      xp: 0,
      tier: "Citizen" as const,
      trustScore: 0,
      createdAt: new Date().toISOString(),
      actions: [],
      agent: null,
    };

    it("shows error when install API returns a non-ok response", async () => {
      mockUseWallet.mockReturnValue(defaultWalletCtx({ user: authenticatedUser as never }));

      fetchMock
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => ({ skills: mockSkills }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true, status: 200,
          json: async () => mockSkillDetail,
        } as Response)
        .mockResolvedValueOnce({
          ok: false, status: 402,
          json: async () => ({ error: "Insufficient funds" }),
        } as Response);

      render(<MarketplacePage />);

      await waitFor(() => {
        expect(screen.getByText("Test Skill")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Skill"));

      await waitFor(() => {
        expect(screen.getByText("INSTALL SKILL → AGENT")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("INSTALL SKILL → AGENT"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByRole("alert")).toHaveTextContent("Insufficient funds");
    });
  });

  describe("search and filter UI", () => {
    it("renders a search input", async () => {
      render(<MarketplacePage />);
      expect(screen.getByPlaceholderText(/search skills/i)).toBeInTheDocument();
    });

    it("renders tier filter buttons including ALL", async () => {
      render(<MarketplacePage />);
      expect(screen.getByRole("button", { name: "ALL" })).toBeInTheDocument();
    });

    it("renders PUBLISH button to toggle publish mode", async () => {
      render(<MarketplacePage />);
      expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    });
  });
});