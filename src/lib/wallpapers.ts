export interface Wallpaper {
  id: string;
  name: string;
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number): void;
}

export const WALLPAPER_STORAGE_KEY = "aura.wallpaper";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function fillGradient(
  ctx: CanvasRenderingContext2D,
  stops: Array<[number, string]>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, Math.abs(x1 - x0) || 1, Math.abs(y1 - y0) || 1);
}

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number) {
  fillGradient(ctx, [[0, "#05060f"], [1, "#0b1026"]], 0, 0, 0, h);
  const rand = rng(seed);
  for (let i = 0; i < 3; i++) {
    const y0 = h * (0.22 + 0.18 * i) + Math.sin(t * 0.3 + i * 2.1 + rand() * 6) * h * 0.05;
    const hue = 180 + i * 60 + Math.sin(t * 0.12 + i * 1.5) * 26;
    ctx.fillStyle = `hsla(${hue}, 90%, 62%, 0.10)`;
    for (let y = 0; y < h; y++) {
      const band = Math.exp(-Math.pow((y - y0) / (h * 0.09), 2));
      if (band < 0.02) continue;
      const xShift = Math.sin(t * 0.4 + i * 1.7 + y / 90) * w * 0.12;
      ctx.fillRect(w / 2 + xShift - 260 * band, y, 520 * band, 1.5);
    }
  }
}

function drawDeepSpace(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number) {
  fillGradient(ctx, [[0, "#020208"], [1, "#0a0a1a"]], 0, 0, 0, h);
  const rand = rng(seed);
  ctx.fillStyle = "rgba(120, 140, 255, 0.9)";
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.1 + 0.2;
    const twinkle = (Math.sin(t * 1.6 + rand() * 9) + 1) / 2;
    ctx.globalAlpha = 0.25 + twinkle * 0.65;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const nebula = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, h * 0.5);
  nebula.addColorStop(0, "rgba(88, 60, 200, 0.10)");
  nebula.addColorStop(1, "rgba(88, 60, 200, 0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, w, h);
}

function drawNeonGrid(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number) {
  fillGradient(ctx, [[0, "#06060c"], [1, "#12081c"]], 0, 0, 0, h);
  const horizon = h * 0.72;
  const vx = w / 2;
  const rand = rng(seed);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.22)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const x = (rand() - 0.5) * w * 1.6;
    ctx.beginPath();
    ctx.moveTo(vx, horizon);
    ctx.lineTo(vx + x, h);
    ctx.stroke();
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
  ctx.fillStyle = `rgba(0, 240, 255, ${0.08 + pulse * 0.1})`;
  for (let i = 1; i <= 8; i++) {
    const y = horizon + Math.pow(i / 8, 2) * (h - horizon);
    ctx.fillRect(0, y, w, 1.5);
  }
  ctx.fillStyle = `rgba(255, 64, 160, ${0.05 + pulse * 0.08})`;
  ctx.fillRect(0, horizon, w, 2);
}

function drawOcean(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number) {
  fillGradient(ctx, [[0, "#020a14"], [1, "#06203a"]], 0, 0, 0, h);
  const rand = rng(seed);
  for (let i = 0; i < 4; i++) {
    const hue = 195 + i * 8 + Math.sin(t * 0.2 + i) * 6;
    ctx.fillStyle = `hsla(${hue}, 80%, 45%, 0.16)`;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y =
        h * (0.55 + i * 0.12) +
        Math.sin(x / (60 + i * 30) + t * (0.7 + i * 0.2) + rand() * 7) * (14 + i * 7) +
        Math.sin(x / 160 + t * 0.3 + i) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAxiomVoid(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, seed: number) {
  fillGradient(ctx, [[0, "#030308"], [1, "#0b0b14"]], 0, 0, 0, h);
  const rand = rng(seed);
  for (let i = 0; i < 9; i++) {
    const x = (w / 2 + Math.sin(t * 0.12 + i * 1.9) * w * 0.3) * (0.7 + rand() * 0.6);
    const y = (h / 2 + Math.cos(t * 0.09 + i * 2.3) * h * 0.28) * (0.7 + rand() * 0.6);
    const r = 40 + rand() * 120;
    const hue = 180 + rand() * 160;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.05)`);
    glow.addColorStop(1, `hsla(${hue}, 80%, 65%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export const WALLPAPERS: Wallpaper[] = [
  { id: "aurora", name: "Aurora", draw: drawAurora },
  { id: "deep-space", name: "Deep Space", draw: drawDeepSpace },
  { id: "neon-grid", name: "Neon Grid", draw: drawNeonGrid },
  { id: "ocean", name: "Ocean", draw: drawOcean },
  { id: "axiom-void", name: "Axiom Void", draw: drawAxiomVoid },
];

export function getWallpaper(id?: string | null): Wallpaper {
  if (id) {
    const found = WALLPAPERS.find((w) => w.id === id);
    if (found) return found;
  }
  return WALLPAPERS[0];
}
