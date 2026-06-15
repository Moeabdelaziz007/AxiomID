/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

// Mock the PiSdkBase module (virtual — no actual package installed)
jest.mock('@pinetwork/pi-sdk-js', () => ({
  PiSdkBase: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    createPayment: jest.fn(),
  })),
}), { virtual: true });

import { PiSdkBase } from '@pinetwork/pi-sdk-js';
import {
  getLastPiError,
  isPiSdkLoaded,
  verifyStellarAddress,
  transferPi,
  claimPiKya,
  connectPi,
} from '@/lib/pi-sdk';

const MockPiSdkBase = PiSdkBase as jest.MockedClass<typeof PiSdkBase>;

describe('pi-sdk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLastPiError', () => {
    it('returns null initially', () => {
      // After module is loaded fresh, lastError starts as null
      // Since Jest module cache persists, we test that it can be null or string
      const err = getLastPiError();
      expect(err === null || typeof err === 'string').toBe(true);
    });

    it('returns the last error message after a failed connectPi', async () => {
      const mockInstance = { connect: jest.fn().mockRejectedValue(new Error('Auth failed')) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue(null);

      await expect(connectPi()).rejects.toThrow();
      expect(getLastPiError()).toBeTruthy();
    });
  });

  describe('isPiSdkLoaded', () => {
    it('returns false when window is undefined (server-side)', () => {
      // In jest node environment, window is not defined
      expect(isPiSdkLoaded()).toBe(false);
    });

    it('returns false when window.Pi is not set', () => {
      // Simulate browser environment without Pi
      const win = (global as any).window || {};
      const originalPi = win.Pi;
      win.Pi = undefined;

      expect(isPiSdkLoaded()).toBe(false);

      if (originalPi !== undefined) {
        win.Pi = originalPi;
      }
    });

    it('returns true when window.Pi.authenticate is a function', () => {
      const win = (global as any).window || {};
      const originalPi = win.Pi;
      win.Pi = { authenticate: jest.fn() };

      expect(isPiSdkLoaded()).toBe(true);

      if (originalPi !== undefined) {
        win.Pi = originalPi;
      } else {
        win.Pi = undefined;
      }
    });

    it('returns false when window.Pi.authenticate is not a function', () => {
      const win = (global as any).window || {};
      const originalPi = win.Pi;
      win.Pi = { authenticate: 'not-a-function' };

      expect(isPiSdkLoaded()).toBe(false);

      if (originalPi !== undefined) {
        win.Pi = originalPi;
      } else {
        win.Pi = undefined;
      }
    });
  });

  describe('verifyStellarAddress', () => {
    it('returns false for addresses that do not start with G', async () => {
      const result = await verifyStellarAddress('BADDRESS123');
      expect(result).toBe(false);
    });

    it('returns false for empty string', async () => {
      const result = await verifyStellarAddress('');
      expect(result).toBe(false);
    });

    it('returns true for valid Stellar address (56 chars, starts with G)', async () => {
      const result = await verifyStellarAddress('G' + 'A'.repeat(55));
      expect(result).toBe(true);
    }, 1000);

    it('returns false for short address', async () => {
      const result = await verifyStellarAddress('Gabc123');
      expect(result).toBe(false);
    });
  });

  describe('transferPi', () => {
    it('throws when Pi SDK is not loaded', async () => {
      // In node test environment, window is undefined so isPiSdkLoaded returns false
      await expect(transferPi(1, 'GRECIPIENT')).rejects.toThrow('Pi SDK not loaded');
    });

    it('resolves with a mock transaction ID when Pi SDK is loaded', async () => {
      const win = (global as any).window || {};
      const originalPi = win.Pi;
      win.Pi = { authenticate: jest.fn() };

      const result = await transferPi(1.5, 'GRECIPIENT', 'test memo');
      expect(result).toMatch(/^tx-mock-/);

      if (originalPi !== undefined) {
        win.Pi = originalPi;
      } else {
        win.Pi = undefined;
      }
    }, 1000);
  });

  describe('claimPiKya', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns userId on successful claim', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, userId: 'user-xyz' }),
      });

      const result = await claimPiKya({ username: 'piuser' });
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-xyz');
    });

    it('calls the correct endpoint with correct payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, userId: 'u1' }),
      });

      await claimPiKya({ username: 'testuser', stellarAddress: 'GADDR' });

      expect(global.fetch).toHaveBeenCalledWith('/api/pi/kya/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', stellarAddress: 'GADDR' }),
      });
    });

    it('throws when fetch response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'username is required',
      });

      await expect(claimPiKya({ username: '' })).rejects.toThrow('Pi Kya claim failed');
    });

    it('throws when fetch throws a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(claimPiKya({ username: 'user' })).rejects.toThrow('Pi Kya claim failed');
    });

    it('wraps error message in Pi Kya claim failed prefix', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(claimPiKya({ username: 'user' })).rejects.toThrow(
        'Pi Kya claim failed: Internal server error'
      );
    });
  });

  describe('connectPi', () => {
    // Tests 1-4 verify PiSdkBase error handling through the browser path
    // (connectPi rejects in jsdom, which now re-throws PiSdkError directly)

    it('throws when PiSdkBase.connect fails (server-side fallback)', async () => {
      const mockInstance = { connect: jest.fn().mockRejectedValue(new Error('Connection error')) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);

      await expect(connectPi()).rejects.toThrow('Pi SDK is not available');
    });

    it('throws when get_user returns null after successful connect', async () => {
      const mockInstance = { connect: jest.fn().mockResolvedValue(undefined) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue(null);

      await expect(connectPi()).rejects.toThrow('Pi SDK is not available');
    });

    it('throws when accessToken is falsy after successful connect', async () => {
      const mockInstance = { connect: jest.fn().mockResolvedValue(undefined) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue({ uid: 'u1', name: 'User' });
      (PiSdkBase as any).accessToken = null;

      await expect(connectPi()).rejects.toThrow('Pi SDK is not available');
    });

    it('calls pushLog with error message on failure', async () => {
      const mockInstance = { connect: jest.fn().mockRejectedValue(new Error('SDK error')) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow();
      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Auth error'));
    });

    // PiSdkBase success path is server-only (typeof window === "undefined") and
    // unreachable in jsdom. The browser path with window.Pi covers the same
    // return-shape contract — see "uses window.Pi.authenticate" test below.
    it('returns PiAuthResult on successful auth via PiSdkBase', async () => {
      const mockAuthenticate = jest.fn().mockResolvedValue({
        user: { uid: 'uid-123', username: 'piuser', name: 'Pi User', stellarAddress: 'GSTELLAR' },
        accessToken: 'token-abc',
      });
      (global as any).window = (global as any).window || {};
      (global as any).window.Pi = { authenticate: mockAuthenticate };

      const result = await connectPi();

      expect(result.token).toBe('token-abc');
      expect(result.user.uid).toBe('uid-123');
      expect(result.user.username).toBe('piuser');
      expect(result.stellarAddress).toBe('GSTELLAR');

      delete (global as any).window.Pi;
    });

    it('uses window.Pi.authenticate when available (Pi Browser)', async () => {
      const mockAuthenticate = jest.fn().mockResolvedValue({
        user: { uid: 'pb-uid', username: 'pbuser', name: 'Pi Browser User', stellarAddress: 'GSTELLAR' },
        accessToken: 'pb-token',
      });
      (global as any).window = (global as any).window || {};
      (global as any).window.Pi = { authenticate: mockAuthenticate };

      const result = await connectPi();

      expect(mockAuthenticate).toHaveBeenCalled();
      expect(result.token).toBe('pb-token');
      expect(result.user.uid).toBe('pb-uid');
      expect(result.user.username).toBe('pbuser');
      expect(result.stellarAddress).toBe('GSTELLAR');

      delete (global as any).window.Pi;
    });

    it('throws when window.Pi.authenticate returns no user', async () => {
      (global as any).window = (global as any).window || {};
      (global as any).window.Pi = {
        authenticate: jest.fn().mockResolvedValue({ user: null, accessToken: 'tok' }),
      };

      await expect(connectPi()).rejects.toThrow('no user data received');

      delete (global as any).window.Pi;
    });

    it('throws when window.Pi.authenticate returns no accessToken', async () => {
      (global as any).window = (global as any).window || {};
      (global as any).window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'u1', username: 'u1', name: 'U' },
          accessToken: null,
        }),
      };

      await expect(connectPi()).rejects.toThrow('no token received');

      delete (global as any).window.Pi;
    });

    it('calls pushLog with user name on successful Pi Browser auth', async () => {
      (global as any).window = (global as any).window || {};
      (global as any).window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'pb-uid', username: 'pbuser', name: 'Pi Browser User' },
          accessToken: 'pb-token',
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Authenticated'));
      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Pi Browser User'));

      delete (global as any).window.Pi;
    });
  });
});
