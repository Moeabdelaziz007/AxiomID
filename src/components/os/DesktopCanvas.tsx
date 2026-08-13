"use client";

import { useEffect, useRef, useState } from "react";
import { WALLPAPERS, WALLPAPER_STORAGE_KEY, getWallpaper, Wallpaper } from "@/lib/wallpapers";

const PARTICLE_COUNT = 70;

export function DesktopCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [wallpaper] = useState<Wallpaper>(() => {
    try {
      return getWallpaper(localStorage.getItem(WALLPAPER_STORAGE_KEY));
    } catch {
      return getWallpaper();
    }
  });
  const wallpaperRef = useRef(wallpaper);

  useEffect(() => {
    const onPick = (e: Event) => {
      wallpaperRef.current = getWallpaper((e as CustomEvent<string>).detail);
    };
    window.addEventListener("aura:wallpaper", onPick);
    return () => window.removeEventListener("aura:wallpaper", onPick);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = (canvas.width = window.innerWidth * dpr);
    let h = (canvas.height = window.innerHeight * dpr);
    const seed = Math.floor(Math.random() * 2 ** 31);
    const start = performance.now();

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.4,
    }));

    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      try {
        wallpaperRef.current.draw(ctx, w, h, t, seed);
      } catch {
        WALLPAPERS[0].draw(ctx, w, h, t, seed);
      }
      ctx.fillStyle = "rgba(0, 240, 255, 0.35)";
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
    };
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
