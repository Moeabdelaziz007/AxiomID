 
/**
 * @jest-environment node
 */

import {
  createPiPayment,
  connectPi,
  checkPiBrowser,
} from '@/lib/pi-sdk';

interface MutableGlobals {
  window: { Pi?: { authenticate: jest.Mock } };
  navigator: Record<string, unknown>;
  document: Record<string, unknown>;
}

const g = global as unknown as MutableGlobals;

const makeMockToken = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2)}`;

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
      const token = makeMockToken('token-abc');
      const mockAuthenticate = jest.fn().mockResolvedValue({
        user: { uid: 'uid-123', username: 'piuser', name: 'Pi User', stellarAddress: 'GSTELLAR' },
        accessToken: token,
      });
      g.window = g.window || {};
      g.window.Pi = { authenticate: mockAuthenticate };

      const result = await connectPi();

      expect(mockAuthenticate).toHaveBeenCalledWith(
        expect.arrayContaining(["username", "payments"]),
        expect.any(Function)
      );
      expect(result.token).toBe(token);
      expect(result.user.uid).toBe('uid-123');
      expect(result.user.username).toBe('piuser');
      expect(result.stellarAddress).toBe('GSTELLAR');

      delete g.window.Pi;
    });

    it('uses window.Pi.authenticate when available (Pi Browser)', async () => {
      const token = makeMockToken('pb-token');
      const mockAuthenticate = jest.fn().mockResolvedValue({
        user: { uid: 'pb-uid', username: 'pbuser', name: 'Pi Browser User', stellarAddress: 'GSTELLAR' },
        accessToken: token,
      });
      g.window = g.window || {};
      g.window.Pi = { authenticate: mockAuthenticate };

      const result = await connectPi();

      expect(mockAuthenticate).toHaveBeenCalledWith(
        expect.arrayContaining(["username", "payments"]),
        expect.any(Function)
      );
      expect(mockAuthenticate).toHaveBeenCalled();
      expect(result.token).toBe(token);
      expect(result.user.uid).toBe('pb-uid');
      expect(result.user.username).toBe('pbuser');
      expect(result.stellarAddress).toBe('GSTELLAR');

      delete g.window.Pi;
    });

    it('throws when window.Pi.authenticate returns no user', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({ user: null, accessToken: makeMockToken('tok') }),
      };

      await expect(connectPi()).rejects.toThrow('no user data received');

      delete g.window.Pi;
    });

    it('throws when window.Pi.authenticate returns no accessToken', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'u1', username: 'u1', name: 'U' },
          accessToken: null,
        }),
      };

      await expect(connectPi()).rejects.toThrow('no token received');

      delete g.window.Pi;
    });

    it('calls pushLog with user name on successful Pi Browser auth', async () => {
      const token = makeMockToken('pb-token');
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'pb-uid', username: 'pbuser', name: 'Pi Browser User' },
          accessToken: token,
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      expect(window.Pi.authenticate).toHaveBeenCalledWith(
        expect.arrayContaining(["username", "payments"]),
        expect.any(Function)
      );
      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Authenticated'));
      expect(pushLog).toHaveBeenCalledWith(expect.stringContaining('Pi Browser User'));

      delete g.window.Pi;
    });

    // PR change: connectPi now emits structured [DEBUG] prefixed log messages
    // at each stage of the authentication flow for easier console filtering.
    it('emits [DEBUG] Starting Pi authentication flow as the first log message', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'debug-uid', username: 'debuguser', name: 'Debug User' },
          accessToken: makeMockToken('debug-token'),
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages[0]).toBe('[DEBUG] Starting Pi authentication flow...');

      delete g.window.Pi;
    });

    it('emits [DEBUG] Browser environment detected log after flow start', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'debug-uid2', username: 'debuguser2', name: 'Debug User 2' },
          accessToken: makeMockToken('debug-token-2'),
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages.some((m) => m.includes('[DEBUG] Browser environment detected'))).toBe(true);

      delete g.window.Pi;
    });

    it('emits [DEBUG] Pi SDK loaded successfully and sandbox mode logs', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'debug-uid3', username: 'debuguser3', name: 'Debug User 3' },
          accessToken: makeMockToken('debug-token-3'),
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages.some((m) => m === '[DEBUG] Pi SDK loaded successfully')).toBe(true);
      expect(messages.some((m) => m.startsWith('[DEBUG] Sandbox mode:'))).toBe(true);
      expect(messages.some((m) => m === '[DEBUG] Environment variables check:')).toBe(true);

      delete g.window.Pi;
    });

    it('emits [DEBUG] Calling Pi.authenticate() and [DEBUG] returned successfully on success', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'debug-uid4', username: 'debuguser4', name: 'Debug User 4' },
          accessToken: makeMockToken('debug-token-4'),
        }),
      };
      const pushLog = jest.fn();

      await connectPi(pushLog);

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages.some((m) => m.includes('[DEBUG] Calling Pi.authenticate() with timeout'))).toBe(true);
      expect(messages.some((m) => m === '[DEBUG] Pi.authenticate() returned successfully')).toBe(true);

      delete g.window.Pi;
    });

    it('emits [DEBUG] PiSdkError: prefix (not old "Auth error:") when authentication fails', async () => {
      // When a PiSdkError is thrown (e.g. no user data), the new log format uses
      // "[DEBUG] PiSdkError: {code} - {message}" instead of the old "Auth error:" prefix.
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({ user: null, accessToken: makeMockToken('tok') }),
      };
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow('no user data received');

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      const pisdk = messages.find((m) => m.startsWith('[DEBUG] PiSdkError:'));
      expect(pisdk).toBeDefined();
      // Verify it contains both the error code and a dash separator
      expect(pisdk).toMatch(/\[DEBUG\] PiSdkError: \w+ - .+/);

      delete g.window.Pi;
    });

    it('emits [DEBUG] Authentication failed log when no user is returned', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({ user: null, accessToken: makeMockToken('tok') }),
      };
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow();

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages.some((m) => m === '[DEBUG] Authentication failed - no user data received')).toBe(true);

      delete g.window.Pi;
    });

    it('emits [DEBUG] Authentication failed - no token received when token is missing', async () => {
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockResolvedValue({
          user: { uid: 'u-no-tok', username: 'notok', name: 'No Token' },
          accessToken: null,
        }),
      };
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow('no token received');

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      expect(messages.some((m) => m === '[DEBUG] Authentication failed - no token received')).toBe(true);

      delete g.window.Pi;
    });

    it('emits [DEBUG] Generic error log for non-PiSdkError exceptions', async () => {
      // When authenticate() throws a plain Error (not a PiSdkError), the catch block
      // uses "[DEBUG] Generic error: {message}" before wrapping it in a PiSdkError.
      g.window = g.window || {};
      g.window.Pi = {
        authenticate: jest.fn().mockRejectedValue(new Error('Network timeout')),
      };
      const pushLog = jest.fn();

      await expect(connectPi(pushLog)).rejects.toThrow();

      const messages: string[] = pushLog.mock.calls.map(([msg]: [string]) => msg);
      const genericMsg = messages.find((m) => m.startsWith('[DEBUG] Generic error:'));
      expect(genericMsg).toBeDefined();
      expect(genericMsg).toContain('Network timeout');

      delete g.window.Pi;
    });
  });

  describe('checkPiBrowser', () => {
    const originalWindow = g.window;
    const originalNavigator = g.navigator;
    const originalDocument = g.document;

    beforeEach(() => {
      g.window = undefined;
      g.navigator = undefined;
      g.document = undefined;
    });

    afterEach(() => {
      g.window = originalWindow;
      g.navigator = originalNavigator;
      g.document = originalDocument;
    });

    it('returns false when window is undefined', () => {
      expect(checkPiBrowser()).toBe(false);
    });

    // window.Pi check was removed from checkPiBrowser (prevents false positives
    // when SDK is loaded in regular browsers) — tests relying on that are removed.

    it('returns true when userAgent contains Pi Browser', () => {
      g.window = {};
      g.navigator = { userAgent: 'Pi Browser' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns true when inside iframe with minepi.com referrer', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: 'https://minepi.com/auth' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns true when inside iframe with sandbox.minepi.com referrer', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: 'https://sandbox.minepi.com/auth' };
      expect(checkPiBrowser()).toBe(true);
    });

    it('returns false when inside iframe with evil-minepi.com referrer', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: 'https://evil-minepi.com/auth' };
      expect(checkPiBrowser()).toBe(false);
    });

    it('returns false when inside iframe with sandbox.minepi.com.attacker.com referrer', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: 'https://sandbox.minepi.com.attacker.com/auth' };
      expect(checkPiBrowser()).toBe(false);
    });

    it('handles relative referrers without throwing uncaught exceptions', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: '/dashboard' };
      expect(checkPiBrowser()).toBe(false);
    });

    it('handles invalid scheme referrers without throwing uncaught exceptions', () => {
      g.window = { self: {}, top: {} };
      g.navigator = { userAgent: '' };
      g.document = { referrer: 'invalid-scheme://foo' };
      expect(checkPiBrowser()).toBe(false);
    });
  });

  // PR change: ensurePiInitialized now defers to the sandbox parent's
  // postMessage (by passing sandbox: false to Pi.init()) whenever the page is
  // loaded inside a Pi sandbox iframe, instead of always using
  // determineSandboxMode(). This avoids the SDK receiving conflicting
  // sandbox=true + Prod=true signals. isPiSandboxIframe() itself is not
  // exported, so its behavior is exercised indirectly through the value
  // passed to Pi.init().
  //
  // Both `loadPiSdk()` and the top of `ensurePiInitialized()` special-case
  // `NODE_ENV === "test"`, short-circuiting before Pi.init() is ever called.
  // These tests therefore run with NODE_ENV temporarily set to
  // "development" so the real init path (and the new sandbox-detection
  // logic) executes. `isInitialized` is module-scoped, so each test resets
  // the module registry and re-imports pi-sdk to get a clean instance.
  describe('ensurePiInitialized — sandbox iframe detection', () => {
    const originalWindow = g.window;
    const originalNavigator = g.navigator;
    const originalDocument = g.document;
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv, NODE_ENV: 'development' };
    });

    afterEach(() => {
      g.window = originalWindow;
      g.navigator = originalNavigator;
      g.document = originalDocument;
      process.env = originalEnv;
    });

    it('uses determineSandboxMode() when not inside an iframe (window.self === window.top)', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      g.window = {
        Pi: { init: initMock },
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: '' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: true });
    });

    it('overrides sandbox to false when loaded inside a sandbox.minepi.com iframe, even if determineSandboxMode() would return true', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      const selfRef = {};
      const topRef = {};
      g.window = {
        Pi: { init: initMock },
        self: selfRef,
        top: topRef,
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: 'https://sandbox.minepi.com/parent' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: false });
    });

    it('overrides sandbox to false for a sandbox.minepi.com subdomain referrer (e.g. foo.sandbox.minepi.com)', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      g.window = {
        Pi: { init: initMock },
        self: {},
        top: {},
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: 'https://foo.sandbox.minepi.com/parent' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: false });
    });

    it('does not override sandbox when inside an iframe with a non-sandbox referrer (e.g. minepi.com)', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      g.window = {
        Pi: { init: initMock },
        self: {},
        top: {},
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: 'https://minepi.com/parent' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: true });
    });

    it('does not override sandbox for a lookalike domain referrer (sandbox.minepi.com.attacker.com)', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      g.window = {
        Pi: { init: initMock },
        self: {},
        top: {},
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: 'https://sandbox.minepi.com.attacker.com/parent' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: true });
    });

    it('does not treat an iframe with an empty referrer as a sandbox iframe', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      g.window = {
        Pi: { init: initMock },
        self: {},
        top: {},
        location: { hostname: 'app.example.com', search: '' },
      } as unknown as MutableGlobals['window'];
      g.document = { referrer: '' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await ensurePiInitialized();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: true });
    });

    it('falls back to determineSandboxMode() without throwing when window.top access throws (cross-origin restriction)', async () => {
      process.env.NEXT_PUBLIC_PI_SANDBOX = 'true';
      const initMock = jest.fn();
      const winObj: Record<string, unknown> = {
        Pi: { init: initMock },
        location: { hostname: 'app.example.com', search: '' },
      };
      Object.defineProperty(winObj, 'self', { get: () => ({}), configurable: true });
      Object.defineProperty(winObj, 'top', {
        get: () => {
          throw new Error('cross-origin access blocked');
        },
        configurable: true,
      });
      g.window = winObj as unknown as MutableGlobals['window'];
      g.document = { referrer: 'https://sandbox.minepi.com/parent' };
      g.navigator = { userAgent: '' };

      const { ensurePiInitialized } = await import('@/lib/pi-sdk');
      await expect(ensurePiInitialized()).resolves.toBeDefined();

      expect(initMock).toHaveBeenCalledWith({ version: '2.0', sandbox: true });
    });
  });
});
