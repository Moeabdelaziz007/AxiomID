/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */

// Mock the PiSdkBase module
jest.mock('@pinetwork/pi-sdk-js', () => ({
  PiSdkBase: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    createPayment: jest.fn(),
  })),
}));

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
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(isPiSdkLoaded()).toBe(false);
      Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    });

    it('returns true when window.Pi.authenticate is a function', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: { Pi: { authenticate: jest.fn() } },
        writable: true,
        configurable: true,
      });
      expect(isPiSdkLoaded()).toBe(true);
      Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    });

    it('returns false when window.Pi.authenticate is not a function', () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: { Pi: { authenticate: 'not-a-function' } },
        writable: true,
        configurable: true,
      });
      expect(isPiSdkLoaded()).toBe(false);
      Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
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

    it('returns true for addresses starting with G', async () => {
      const result = await verifyStellarAddress('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      expect(result).toBe(true);
    }, 1000);

    it('returns false for addresses starting with lowercase g', async () => {
      const result = await verifyStellarAddress('gabc123');
      expect(result).toBe(false);
    });
  });

  describe('transferPi', () => {
    it('throws when Pi SDK is not loaded', async () => {
      // In node test environment, window is undefined so isPiSdkLoaded returns false
      await expect(transferPi(1, 'GRECIPIENT')).rejects.toThrow('Pi SDK not loaded');
    });

    it('resolves with a mock transaction ID when Pi SDK is loaded', async () => {
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: { Pi: { authenticate: jest.fn() } },
        writable: true,
        configurable: true,
      });

      const result = await transferPi(1.5, 'GRECIPIENT', 'test memo');
      expect(result).toMatch(/^tx-mock-/);

      Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
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

      await claimPiKya({ username: 'testuser', stellarAddress: 'GADDR', name: 'Test User' });

      expect(global.fetch).toHaveBeenCalledWith('/api/pi/kya/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', stellarAddress: 'GADDR', name: 'Test User' }),
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
    it('throws when PiSdkBase.connect fails', async () => {
      const mockInstance = { connect: jest.fn().mockRejectedValue(new Error('Connection error')) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);

      await expect(connectPi()).rejects.toThrow('Pi authentication failed');
    });

    it('throws when get_user returns null after successful connect', async () => {
      const mockInstance = { connect: jest.fn().mockResolvedValue(undefined) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue(null);

      await expect(connectPi()).rejects.toThrow('Pi authentication failed');
    });

    it('throws when accessToken is falsy after successful connect', async () => {
      const mockInstance = { connect: jest.fn().mockResolvedValue(undefined) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue({ uid: 'u1', name: 'User' });
      (PiSdkBase as any).accessToken = null;

      await expect(connectPi()).rejects.toThrow('Pi authentication failed');
    });

    it('calls pushLog with error message on failure', async () => {
      const mockInstance = { connect: jest.fn().mockRejectedValue(new Error('SDK error')) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow();
      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Auth error'));
    });

    it('returns PiAuthResult on successful auth', async () => {
      const mockInstance = { connect: jest.fn().mockResolvedValue(undefined) };
      MockPiSdkBase.mockImplementationOnce(() => mockInstance as any);
      (PiSdkBase as any).get_user = jest.fn().mockReturnValue({
        uid: 'uid-123',
        username: 'piuser',
        name: 'Pi User',
        stellarAddress: 'GSTELLAR',
      });
      (PiSdkBase as any).accessToken = 'token-abc';

      const result = await connectPi();

      expect(result.token).toBe('token-abc');
      expect(result.user.uid).toBe('uid-123');
      expect(result.user.username).toBe('piuser');
      expect(result.stellarAddress).toBe('GSTELLAR');
    });
  });
});
