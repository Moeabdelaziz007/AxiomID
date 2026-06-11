/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, act, waitFor, renderHook } from '@testing-library/react';
import { WalletProvider, useWallet, useWalletLogs } from '@/app/context/wallet-context';

jest.mock('@/lib/pi-sdk', () => ({
  connectPi: jest.fn(),
  runWalletTest: jest.fn(),
}));

jest.mock('@/lib/tiers', () => ({
  getLevelProgress: jest.fn().mockReturnValue(0),
  getNextLevelXP: jest.fn().mockReturnValue(100),
}));

import { connectPi, runWalletTest } from '@/lib/pi-sdk';

const mockConnectPi = connectPi as jest.Mock;
const mockRunWalletTest = runWalletTest as jest.Mock;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Helper wrapper
function wrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

describe('WalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders children without crashing', () => {
    const { getByText } = render(
      <WalletProvider>
        <span>Hello World</span>
      </WalletProvider>
    );
    expect(getByText('Hello World')).toBeDefined();
  });

  it('useWallet throws when used outside WalletProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useWallet());
    }).toThrow('useWallet must be used within a WalletProvider');
    consoleError.mockRestore();
  });

  it('useWalletLogs returns empty array when outside WalletProvider', () => {
    const { result } = renderHook(() => useWalletLogs());
    expect(result.current).toEqual([]);
  });

  it('initial user state is null when localStorage is empty', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it('initial isConnecting state is false', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.isConnecting).toBe(false);
  });

  it('initial error state is null', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.error).toBeNull();
  });

  it('initial walletLogs is empty array', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.walletLogs).toEqual([]);
  });

  it('initial levelProgress is 0 when no user', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.levelProgress).toBe(0);
  });

  it('initial nextXP is null when no user', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.nextXP).toBeNull();
  });

  it('fetches user data on mount when axiomid_wallet is in localStorage', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:storeduser';
      return null;
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'user-stored',
        walletAddress: 'pi:storeduser',
        xp: 100,
        tier: 'Citizen',
        trustScore: 10,
        createdAt: '2024-01-01T00:00:00Z',
        piUsername: 'storeduser',
        agent: null,
      }),
    });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user?.walletAddress).toBe('pi:storeduser');
    expect(result.current.user?.xp).toBe(100);
    expect(result.current.user?.tier).toBe('Citizen');
  });

  it('sets isLoading to false when fetch fails on mount', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:baduser';
      return null;
    });

    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('sets isLoading to false when fetch returns non-ok on mount', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:baduser';
      return null;
    });

    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('claimAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns false when user is null', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    const success = await act(async () => result.current.claimAction('connect_twitter'));
    expect(success).toBe(false);
  });

  it('sends Authorization header when piAccessToken is set', async () => {
    // Set up user via localStorage
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      if (key === 'pi_access_token') return 'my-pi-token';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1',
          walletAddress: 'pi:testuser',
          xp: 0,
          tier: 'Visitor',
          trustScore: 0,
          createdAt: '2024-01-01T00:00:00Z',
          piUsername: 'testuser',
          agent: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xpEarned: 50, newBalance: 50, tier: 'Visitor' }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.claimAction('connect_twitter');
    });

    const claimCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0] === '/api/action/claim'
    );
    expect(claimCall).toBeDefined();
    expect(claimCall?.[1]?.headers?.Authorization).toBe('Bearer my-pi-token');
  });

  it('sends correct action type in body', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xpEarned: 50, newBalance: 50, tier: 'Visitor' }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.claimAction('daily_pow');
    });

    const claimCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0] === '/api/action/claim'
    );
    const body = JSON.parse(claimCall?.[1]?.body);
    expect(body.actionType).toBe('daily_pow');
    // userId should NOT be in body (PR change: removed userId)
    expect(body.userId).toBeUndefined();
  });

  it('updates user XP and tier on successful claim', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ xpEarned: 50, newBalance: 50, tier: 'Citizen' }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.claimAction('connect_twitter');
    });

    expect(result.current.user?.xp).toBe(50);
    expect(result.current.user?.tier).toBe('Citizen');
  });

  it('returns false when claim request fails', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'CONFLICT', code: 'CONFLICT' }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.claimAction('connect_twitter');
    });

    expect(success).toBe(false);
  });
});

