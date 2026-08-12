/**
 * Tests for the Aura OS desktop primitives (DesktopCanvas engine +
 * DesktopTaskbar live clock and CPU telemetry).
 */

import React from "react";
import { act, render, screen } from "@testing-library/react";
import { DesktopCanvas } from "@/components/os/DesktopCanvas";
import { DesktopTaskbar } from "@/components/os/DesktopTaskbar";
import { DesktopIcons } from "@/components/os/DesktopIcons";
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
const fakeCtx = {
  clearRect: (...a: unknown[]) => callLog.push(`clearRect:${a.join(",")}`),
  beginPath: () => callLog.push("beginPath"),
  arc: () => callLog.push("arc"),
  fill: () => callLog.push("fill"),
  fillStyle: "",
} as unknown as CanvasRenderingContext2D;

describe("DesktopCanvas — ambient particle engine", () => {
  beforeEach(() => {
    callLog.length = 0;
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
