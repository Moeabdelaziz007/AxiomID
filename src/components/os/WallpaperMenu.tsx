"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WALLPAPERS, WALLPAPER_STORAGE_KEY, getWallpaper, Wallpaper } from "@/lib/wallpapers";

const MENU_W = 240;
const ROW_H = 56;
const MARGIN = 8;
const INTERACTIVE_SELECTOR = "a, button, [role='button']";

function readSelection(): string {
  try {
    return getWallpaper(localStorage.getItem(WALLPAPER_STORAGE_KEY)).id;
  } catch {
    return WALLPAPERS[0].id;
  }
}

export function WallpaperMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState(readSelection);
  const [activeIndex, setActiveIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  const menuH = WALLPAPERS.length * ROW_H;

  const openAt = useCallback(
    (x: number, y: number, center: boolean) => {
      const px = center ? window.innerWidth / 2 - MENU_W / 2 : x;
      const py = center ? window.innerHeight / 2 - menuH / 2 : y;
      setPos({
        x: Math.max(MARGIN, Math.min(px, window.innerWidth - MENU_W - MARGIN)),
        y: Math.max(MARGIN, Math.min(py, window.innerHeight - menuH - MARGIN)),
      });
      setActiveIndex(Math.max(0, WALLPAPERS.findIndex((w) => w.id === readSelection())));
      setOpen(true);
    },
    [menuH],
  );

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;
      e.preventDefault();
      openAt(e.clientX, e.clientY, false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) && !open) {
        e.preventDefault();
        openAt(0, 0, true);
      }
    };
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, openAt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest("[data-wallpaper-menu]")) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const apply = useCallback((id: string) => {
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, id);
    } catch {
      // privacy mode: session-only selection
    }
    setSelected(id);
    window.dispatchEvent(new CustomEvent("aura:wallpaper", { detail: id }));
    setOpen(false);
  }, []);

  const thumbs = useMemo(() => {
    return WALLPAPERS.map((w: Wallpaper) => {
      const c = document.createElement("canvas");
      c.width = 96;
      c.height = 54;
      const ctx = c.getContext("2d");
      if (ctx) {
        try {
          w.draw(ctx, 96, 54, 0, seed);
        } catch {
          // broken wallpaper → blank thumb; canvas will fall back to aurora
        }
      }
      return c.toDataURL();
    });
  }, [seed]);

  if (!open) return null;

  return (
    <div
      role="menu"
      data-wallpaper-menu
      aria-label="Wallpaper"
      className="fixed z-50 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d16]/95 shadow-2xl backdrop-blur-md"
      style={{ left: pos.x, top: pos.y, width: MENU_W }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") setActiveIndex((i) => (i + 1) % WALLPAPERS.length);
        else if (e.key === "ArrowUp") setActiveIndex((i) => (i - 1 + WALLPAPERS.length) % WALLPAPERS.length);
        else if (e.key === "Home") setActiveIndex(0);
        else if (e.key === "End") setActiveIndex(WALLPAPERS.length - 1);
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          apply(WALLPAPERS[activeIndex].id);
        }
      }}
    >
      {WALLPAPERS.map((w, i) => (
        <button
          key={w.id}
          type="button"
          role="menuitemradio"
          aria-checked={w.id === selected}
          data-active={i === activeIndex}
          aria-label={w.name}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => apply(w.id)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
            i === activeIndex ? "bg-cyan-500/15 text-cyan-200" : "text-slate-300 hover:bg-white/5"
          }`}
          style={{ height: ROW_H }}
        >
          <Image
            src={thumbs[i]}
            alt=""
            aria-hidden="true"
            width={64}
            height={36}
            unoptimized
            className="h-9 w-16 shrink-0 rounded border border-white/10 object-cover"
          />
          <span className="truncate">{w.name}</span>
          {w.id === selected && <span className="ml-auto text-cyan-400" aria-hidden="true">●</span>}
        </button>
      ))}
    </div>
  );
}
