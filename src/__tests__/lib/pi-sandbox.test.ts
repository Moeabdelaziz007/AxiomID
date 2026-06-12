/**
 * Tests for src/lib/pi-sandbox.ts
 *
 * Covers the changes introduced in this PR:
 * - patchPostMessageForSandbox: idempotency (PATCH_FLAG), string targetOrigin
 *   normalisation, WindowPostMessageOptions.targetOrigin normalisation
 * - Pi origin detection logic (PI_MESSAGE_ORIGINS set + minepi.com subdomain)
 * - listenForPiSDKMessages: communication_information_response handling,
 *   fallback to "*" when event.origin is empty
 * - initSandboxCompatibility: server-side guard (typeof window === "undefined")
 */

// Use jsdom environment (project default).

import { patchPostMessageForSandbox, listenForPiSDKMessages, initSandboxCompatibility } from '@/lib/pi-sandbox';

// -----------------------------------------------------------------------
// Helpers to reset the patch flag between tests.
// -----------------------------------------------------------------------
const PATCH_FLAG = '__axiomidPiPostMessagePatched';

function resetPatchFlag() {
  delete (window as any)[PATCH_FLAG];
}

function setOriginalPostMessage(fn: typeof window.postMessage) {
  // Bypass the patch by directly setting the native implementation mock
  Object.defineProperty(window, 'postMessage', {
    value: fn,
    configurable: true,
    writable: true,
  });
}

