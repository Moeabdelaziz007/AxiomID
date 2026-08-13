import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { WallpaperMenu } from "@/components/os/WallpaperMenu";
import { WALLPAPERS, WALLPAPER_STORAGE_KEY } from "@/lib/wallpapers";

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

beforeEach(() => {
  callLog.length = 0;
  localStorage.clear();
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => makeFakeCtx(),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    configurable: true,
    value: () => "data:image/png;base64,thumb",
  });
});

afterEach(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    configurable: true,
    value: undefined,
  });
});

const fireContext = (target: HTMLElement, x: number, y: number) =>
  fireEvent.contextMenu(target, { clientX: x, clientY: y });

describe("WallpaperMenu — right-click picker", () => {
  it("opens on background right-click with all wallpapers listed", () => {
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 400, 300);
    });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    for (const w of WALLPAPERS) {
      expect(screen.getByText(w.name)).toBeInTheDocument();
    }
  });

  it("does not open when right-clicking an interactive element", () => {
    render(<WallpaperMenu />);
    const link = document.createElement("a");
    document.body.appendChild(link);
    fireContext(link, 100, 100);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    link.remove();
  });

  it("applies a wallpaper on click: persists + dispatches aura:wallpaper", () => {
    const dispatched: string[] = [];
    const onPick = (e: Event) => dispatched.push((e as CustomEvent<string>).detail);
    window.addEventListener("aura:wallpaper", onPick);
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 400, 300);
    });
    act(() => {
      fireEvent.click(screen.getByText("Deep Space"));
    });
    expect(localStorage.getItem(WALLPAPER_STORAGE_KEY)).toBe("deep-space");
    expect(dispatched).toEqual(["deep-space"]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    window.removeEventListener("aura:wallpaper", onPick);
  });

  it("closes on Escape and on outside click", () => {
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 400, 300);
    });
    act(() => {
      fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    act(() => {
      fireContext(document.body, 400, 300);
    });
    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("supports keyboard navigation: arrows, Enter, Home/End", () => {
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 400, 300);
    });
    const menu = screen.getByRole("menu");
    act(() => {
      fireEvent.keyDown(menu, { key: "ArrowDown" });
    });
    expect(screen.getByRole("menuitemradio", { name: "Deep Space" }).getAttribute("data-active")).toBe("true");
    act(() => {
      fireEvent.keyDown(menu, { key: "Home" });
    });
    expect(screen.getByRole("menuitemradio", { name: "Aurora" }).getAttribute("data-active")).toBe("true");
    act(() => {
      fireEvent.keyDown(menu, { key: "End" });
    });
    expect(screen.getByRole("menuitemradio", { name: "Axiom Void" }).getAttribute("data-active")).toBe("true");
    act(() => {
      fireEvent.keyDown(menu, { key: "Enter" });
    });
    expect(localStorage.getItem(WALLPAPER_STORAGE_KEY)).toBe("axiom-void");
  });

  it("falls back to aurora selection when localStorage is unavailable", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 400, 300);
    });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Aurora" }).getAttribute("aria-checked")).toBe("true");
    spy.mockRestore();
  });

  it("opens centered via Shift+F10 and hover moves the active row", () => {
    render(<WallpaperMenu />);
    act(() => {
      fireEvent.keyDown(document.body, { key: "F10", shiftKey: true });
    });
    const menu = screen.getByRole("menu");
    const style = menu.getAttribute("style") || "";
    expect(style).toContain("left:");
    act(() => {
      fireEvent.mouseEnter(screen.getByRole("menuitemradio", { name: "Deep Space" }));
    });
    expect(screen.getByRole("menuitemradio", { name: "Deep Space" }).getAttribute("data-active")).toBe("true");
  });

  it("clamps position so the menu never overflows the viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 400 });
    render(<WallpaperMenu />);
    act(() => {
      fireContext(document.body, 495, 395);
    });
    const panel = screen.getByRole("menu");
    const style = panel.getAttribute("style") || "";
    expect(style).toContain("left: 252px"); // 500 - MENU_W(240) - 8 = 252
    expect(style).toMatch(/top:\s*[0-9]+px/);
    const top = Number(style.match(/top:\s*(\d+)px/)?.[1] ?? 9999);
    expect(top).toBeLessThanOrEqual(400 - 8);
  });
});
