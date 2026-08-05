"use client";

/**
 * Liquid UI Design Tokens
 * Neo-brutalism + Liquid Glass + Magnetic Interactions
 * For AxiomID / PAI Passport / Agent Economy
 */

// Colors (CSS variables for light/dark)
export const colors = {
  // Base
  bg: {
    primary: "bg-zinc-950 dark:bg-zinc-50",
    secondary: "bg-zinc-900 dark:bg-zinc-100",
    tertiary: "bg-zinc-800 dark:bg-zinc-200",
  },
  text: {
    primary: "text-zinc-50 dark:text-zinc-950",
    secondary: "text-zinc-400 dark:text-zinc-500",
    muted: "text-zinc-500 dark:text-zinc-400",
    inverse: "text-zinc-950 dark:text-zinc-50",
  },
  border: {
    primary: "border-zinc-800 dark:border-zinc-200",
    secondary: "border-zinc-700 dark:border-zinc-300",
    focus: "border-zinc-950 dark:border-zinc-50",
  },
  // Neon accents (neo-brutalism)
  neon: {
    green: "text-[#00ff41] border-[#00ff41]",
    pink: "text-[#ec4899] border-[#ec4899]",
    cyan: "text-[#06b6d4] border-[#06b6d4]",
    amber: "text-[#f59e0b] border-[#f59e0b]",
    violet: "text-[#8b5cf6] border-[#8b5cf6]",
  },
  // Status
  success: "text-emerald-400 border-emerald-500 bg-emerald-500/10",
  warning: "text-amber-400 border-amber-500 bg-amber-500/10",
  error: "text-red-400 border-red-500 bg-red-500/10",
  info: "text-cyan-400 border-cyan-500 bg-cyan-500/10",
} as const;

// Glassmorphism (liquid glass)
export const glass = {
  light: "bg-white/5 backdrop-blur-xl backdrop-saturate-150 border border-white/10",
  medium: "bg-white/10 backdrop-blur-2xl backdrop-saturate-200 border border-white/15",
  heavy: "bg-white/15 backdrop-blur-3xl backdrop-saturate-250 border border-white/20",
  dark: "bg-zinc-950/50 backdrop-blur-xl backdrop-saturate-150 border border-zinc-800/50",
  panel: "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10",
  card: "bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors",
} as const;

// Borders (neo-brutalism: thick, sharp)
export const borders = {
  none: "border-0",
  thin: "border",
  thick: "border-2",
  brutal: "border-4",
  rounded: {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  },
} as const;

// Shadows (hard, no blur for neo-brutalism; glow for liquid)
export const shadows = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  // Neo-brutalism: hard offset shadows
  hard: "shadow-[8px_8px_0px_0px_rgb(0,0,0)] dark:shadow-[8px_8px_0px_0px_rgb(255,255,255)]",
  harder: "shadow-[12px_12px_0px_0px_rgb(0,0,0)] dark:shadow-[12px_12px_0px_0px_rgb(255,255,255)]",
  lift: "shadow-[12px_12px_0px_0px_rgb(0,0,0)] dark:shadow-[12px_12px_0px_0px_rgb(255,255,255)]",
  // Liquid: glows
  glow: "shadow-[0_0_30px_rgba(0,255,65,0.3)]",
  glowPink: "shadow-[0_0_30px_rgba(236,72,153,0.3)]",
  glowCyan: "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
  glowViolet: "shadow-[0_0_30px_rgba(139,92,246,0.3)]",
  inner: "inset shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]",
} as const;

// Typography (large, bold, demanding attention)
export const typography = {
  display: "text-5xl md:text-7xl font-black tracking-tight",
  headline: "text-3xl md:text-5xl font-bold tracking-tight",
  title: "text-xl md:text-2xl font-semibold",
  subtitle: "text-lg md:text-xl font-medium",
  body: "text-base md:text-lg font-normal leading-relaxed",
  small: "text-sm font-normal",
  mono: "font-mono text-sm",
  label: "text-xs font-semibold uppercase tracking-wider",
  caption: "text-xs text-zinc-500",
} as const;

