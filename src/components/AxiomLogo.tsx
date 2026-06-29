"use client";

import { useId } from "react";

interface AxiomLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: "w-8 h-8 rounded-lg", svg: "w-4 h-4" },
  md: { box: "w-9 h-9 rounded-xl", svg: "w-5.5 h-5.5" },
  lg: { box: "w-12 h-12 rounded-xl", svg: "w-7 h-7" },
};

export function AxiomLogo({ size = "md", showWordmark = true, className = "" }: AxiomLogoProps) {
  const s = sizeMap[size];
  // Unique per-instance id so multiple logos on one page don't share a
  // gradient definition (which would break SVG url(#...) references).
  const gradId = useId();

  return (
    <div className={`flex items-center gap-2 group ${className}`} aria-label={showWordmark ? undefined : "AXIOMID"}>
      <div className={`${s.box} flex items-center justify-center border border-white/10 bg-black/40 relative group overflow-hidden transition-all duration-300 hover:border-electric-blue/40`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 opacity-50 group-hover:opacity-100 transition-opacity" />
        <svg className={`${s.svg} z-10 filter drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden={showWordmark ? "true" : undefined}>
          <circle cx="50" cy="50" r="42" stroke={`url(#${gradId})`} strokeWidth="3" strokeDasharray="4 16 28 6" className="animate-spin" style={{ animationDuration: '24s' }} />
          <path d="M50 24 L74 74 L62 74 L50 48 L38 74 L26 74 Z" fill="#ffffff" />
          <path d="M40 64 H60 L58 68 H42 Z" fill="#39FF14" />
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#39FF14"/>
              <stop offset="50%" stopColor="#00d4ff"/>
              <stop offset="100%" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showWordmark && (
        <span className="font-mono text-lg sm:text-xl tracking-tighter text-surface">
          AXIOM<span className="text-electric-blue">ID</span>
        </span>
      )}
    </div>
  );
}
