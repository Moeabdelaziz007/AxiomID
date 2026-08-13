import { WALLPAPERS, WALLPAPER_STORAGE_KEY, getWallpaper } from "@/lib/wallpapers";

const noopGradient = { addColorStop: () => {} };
const makeCtx = () =>
  new Proxy({} as Record<string, unknown>, {
    get: (target, k) => {
      if (k === "createLinearGradient" || k === "createRadialGradient")
        return () => noopGradient;
      if (!(k in target)) target[k as string] = () => {};
      return target[k];
    },
    set: (target, k, v) => {
      target[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

describe("wallpaper registry", () => {
  it("exports 5 wallpapers with unique ids and names", () => {
    expect(WALLPAPERS).toHaveLength(5);
    const ids = WALLPAPERS.map((w) => w.id);
    expect(new Set(ids).size).toBe(5);
    WALLPAPERS.forEach((w) => expect(w.name.length).toBeGreaterThan(0));
    expect(WALLPAPERS[0].id).toBe("aurora");
  });

  it("storage key is stable", () => {
    expect(WALLPAPER_STORAGE_KEY).toBe("aura.wallpaper");
  });

  it("every wallpaper paints without throwing at several sizes", () => {
    const sizes: Array<[number, number]> = [
      [1024, 768],
      [2560, 1440],
      [320, 480],
    ];
    for (const w of WALLPAPERS) {
      for (const [W, H] of sizes) {
        const ctx = makeCtx();
        expect(() => w.draw(ctx, W, H, 1.234, 42)).not.toThrow();
        expect(() => w.draw(ctx, W, H, 0, 0)).not.toThrow();
      }
    }
  });

  it("every wallpaper leaves visible marks on the canvas", () => {
    const ops: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, k) => {
        if (k === "createLinearGradient" || k === "createRadialGradient")
          return () => ({ addColorStop: () => {} });
        if (!(k in target)) target[k as string] = (..._a: unknown[]) => ops.push(String(k));
        return target[k];
      },
      set: (target, k, v) => {
        target[k as string] = v;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    for (const w of WALLPAPERS) {
      ops.length = 0;
      w.draw(ctx, 1024, 768, 1, 1);
      expect(ops).toContain("fillRect");
    }
  });

  it("getWallpaper falls back to aurora for unknown/null/missing ids", () => {
    expect(getWallpaper().id).toBe("aurora");
    expect(getWallpaper(null).id).toBe("aurora");
    expect(getWallpaper("nope").id).toBe("aurora");
    expect(getWallpaper("deep-space").id).toBe("deep-space");
  });
});