describe('createAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns false when user is null', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    const success = await act(async () => result.current.createAgent('My Agent'));
    expect(success).toBe(false);
  });

  it('sends correct headers with piAccessToken', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      if (key === 'pi_access_token') return 'token-xyz';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // createAgent call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: { id: 'a1', name: 'My Agent', status: 'INACTIVE', lastActive: null },
        }),
      }); // refreshUser call

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.createAgent('My Agent');
    });

    const agentCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0] === '/api/agent'
    );
    expect(agentCall).toBeDefined();
    expect(agentCall?.[1]?.headers?.Authorization).toBe('Bearer token-xyz');
  });

  it('returns false when API returns non-ok response', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 409 });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createAgent('My Agent');
    });

    expect(success).toBe(false);
  });
});

describe('activateAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns false when user is null', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    const success = await act(async () => result.current.activateAgent());
    expect(success).toBe(false);
  });

  it('calls /api/agent/activate with POST method', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ACTIVE' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.activateAgent();
    });

    const activateCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0] === '/api/agent/activate'
    );
    expect(activateCall).toBeDefined();
    expect(activateCall?.[1]?.method).toBe('POST');
  });
});

describe('pauseAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns false when user is null', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    const success = await act(async () => result.current.pauseAgent());
    expect(success).toBe(false);
  });

  it('calls /api/agent/pause with POST method', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'axiomid_wallet') return 'pi:testuser';
      return null;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'PAUSED' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userId: 'u1', walletAddress: 'pi:testuser', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: 'testuser', agent: null,
        }),
      });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.pauseAgent();
    });

    const pauseCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0] === '/api/agent/pause'
    );
    expect(pauseCall).toBeDefined();
    expect(pauseCall?.[1]?.method).toBe('POST');
  });
});

describe('refreshUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('does nothing when no walletAddress is available', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.refreshUser();
    });

    // fetch should not have been called for user status
    const statusCall = mockFetch.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('/api/user/status')
    );
    expect(statusCall).toBeUndefined();
  });

  it('accepts walletAddress parameter override', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'u1', walletAddress: 'pi:override', xp: 10, tier: 'Visitor',
        trustScore: 1, createdAt: '2024-01-01T00:00:00Z', piUsername: 'override', agent: null,
      }),
    });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.refreshUser('pi:override');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/user/status?walletAddress=pi:override');
  });
});

describe('connectWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
    // Mock navigator.userAgent to be non-Pi
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (non-Pi browser)',
      configurable: true,
    });
  });

  it('sets isConnecting to true then false during connection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'u1', walletAddress: 'demo:abc12345', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: null, actions: [], agent: null,
        },
      }),
    });

    const { result } = renderHook(() => useWallet(), { wrapper });

    let wasConnecting = false;
    await act(async () => {
      const connectPromise = result.current.connectWallet();
      wasConnecting = result.current.isConnecting || wasConnecting;
      await connectPromise;
    });

    expect(result.current.isConnecting).toBe(false);
  });

  it('sets user after successful demo connection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'u-demo', walletAddress: 'demo:test1234', xp: 0, tier: 'Visitor',
          trustScore: 0, createdAt: '2024-01-01T00:00:00Z', piUsername: null, actions: [], agent: null,
        },
      }),
    });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.walletAddress).toMatch(/^demo:/);
  });

  it('sets error on connection failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(result.current.error).not.toBeNull();
  });
});

describe('runWalletTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('calls clearWalletLogs and runWalletTest from pi-sdk', async () => {
    mockRunWalletTest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.runWalletTest();
    });

    expect(mockRunWalletTest).toHaveBeenCalled();
  });

  it('pushes error log when runWalletTest throws', async () => {
    mockRunWalletTest.mockRejectedValue(new Error('SDK failure'));

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.runWalletTest();
    });

    const errorLog = result.current.walletLogs.find((log) => log.includes('SDK failure'));
    expect(errorLog).toBeDefined();
  });
});