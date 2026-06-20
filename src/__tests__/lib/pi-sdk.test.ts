 
/**
 * @jest-environment node
 */

import {
  createPiPayment,
  connectPi,
  checkPiBrowser,
} from '@/lib/pi-sdk';

describe('pi-sdk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPiPayment', () => {
    it('throws when Pi SDK is not loaded', async () => {
      await expect(createPiPayment(1, 'test memo')).rejects.toThrow('Pi SDK not loaded');
    });
  });

  describe('connectPi', () => {
    it('throws when Pi SDK is not available (node environment)', async () => {
      await expect(connectPi()).rejects.toThrow('Pi Browser required');
    });

    it('returns PiAuthResult on successful auth via window.Pi', async () => {
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

  describe('checkPiBrowser', () => {
    const originalWindow = (global as any).window;
    const originalNavigator = (global as any).navigator;
    const originalDocument = (global as any).document;

    beforeEach(() => {
      (global as any).window = undefined;
      (global as any).navigator = undefined;
      (global as any).document = undefined;
    });

    afterEach(() => {
      (global as any).window = originalWindow;
      (global as any).navigator = originalNavigator;
      (global as any).document = originalDocument;
    });

    it('returns false when window is undefined', () => {
      expect(checkPiBrowser()).toBe(false);
    });

    it('returns true when window.Pi is defined', () => {
      (global as any).window = { Pi: {} };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns true when userAgent contains Pi Browser', () => {
      (global as any).window = {};
      (global as any).navigator = { userAgent: 'Pi Browser' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns true when inside iframe with minepi.com referrer', () => {
      (global as any).window = { self: {}, top: {} };
      (global as any).navigator = { userAgent: '' };
      (global as any).document = { referrer: 'https://minepi.com/auth' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns true when inside iframe with sandbox.minepi.com referrer', () => {
      (global as any).window = { self: {}, top: {} };
      (global as any).navigator = { userAgent: '' };
      (global as any).document = { referrer: 'https://sandbox.minepi.com/auth' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns false when inside iframe with evil-minepi.com referrer', () => {
      (global as any).window = { self: {}, top: {} };
      (global as any).navigator = { userAgent: '' };
      (global as any).document = { referrer: 'https://evil-minepi.com/auth' };
      expect(checkPiBrowser()).toBe(false);
    });

    it('returns false when inside iframe with sandbox.minepi.com.attacker.com referrer', () => {
      (global as any).window = { self: {}, top: {} };
      (global as any).navigator = { userAgent: '' };
      (global as any).document = { referrer: 'https://sandbox.minepi.com.attacker.com/auth' };
      expect(checkPiBrowser()).toBe(false);
    });
  });
});
