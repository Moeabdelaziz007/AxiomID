import { jest } from "@jest/globals";
import type { useWallet } from "@/app/context/wallet-context";

/**
 * Shared factory for a default mock WalletContext value.
 * Import this in component tests that mock `@/app/context/wallet-context`.
 */
export function defaultWalletCtx(overrides: Partial<ReturnType<typeof useWallet>> = {}): ReturnType<typeof useWallet> {
  return {
    user: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    isPiBrowser: false,
    connectWallet: jest.fn(),
    logout: jest.fn(),
    claimAction: jest.fn(),
    refreshUser: jest.fn(),
    createAgent: jest.fn(),
    activateAgent: jest.fn(),
    pauseAgent: jest.fn(),
    levelProgress: 0,
    nextXP: null,
    walletLogs: [],
    runWalletTest: jest.fn(),
    clearWalletLogs: jest.fn(),
    disconnectWallet: jest.fn(),
    claimKya: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useWallet>;
}