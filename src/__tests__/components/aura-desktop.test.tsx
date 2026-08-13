/**
 * Tests for the Aura OS desktop primitives (DesktopCanvas engine +
 * DesktopTaskbar live clock and CPU telemetry).
 */

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { DesktopCanvas } from "@/components/os/DesktopCanvas";
import { DesktopTaskbar } from "@/components/os/DesktopTaskbar";
import { DesktopIcons } from "@/components/os/DesktopIcons";
import { WALLPAPERS } from "@/lib/wallpapers";
import { useLanguage } from "@/app/context/language-context";

jest.mock("@/app/context/language-context", () => ({
  useLanguage: jest.fn(),
}));

const mockUseLanguage = useLanguage as unknown as jest.Mock;
mockUseLanguage.mockReturnValue({
  language: "en",
  setLanguage: jest.fn(),
  t: (key: string) => key,
});

const callLog: string[] = [];
const makeFakeCtx = () =>
  new Proxy({ fillStyle: "" } as Record<string, unknown>, {
    get: (target, k) => {
      if (k === "createLinearGradient" || k === "createRadialGradient") {
        callLog.push(String(k));
        return () => ({ addColorStop: () => {} });
      }
      if (!(k in target)) target[k as string] = () => callLog.push(String(k));
      return target[k];
    },
    set: (target, k, v) => {
      target[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

let fakeCtx = makeFakeCtx();

describe("DesktopCanvas — ambient particle engine", () => {
  beforeEach(() => {
    callLog.length = 0;
    fakeCtx = makeFakeCtx();
    jest.useFakeTimers();
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => fakeCtx,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: undefined,
    });
  });

  it("tracks particles via requestAnimationFrame ticks", () => {
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(callLog.some((c) => c.startsWith("clearRect"))).toBe(true);
    expect(callLog.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(70);
    view.unmount();
    const before = callLog.length;
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(callLog.length).toBe(before);
  });

  it("bounces particles at the canvas edges", () => {
    jest
      .spyOn(Math, "random")
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(1)
      .mockReturnValue(0.05);
    render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(callLog.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(140);
  });

  it("tolerates a missing 2d context (no ctx guard)", () => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => null,
    });
    expect(() => {
      render(<DesktopCanvas />);
      act(() => {
        jest.advanceTimersByTime(50);
      });
    }).not.toThrow();
  });

  it("keeps ticking after a window resize", () => {
    render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    window.dispatchEvent(new Event("resize"));
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(callLog.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(140);
  });

  it("paints the default aurora wallpaper then overlays particles", () => {
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(callLog.some((c) => c.startsWith("createLinearGradient"))).toBe(true);
    expect(callLog.filter((c) => c === "arc").length).toBeGreaterThanOrEqual(70);
    view.unmount();
  });

  it("respects an unknown stored wallpaper by falling back to aurora", () => {
    localStorage.setItem("aura.wallpaper", "bogus");
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(callLog.some((c) => c.startsWith("createLinearGradient"))).toBe(true);
    view.unmount();
    localStorage.removeItem("aura.wallpaper");
  });

  it("switches wallpaper live on the aura:wallpaper custom event", () => {
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    callLog.length = 0;
    act(() => {
      window.dispatchEvent(new CustomEvent("aura:wallpaper", { detail: "deep-space" }));
      jest.advanceTimersByTime(50);
    });
    expect(callLog.some((c) => c.startsWith("createRadialGradient"))).toBe(true);
    view.unmount();
  });

  it("falls back to aurora when localStorage is unavailable", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(callLog.some((c) => c.startsWith("createLinearGradient"))).toBe(true);
    spy.mockRestore();
    view.unmount();
  });

  it("falls back to aurora when the selected wallpaper draw throws", () => {
    jest.spyOn(WALLPAPERS[0], "draw").mockImplementationOnce(() => {
      throw new Error("paint fail");
    });
    const view = render(<DesktopCanvas />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(callLog.filter((c) => c === "fillRect").length).toBeGreaterThan(0);
    view.unmount();
  });
});

describe("DesktopTaskbar — live clock and CPU telemetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ globalWorkspace: { attention: 42 } }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the clock and CPU pill from live telemetry", async () => {
    render(<DesktopTaskbar />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/42%/)).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("falls back to an em-dash when telemetry is unavailable", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    render(<DesktopTaskbar />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it("refreshes the clock on its 30s interval", async () => {
    render(<DesktopTaskbar />);
    await act(async () => {
      await Promise.resolve();
    });
    const button = screen.getByRole("button");
    expect(button.firstElementChild?.textContent).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
    expect(button.lastElementChild?.textContent).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByRole("button").textContent).toMatch(/\d{2}:\d{2} (AM|PM)/);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
describe("DesktopIcons — app launcher grid", () => {
  it("renders linked apps and 'soon' apps with their labels", () => {
    render(<DesktopIcons labels={{ agents: "Agents", code: "Code", soon: "soon" }} />);
    expect(screen.getByRole("link", { name: "Agents" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getAllByText("soon")).toHaveLength(5);
  });

  it("falls back to the id when a label is missing", () => {
    render(<DesktopIcons labels={{ soon: "soon" }} />);
    expect(screen.getByRole("link", { name: "agents" })).toHaveAttribute("href", "/dashboard");
  });
});
