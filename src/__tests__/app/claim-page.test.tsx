/**
 * Tests for src/app/claim/page.tsx
 *
 * PR change: "Pi Mainnet" hardcoded text changed to "Pi Testnet" (line 494)
 * The text appears in the Deploy (step 3) passport preview panel.
 *
 * The claim page is a 3-step wizard:
 *   Step 1: Connect wallet
 *   Step 2: KYA verification
 *   Step 3: Deploy passport (contains "Pi Testnet")
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import ClaimPage from "@/app/claim/page";

// Mock Header and Footer to isolate test surface
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

// Mock useWallet
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

import { useWallet } from "@/app/context/wallet-context";
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function defaultWalletCtx(overrides: Partial<ReturnType<typeof useWallet>> = {}): ReturnType<typeof useWallet> {
  return {
    user: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    isPiBrowser: false,
    connectWallet: jest.fn(),
    claimAction: jest.fn(),
    refreshUser: jest.fn(),
    createAgent: jest.fn(),
    activateAgent: jest.fn(),
    pauseAgent: jest.fn(),
    claimKya: jest.fn(),
    levelProgress: 0,
    nextXP: null,
    walletLogs: [],
    runWalletTest: jest.fn(),
    clearWalletLogs: jest.fn(),
    logout: jest.fn(),
    disconnectWallet: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useWallet>;
}

// A mock user with a walletAddress so step 1 canProceed() returns true
const connectedUser = {
  id: "user-1",
  walletAddress: "GABC1234567890abcdef",
  piUid: "pi-uid-123",
  piUsername: "testpioneer",
  xp: 100,
  tier: "Citizen",
  trustScore: 80,
  stamps: [],
  agent: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUseWallet.mockReturnValue(defaultWalletCtx());
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ClaimPage — step 1 (initial state)", () => {
  it("renders without crashing", () => {
    expect(() => render(<ClaimPage />)).not.toThrow();
  });

  it("renders 'Claim Your Identity' heading on step 1", () => {
    render(<ClaimPage />);
    expect(screen.getByText("Claim Your Identity")).toBeInTheDocument();
  });

  it("renders 'Connect Wallet' step heading on step 1", () => {
    render(<ClaimPage />);
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("does NOT render 'Pi Testnet' text on step 1 (initial load)", () => {
    render(<ClaimPage />);
    expect(screen.queryByText("Pi Testnet")).toBeNull();
  });

  it("does NOT render 'Pi Mainnet' anywhere (PR regression guard)", () => {
    render(<ClaimPage />);
    expect(screen.queryByText("Pi Mainnet")).toBeNull();
  });

  it("renders CONNECT PI WALLET button when no user is connected", () => {
    render(<ClaimPage />);
    expect(screen.getByText("CONNECT PI WALLET")).toBeInTheDocument();
  });

  it("renders 'Connected' badge when user has a walletAddress", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("does NOT show 'Continue' button when no wallet is connected (step 1 cannot proceed)", () => {
    render(<ClaimPage />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();
  });

  it("'Continue' button is enabled when user has walletAddress", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).not.toBeDisabled();
  });
});

describe("ClaimPage — step 2 (KYA verify)", () => {
  it("advances to step 2 when clicking Continue with a connected wallet", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);

    fireEvent.click(screen.getByText("Continue"));

    expect(screen.getByText("Know Your Agent")).toBeInTheDocument();
  });

  it("renders 'START KYA VERIFICATION' button on step 2", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("START KYA VERIFICATION")).toBeInTheDocument();
  });

  it("does NOT render 'Pi Testnet' on step 2", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.queryByText("Pi Testnet")).toBeNull();
  });

  it("'Continue' button is disabled before verification completes on step 2", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    fireEvent.click(screen.getByText("Continue"));
    // After advancing to step 2, Continue should be disabled (not verified yet)
    expect(screen.getByText("Continue")).toBeDisabled();
  });
});

describe("ClaimPage — step 3 (deploy — PR change: Pi Testnet)", () => {
  /**
   * Navigate to step 3 by:
   * 1. Mock user with walletAddress
   * 2. Click Continue → step 2
   * 3. Click "START KYA VERIFICATION" → starts interval
   * 4. Run all timers to complete verification
   * 5. Click Continue → step 3
   */
  async function navigateToStep3() {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);

    // Step 1 → Step 2
    fireEvent.click(screen.getByText("Continue"));

    // Trigger verification
    fireEvent.click(screen.getByText("START KYA VERIFICATION"));

    // Run interval: 50 ticks at 40ms each = 2000ms total to reach 100
    act(() => {
      jest.advanceTimersByTime(5000); // 50 * 40ms = 2000ms, advance 5s to be safe
    });

    await waitFor(() => {
      expect(screen.queryByText("VERIFICATION COMPLETE")).not.toBeNull();
    });

    // Step 2 → Step 3
    fireEvent.click(screen.getByText("Continue"));
  }

  it("renders 'Pi Testnet' in the passport preview at step 3 (PR change)", async () => {
    await navigateToStep3();
    expect(screen.getByText("Pi Testnet")).toBeInTheDocument();
  });

  it("does NOT render 'Pi Mainnet' at step 3 (PR regression guard)", async () => {
    await navigateToStep3();
    expect(screen.queryByText("Pi Mainnet")).toBeNull();
  });

  it("renders 'Deploy Passport' heading at step 3", async () => {
    await navigateToStep3();
    expect(screen.getByText("Deploy Passport")).toBeInTheDocument();
  });

  it("renders 'AXIOM AGENT PASSPORT' label in passport preview", async () => {
    await navigateToStep3();
    expect(screen.getByText("AXIOM AGENT PASSPORT")).toBeInTheDocument();
  });

  it("renders 'DEPLOY ON-CHAIN' button at step 3", async () => {
    await navigateToStep3();
    expect(screen.getByText("DEPLOY ON-CHAIN")).toBeInTheDocument();
  });

  it("renders trust score value '100' in passport preview", async () => {
    await navigateToStep3();
    // "100" appears as trust score in step 3 passport preview
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("does NOT render 'Continue' navigation at step 3 (no more steps)", async () => {
    await navigateToStep3();
    // The nav buttons only show when currentStep < 3
    expect(screen.queryByText("Continue")).toBeNull();
  });
});

describe("ClaimPage — 'Pi Mainnet' never appears (global regression guard)", () => {
  it("'Pi Mainnet' text is not present at step 1", () => {
    render(<ClaimPage />);
    expect(screen.queryByText("Pi Mainnet")).toBeNull();
  });

  it("'Pi Mainnet' text is not present at step 2", () => {
    mockUseWallet.mockReturnValue(defaultWalletCtx({ user: connectedUser as any }));
    render(<ClaimPage />);
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.queryByText("Pi Mainnet")).toBeNull();
  });
});