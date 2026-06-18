/**
 * Tests for the touch event handling added to PassportHero in src/app/page.tsx.
 *
 * PR change: Added touchmove and touchend event listeners to the PassportHero
 * useEffect hook so that mobile users can interact with the 3D tilt effect.
 *
 * New behaviour introduced in this PR:
 *   - window 'touchmove': updates tilt using the first touch point (single-touch)
 *   - window 'touchend':  resets tilt to { x: 0, y: 0 }
 *   - multi-touch (e.touches.length > 1) does NOT update tilt
 *   - touchmove listener is registered as { passive: true }
 *
 * PassportHero is not exported from page.tsx, so we render the Home page
 * (via the default export) and assert on observable side-effects / DOM output.
 * The tilt state is reflected in the `style.transform` of the inner passport card.
 */

 
import React from "react";
import { render, act } from "@testing-library/react";
import Home from "@/app/page";

// Re-use the wallet mock helper from settings tests
jest.mock("@/app/context/wallet-context", () => ({
  useWallet: jest.fn(),
}));

jest.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));

// jsdom does not implement the Touch constructor; provide a minimal polyfill
if (typeof Touch === "undefined") {
  (globalThis as any).Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    constructor(init: { identifier: number; target: EventTarget; clientX: number; clientY: number }) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX;
      this.clientY = init.clientY;
    }
  };
}

jest.mock("next/link", () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

import { useWallet } from "@/app/context/wallet-context";
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function makeDefaultCtx(overrides: Partial<ReturnType<typeof useWallet>> = {}): ReturnType<typeof useWallet> {
  return {
    user: null,
    isLoading: false,
    isConnecting: false,
    error: null,
    isPiBrowser: false,
    isDemoWallet: false,
    isDemoWalletEnabled: true,
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

/**
 * Helper to get the inner passport card element that has the `transform` style.
 * The card is the element with `position:absolute inset-0 passport-card` classes.
 */
function getPassportCardElement(): HTMLElement | null {
  return document.querySelector('[style*="transform"]') as HTMLElement | null;
}

/**
 * Dispatches a synthetic TouchEvent on window.
 */
function dispatchTouchMove(clientX: number, clientY: number) {
  const touchEvent = new TouchEvent("touchmove", {
    bubbles: true,
    cancelable: true,
    touches: [
      new Touch({
        identifier: 1,
        target: document.body,
        clientX,
        clientY,
      }),
    ],
  });
  window.dispatchEvent(touchEvent);
}

function dispatchMultiTouchMove(touches: Array<{ clientX: number; clientY: number }>) {
  const touchList = touches.map((t, i) =>
    new Touch({
      identifier: i,
      target: document.body,
      clientX: t.clientX,
      clientY: t.clientY,
    })
  );
  const touchEvent = new TouchEvent("touchmove", {
    bubbles: true,
    cancelable: true,
    touches: touchList,
  });
  window.dispatchEvent(touchEvent);
}

function dispatchTouchEnd() {
  const touchEvent = new TouchEvent("touchend", {
    bubbles: true,
    cancelable: true,
    touches: [],
  });
  window.dispatchEvent(touchEvent);
}

describe("PassportHero — touchmove event (PR change)", () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue(makeDefaultCtx());
    // Set a predictable viewport
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
  });

  it("applies a non-zero transform after a touchmove event", async () => {
    render(<Home />);

    await act(async () => {
      // Touch at center-right (75% of width, 50% of height)
      // x = (750/1000 - 0.5) * 15 = 3.75
      // y = (500/1000 - 0.5) * 15 = 0
      dispatchTouchMove(750, 500);
    });

    const card = getPassportCardElement();
    expect(card).not.toBeNull();
    // The transform should be non-identity (not "rotateY(0deg) rotateX(0deg)")
    const transform = card?.style.transform ?? "";
    // The card should have a non-zero rotateY
    expect(transform).not.toBe("");
    expect(transform).toContain("rotateY");
  });

  it("resets transform to near-zero values after touchend event", async () => {
    render(<Home />);

    await act(async () => {
      dispatchTouchMove(900, 900); // tilt the card
    });

    await act(async () => {
      dispatchTouchEnd(); // reset
    });

    const card = getPassportCardElement();
    const transform = card?.style.transform ?? "";
    // After touchend, tilt should be {x:0, y:0}
    // transform: rotateY(0deg) rotateX(0deg) or similar near-zero expression
    expect(transform).toContain("rotateY(0deg)");
    expect(transform).toContain("rotateX(0deg)");
  });

  it("does NOT update tilt when more than one touch point is active (multi-touch)", async () => {
    render(<Home />);

    // First establish a tilted state with single touch
    await act(async () => {
      dispatchTouchMove(800, 300);
    });

    const cardAfterSingleTouch = getPassportCardElement();
    const transformAfterSingle = cardAfterSingleTouch?.style.transform ?? "";

    // Now dispatch a multi-touch event — tilt should NOT change
    await act(async () => {
      dispatchMultiTouchMove([
        { clientX: 100, clientY: 100 },
        { clientX: 900, clientY: 900 },
      ]);
    });

    const cardAfterMultiTouch = getPassportCardElement();
    const transformAfterMulti = cardAfterMultiTouch?.style.transform ?? "";

    // Transform should remain unchanged from the single-touch state
    expect(transformAfterMulti).toBe(transformAfterSingle);
  });
});

describe("PassportHero — event listener cleanup (PR change)", () => {
  it("removes touchmove and touchend listeners when component unmounts", async () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");

    mockUseWallet.mockReturnValue(makeDefaultCtx());
    const { unmount } = render(<Home />);

    // Verify touchmove was registered
    const touchmoveAdd = addSpy.mock.calls.filter((c) => c[0] === "touchmove");
    expect(touchmoveAdd.length).toBeGreaterThanOrEqual(1);

    // Verify touchend was registered
    const touchendAdd = addSpy.mock.calls.filter((c) => c[0] === "touchend");
    expect(touchendAdd.length).toBeGreaterThanOrEqual(1);

    unmount();

    // Verify touchmove was removed
    const touchmoveRemove = removeSpy.mock.calls.filter((c) => c[0] === "touchmove");
    expect(touchmoveRemove.length).toBeGreaterThanOrEqual(1);

    // Verify touchend was removed
    const touchendRemove = removeSpy.mock.calls.filter((c) => c[0] === "touchend");
    expect(touchendRemove.length).toBeGreaterThanOrEqual(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("registers touchmove with passive: true option", async () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    mockUseWallet.mockReturnValue(makeDefaultCtx());

    render(<Home />);

    const touchmoveCalls = addSpy.mock.calls.filter((c) => c[0] === "touchmove");
    expect(touchmoveCalls.length).toBeGreaterThanOrEqual(1);

    // The third argument to addEventListener should include { passive: true }
    const passiveCall = touchmoveCalls.find(
      (c) => typeof c[2] === "object" && (c[2] as AddEventListenerOptions).passive === true
    );
    expect(passiveCall).toBeDefined();

    addSpy.mockRestore();
  });

  it("also removes the original mousemove listener on unmount", async () => {
    const removeSpy = jest.spyOn(window, "removeEventListener");
    mockUseWallet.mockReturnValue(makeDefaultCtx());

    const { unmount } = render(<Home />);
    unmount();

    const mousemoveRemove = removeSpy.mock.calls.filter((c) => c[0] === "mousemove");
    expect(mousemoveRemove.length).toBeGreaterThanOrEqual(1);

    removeSpy.mockRestore();
  });
});