// -----------------------------------------------------------------------
// patchPostMessageForSandbox — idempotency
// -----------------------------------------------------------------------
describe('patchPostMessageForSandbox — idempotency', () => {
  afterEach(() => {
    resetPatchFlag();
    // Restore a fresh postMessage spy so subsequent tests start clean
    Object.defineProperty(window, 'postMessage', {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
  });

  it('sets the patch flag on first call', () => {
    patchPostMessageForSandbox();
    expect((window as any)[PATCH_FLAG]).toBe(true);
  });

  it('does not re-patch when called a second time', () => {
    const firstImpl = window.postMessage;
    patchPostMessageForSandbox();
    const afterFirst = window.postMessage;
    patchPostMessageForSandbox(); // second call — should be a no-op
    expect(window.postMessage).toBe(afterFirst);
  });

  it('replaces window.postMessage with a new function on first call', () => {
    const originalFn = jest.fn();
    setOriginalPostMessage(originalFn);
    resetPatchFlag();

    patchPostMessageForSandbox();
    expect(window.postMessage).not.toBe(originalFn);
  });
});

// -----------------------------------------------------------------------
// patchPostMessageForSandbox — string targetOrigin paths
// -----------------------------------------------------------------------
describe('patchPostMessageForSandbox — string targetOrigin normalisation', () => {
  let spy: jest.Mock;

  beforeEach(() => {
    resetPatchFlag();
    spy = jest.fn();
    setOriginalPostMessage(spy);
    patchPostMessageForSandbox();
  });

  afterEach(() => {
    resetPatchFlag();
    Object.defineProperty(window, 'postMessage', {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
  });

  it('passes "*" through unchanged', () => {
    window.postMessage('msg', '*');
    expect(spy).toHaveBeenCalledWith('msg', '*');
  });

  it('passes "/" through unchanged', () => {
    window.postMessage('msg', '/');
    expect(spy).toHaveBeenCalledWith('msg', '/');
  });

  it('passes window.location.origin through unchanged', () => {
    window.postMessage('msg', window.location.origin);
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('rewrites a known Pi origin (https://app-cdn.minepi.com) to window.location.origin', () => {
    window.postMessage('msg', 'https://app-cdn.minepi.com');
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('rewrites https://sdk.minepi.com to window.location.origin', () => {
    window.postMessage('msg', 'https://sdk.minepi.com');
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('rewrites https://minepi.com to window.location.origin', () => {
    window.postMessage('msg', 'https://minepi.com');
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('rewrites https://sandbox.minepi.com to window.location.origin', () => {
    window.postMessage('msg', 'https://sandbox.minepi.com');
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('rewrites an arbitrary minepi.com subdomain to window.location.origin', () => {
    window.postMessage('msg', 'https://sub.minepi.com');
    expect(spy).toHaveBeenCalledWith('msg', window.location.origin);
  });

  it('does NOT rewrite an unrelated origin', () => {
    window.postMessage('msg', 'https://example.com');
    expect(spy).toHaveBeenCalledWith('msg', 'https://example.com');
  });
});

// -----------------------------------------------------------------------
// patchPostMessageForSandbox — WindowPostMessageOptions path
// -----------------------------------------------------------------------
describe('patchPostMessageForSandbox — WindowPostMessageOptions targetOrigin normalisation', () => {
  let spy: jest.Mock;

  beforeEach(() => {
    resetPatchFlag();
    spy = jest.fn();
    setOriginalPostMessage(spy);
    patchPostMessageForSandbox();
  });

  afterEach(() => {
    resetPatchFlag();
    Object.defineProperty(window, 'postMessage', {
      value: jest.fn(),
      configurable: true,
      writable: true,
    });
  });

  it('rewrites options.targetOrigin for a Pi origin', () => {
    (window.postMessage as any)('msg', { targetOrigin: 'https://app-cdn.minepi.com' });
    expect(spy).toHaveBeenCalledWith(
      'msg',
      expect.objectContaining({ targetOrigin: window.location.origin }),
    );
  });

  it('preserves other option fields when rewriting targetOrigin', () => {
    (window.postMessage as any)('msg', { targetOrigin: 'https://sdk.minepi.com', transfer: [] });
    expect(spy).toHaveBeenCalledWith(
      'msg',
      expect.objectContaining({ targetOrigin: window.location.origin, transfer: [] }),
    );
  });

  it('passes options without targetOrigin through unchanged', () => {
    const opts = { transfer: [] };
    (window.postMessage as any)('msg', opts);
    expect(spy).toHaveBeenCalledWith('msg', opts);
  });

  it('passes options with non-Pi targetOrigin through unchanged', () => {
    (window.postMessage as any)('msg', { targetOrigin: 'https://example.com' });
    expect(spy).toHaveBeenCalledWith(
      'msg',
      expect.objectContaining({ targetOrigin: 'https://example.com' }),
    );
  });
});

// -----------------------------------------------------------------------
// listenForPiSDKMessages — communication_information_response
// -----------------------------------------------------------------------
describe('listenForPiSDKMessages — communication_information_response', () => {
  beforeEach(() => {
    // Clear event listeners by creating a fresh document-level message handler check.
    // jsdom keeps listeners between tests; call listenForPiSDKMessages once per describe block.
  });

  it('responds to @pi:app:sdk:communication_information_request messages', async () => {
    listenForPiSDKMessages();

    const postMessageSpy = jest.fn();
    const fakeSource = { postMessage: postMessageSpy } as any;

    const payload = JSON.stringify({
      type: '@pi:app:sdk:communication_information_request',
      id: 'req-1',
      payload: { slug: 'myapp', name: 'My App' },
    });

    const event = new MessageEvent('message', {
      data: payload,
      origin: 'https://app-cdn.minepi.com',
      source: fakeSource,
    });
    window.dispatchEvent(event);

    // Allow any microtask queue to flush
    await Promise.resolve();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [sentMsg, opts] = postMessageSpy.mock.calls[0];
    const parsed = JSON.parse(sentMsg);
    expect(parsed.type).toBe('@pi:app:sdk:communication_information_response');
    expect(parsed.id).toBe('req-1');
    expect(parsed.payload.slug).toBe('myapp');
    expect(parsed.payload.name).toBe('My App');
    expect(opts.targetOrigin).toBe('https://app-cdn.minepi.com');
  });

  it('uses "*" as targetOrigin when event.origin is an empty string', async () => {
    listenForPiSDKMessages();

    const postMessageSpy = jest.fn();
    const fakeSource = { postMessage: postMessageSpy } as any;

    const payload = JSON.stringify({
      type: '@pi:app:sdk:communication_information_request',
      id: 'req-empty-origin',
      payload: {},
    });

    // MessageEvent does not allow setting origin to "" via constructor options
    // in jsdom — simulate by dispatching a synthetic event with source
    const event = new MessageEvent('message', {
      data: payload,
      origin: '',
      source: fakeSource,
    });
    window.dispatchEvent(event);

    await Promise.resolve();

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [, opts] = postMessageSpy.mock.calls[0];
    expect(opts.targetOrigin).toBe('*');
  });

  it('ignores non-JSON messages without throwing', () => {
    listenForPiSDKMessages();
    expect(() => {
      window.dispatchEvent(new MessageEvent('message', { data: 'not-json' }));
    }).not.toThrow();
  });

  it('ignores non-string message data without throwing', () => {
    listenForPiSDKMessages();
    expect(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { obj: true } }));
    }).not.toThrow();
  });

  it('ignores JSON messages with an unrelated type without responding', async () => {
    listenForPiSDKMessages();

    const postMessageSpy = jest.fn();
    const fakeSource = { postMessage: postMessageSpy } as any;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'some-other-event' }),
        source: fakeSource,
      }),
    );

    await Promise.resolve();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('uses default payload values when payload is absent', async () => {
    listenForPiSDKMessages();

    const postMessageSpy = jest.fn();
    const fakeSource = { postMessage: postMessageSpy } as any;

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: '@pi:app:sdk:communication_information_request', id: 'r2' }),
        origin: 'https://minepi.com',
        source: fakeSource,
      }),
    );

    await Promise.resolve();
    const parsed = JSON.parse(postMessageSpy.mock.calls[0][0]);
    expect(parsed.payload.slug).toBe('');
    expect(parsed.payload.name).toBe('AxiomID');
  });
});

// -----------------------------------------------------------------------
// initSandboxCompatibility — server-side guard
// -----------------------------------------------------------------------
describe('initSandboxCompatibility — server-side guard', () => {
  it('does not throw when called (window is defined in jsdom)', () => {
    expect(() => initSandboxCompatibility()).not.toThrow();
  });

  it('skips patching when window is undefined (simulated SSR)', () => {
    const originalWindow = global.window;
    // Temporarily make typeof window === "undefined"
    Object.defineProperty(global, 'window', {
      value: undefined,
      configurable: true,
    });

    try {
      expect(() => initSandboxCompatibility()).not.toThrow();
    } finally {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