// Spacing
export const spacing = {
  xs: "p-2 gap-2",
  sm: "p-4 gap-3",
  md: "p-6 gap-4",
  lg: "p-8 gap-6",
  xl: "p-12 gap-8",
} as const;

// Animation tokens
export const animations = {
  transition: "transition-all duration-200 ease-out",
  transitionSlow: "transition-all duration-300 ease-out",
  transitionFast: "transition-all duration-100 ease-out",
  spring: "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  magnetic: "transition-transform duration-300 ease-out will-change-transform",
  float: "animate-[float_3s_ease-in-out_infinite]",
  pulse: "animate-[pulse-glow_2s_ease-in-out_infinite]",
  scanline: "animate-[scanline_3s_linear_infinite]",
  shimmer: "animate-[shimmer_2s_infinite]",
  slideDown: "animate-[slide-down_0.3s_ease-out]",
  slideUp: "animate-[slide-up_0.3s_ease-out]",
} as const;

// Magnetic cursor interaction
export const magnetic = {
  strength: 0.3,
  radius: 80,
  maxOffset: 20,
  transition: "transition-transform duration-300 ease-out",
} as const;

// Scanline background
export const scanlines = "bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_2px] animate-scanline";

// Spotlight effects
export const spotlights = {
  primary: "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-radial-gradient(circle_at_30%_40%,rgba(0,255,65,0.15),transparent_50%) rounded-full pointer-events-none",
  accent: "absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.15),transparent_50%) rounded-full pointer-events-none",
} as const;

// All tokens combined
export const liquidTokens = {
  colors,
  glass,
  borders,
  shadows,
  typography,
  spacing,
  animations,
  magnetic,
  scanlines,
  spotlights,
} as const;

// Helper: compose class names
export function liquidClass(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getMagneticTransform(e: { clientX: number; clientY: number }, rect: { left: number; top: number; width: number; height: number }, strength = 0.3) {
  const x = (e.clientX - rect.left - rect.width / 2) * strength;
  const y = (e.clientY - rect.top - rect.height / 2) * strength;
  return { x, y };
}

// Type for audit entries (used by ActionAudit)
export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  status: "success" | "pending" | "failed" | "reverted";
  timestamp: string;
  receiptId?: string;
  delegationId?: string;
  signature?: string;
  undoable: boolean;
  metadata?: Record<string, unknown>;
}

// Intent preview action type
export interface IntentAction {
  type: "spend" | "delegate" | "deploy" | "revoke" | "sign" | "custom";
  label: string;
  description: string;
  cost?: { amount: string; currency: string };
  scope?: string[];
  risk?: "low" | "medium" | "high" | "critical";
  reversible: boolean;
  estimatedTime: string;
}

// Liquid button variants
export const buttonVariants = {
  primary: {
    base: "bg-zinc-950 text-zinc-50 border-zinc-950 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-50 dark:hover:bg-zinc-100",
    glow: "shadow-[0_0_20px_rgba(0,0,0,0.5)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)]",
  },
  secondary: {
    base: "bg-transparent text-zinc-950 border-zinc-950 hover:bg-zinc-950 hover:text-zinc-50 dark:text-zinc-50 dark:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-950",
    glow: "shadow-[0_0_20px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)]",
  },
  ghost: {
    base: "bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 border-transparent",
    glow: "",
  },
  danger: {
    base: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.5)]",
  },
  neon: {
    base: "bg-transparent text-[#00ff41] border-[#00ff41] hover:bg-[#00ff41] hover:text-zinc-950 shadow-[0_0_20px_rgba(0,255,65,0.3)]",
    glow: "animate-[pulse-glow_2s_ease-in-out_infinite]",
  },
} as const;

