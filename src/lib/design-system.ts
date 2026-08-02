// ═══════════════════════════════════════════════════════════
// AxiomID Design System — v1.0
// Single source of truth for all component styling
// ═══════════════════════════════════════════════════════════

// ── Type Scale (1.25 ratio) ─────────────────────────────────
export const typography = {
  // Monospace (labels, badges, DIDs, code)
  mono: {
    xxs: "text-[10px] font-mono uppercase tracking-widest",        // Badges, labels
    xs: "text-xs font-mono uppercase tracking-wider",              // Secondary labels
    sm: "text-sm font-mono font-semibold tracking-wide",           // Nav items
    base: "text-base font-mono tracking-normal",                   // Terminal, code
  },
  // Sans Serif (body, headings)
  sans: {
    body: "text-base leading-relaxed",                              // Body copy
    subtitle: "text-xl font-bold tracking-tight",                   // Card titles
    heading: "text-3xl sm:text-5xl font-bold tracking-tight",       // Section headings
    hero: "text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1]", // Hero
  },
  numeric: {
    sm: "text-2xl font-bold font-mono",                             // Stat numbers
    lg: "text-3xl md:text-4xl font-bold font-mono",               // Large stats
  },
} as const;

// ── Spacing System (8px base) ─────────────────────────────────
export const spacing = {
  xs: "p-2 gap-2",                                                 // Compact (cards, inline)
  sm: "p-3 gap-3",                                                // Small components
  md: "p-4 gap-4",                                                // Standard card
  lg: "p-6 gap-6",                                                // Section padding
  xl: "p-8 gap-8",                                                // Hero/banners
  card: "p-5 rounded-2xl gap-4",                                   // Card pattern
  section: "px-4 sm:px-6 py-16 sm:py-24",                         // Section pattern
  container: "w-full max-w-6xl mx-auto",                          // Container pattern
};

// ── Color System Drafts (component-ready) ─────────────────────
export const colors = {
  // Semantic mapping — always use these, never bare hex
  semantic: {
    bg: "bg-[#10131a]",                                   //    --bg-deep
    card: "bg-white/[0.02] backdrop-blur-sm border border-white/[0.06]",   // Classic card
    cardHover: "bg-white/[0.04] border-white/[0.12]",          // Hover card
    glass: "bg-white/[0.03] backdrop-blur-lg border border-white/[0.05]",  // Premium glass
    text: "text-zinc-100",                                           //    --text-primary
    muted: "text-zinc-500",                                           //    --text-muted
    subtle: "text-zinc-400",                                   //    --text-subtle
  },
  // Accent colors
  accent: {
    blue: { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
    green: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
    purple: { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/20" },
    amber: { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/20" },
    red: { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/30", glow: "shadow-red-500/20" },
  },
} as const;

// ── Trust Tier Colors ───────────────────────────────────────
export const tierColors = {
  visitor: "zinc",
  citizen: "blue",
  validator: "purple",
  sovereign: "emerald",
} as const;

// ── Component Templates ─────────────────────────────────────
export const componentTemplates = {
  /** Standard card: bg-card backdrop-blur border rounded-xl p-6 */
  card: "rounded-xl p-6 backdrop-blur-sm border border-white/[0.06] bg-[#1d2027]/90 transition-all duration-300 hover:border-white/[0.12]",
  /** Premium card with gradient border */
  cardPremium: "rounded-2xl relative overflow-hidden bg-[#1d2027]/90 border border-transparent [background:linear-gradient(#1d2027,#1d2027) padding-box,linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.2)) border-box]",
  /** CTA button (blue pill) */
  btnPrimary: "inline-flex items-center justify-center px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-semibold text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-400",
  /** Ghost/secondary button */
  btnSecondary: "inline-flex items-center px-4 py-3 border border-white/10 bg-white/[0.03] rounded-xl font-mono text-xs tracking-wider text-zinc-300 hover:text-white hover:border-white/20 transition-all duration-200",
  /** Section header: icon + label + heading + description */
  sectionHeader: "flex flex-col items-center text-center space-y-2",
  /** Badge chip */
  badge: "px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border",
} as const;

// ── Breakpoints ──────────────────────────────────────────────
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  maxWidth: "max-w-6xl", // 1152px — standard container
} as const;