export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
  xl: "px-10 py-4.5 text-xl",
} as const;

export interface DelegationNode {
  id: string;
  name: string;
  type: "principal" | "delegation" | "agent" | "revoked";
  did: string;
  depth: number;
  scopes?: string[];
  scope?: string[];
  status?: string;
  delegatorDid?: string;
  delegateeDid?: string;
  revokedAt?: string;
  expiresAt?: string;
  parentId?: string;
  signature?: string;
  metadata?: Record<string, unknown>;
}

export interface DelegationChain {
  id: string;
  rootDid: string;
  nodes: DelegationNode[];
  currentScope?: string[];
}

// Intent preview component props
export interface IntentPreviewProps {
  actions: IntentAction[];
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  warning?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Injection styles for global CSS
export const globalLiquidStyles = `
@layer utilities {
  /* Animations */
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
  }
  @keyframes scanline {
    0% { background-position: 0 0; }
    100% { background-position: 0 4px; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .animate-scanline { animation: scanline 3s linear infinite; }
  .animate-shimmer { 
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); 
    background-size: 200% 100%; 
    animation: shimmer 2s infinite; 
  }
  .animate-slide-down { animation: slide-down 0.3s ease-out; }
  .animate-slide-up { animation: slide-up 0.3s ease-out; }

  /* Glass utilities */
  .glass-light { @apply bg-white/5 backdrop-blur-xl backdrop-saturate-150 border border-white/10; }
  .glass-medium { @apply bg-white/10 backdrop-blur-2xl backdrop-saturate-200 border border-white/15; }
  .glass-heavy { @apply bg-white/15 backdrop-blur-3xl backdrop-saturate-250 border border-white/20; }
  .glass-dark { @apply bg-zinc-950/50 backdrop-blur-xl backdrop-saturate-150 border border-zinc-800/50; }
  .glass-panel { @apply bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10; }
  .glass-card { @apply bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors; }

  /* Neo-brutalism borders */
  .brutal-border { @apply border-4 border-zinc-950 dark:border-zinc-50; }
  .brutal-border-thin { @apply border-2 border-zinc-950 dark:border-zinc-50; }

  /* Hard shadows */
  .shadow-hard { @apply shadow-[8px_8px_0px_0px_rgb(0,0,0)] dark:shadow-[8px_8px_0px_0px_rgb(255,255,255)]; }
  .shadow-harder { @apply shadow-[12px_12px_0px_0px_rgb(0,0,0)] dark:shadow-[12px_12px_0px_0px_rgb(255,255,255)]; }
  .shadow-lift { @apply shadow-[12px_12px_0px_0px_rgb(0,0,0)] dark:shadow-[12px_12px_0px_0px_rgb(255,255,255)]; }

  /* Glows */
  .glow-green { @apply shadow-[0_0_30px_rgba(0,255,65,0.3)]; }
  .glow-pink { @apply shadow-[0_0_30px_rgba(236,72,153,0.3)]; }
  .glow-cyan { @apply shadow-[0_0_30px_rgba(6,182,212,0.3)]; }
  .glow-violet { @apply shadow-[0_0_30px_rgba(139,92,246,0.3)]; }

  /* Magnetic cursor */
  .magnetic { @apply will-change-transform transition-transform duration-300 ease-out; }

  /* Scanlines */
  .scanlines { @apply bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_2px] animate-scanline; }

  /* Typography */
  .text-display { @apply text-5xl md:text-7xl font-black tracking-tight; }
  .text-headline { @apply text-3xl md:text-5xl font-bold tracking-tight; }
  .text-title { @apply text-xl md:text-2xl font-semibold; }
  .text-body { @apply text-base md:text-lg font-normal leading-relaxed; }
  .text-mono { @apply font-mono text-sm; }
  .text-label { @apply text-xs font-semibold uppercase tracking-wider; }
}
`;