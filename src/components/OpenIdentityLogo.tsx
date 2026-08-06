"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OpenIdentityLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  variant?: "default" | "minimal" | "icon-only" | "gradient" | "glass";
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: { box: "w-7 h-7 rounded-lg", svg: "w-3.5 h-3.5", wordmark: "text-xs", gap: "gap-1.5" },
  md: { box: "w-9 h-9 rounded-xl", svg: "w-5 h-5", wordmark: "text-sm sm:text-base", gap: "gap-2" },
  lg: { box: "w-12 h-12 rounded-xl", svg: "w-7 h-7", wordmark: "text-lg sm:text-xl", gap: "gap-2.5" },
  xl: { box: "w-16 h-16 rounded-2xl", svg: "w-9 h-9", wordmark: "text-xl sm:text-2xl", gap: "gap-3" },
};

const variantStyles = {
  default: "border border-white/[0.08] bg-white/[0.03] hover:border-sky-400/30",
  minimal: "",
  "icon-only": "border border-white/[0.08] bg-white/[0.03] hover:border-sky-400/30",
  gradient: "bg-gradient-to-br from-sky-400/20 via-cyan-400/10 to-blue-500/20 border border-sky-400/30",
  glass: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.1] hover:border-sky-400/40",
};

export function OpenIdentityLogo({ 
  size = "md", 
  showWordmark = true, 
  variant = "default", 
  className = "", 
  animate = true 
}: OpenIdentityLogoProps) {
  const s = sizeMap[size];
  const gradId = useId();

  const LogoMark = (
    <div 
      className={cn(
        s.box, 
        "flex items-center justify-center relative group overflow-hidden transition-all duration-300",
        variantStyles[variant]
      )}
      aria-label={showWordmark ? undefined : "OPENIDENTITY"}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/5 via-cyan-400/5 to-blue-500/5 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
      
      {animate && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <svg className={`${s.svg} z-10`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="50" r="42" stroke="url(#outerGradient)" strokeWidth="2" strokeDasharray="10 15 30 10" />
          </svg>
        </motion.div>
      )}

      <svg className={`${s.svg} z-10 relative text-white filter drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden={showWordmark ? "true" : undefined}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#0ea5e9"/>
            <stop offset="40%" stopColor="#06b6d4"/>
            <stop offset="70%" stopColor="#3b82f6"/>
            <stop offset="100%" stopColor="#0ea5e9"/>
          </linearGradient>
          <linearGradient id="outerGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8"/>
          </linearGradient>
          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3"/>
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.1"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
          </radialGradient>
        </defs>
        
        {/* Outer rotating ring */}
        <circle cx="50" cy="50" r="42" stroke="url(#outerGradient)" strokeWidth="2" strokeDasharray="8 18 28 8" className="animate-spin-slow" style={{ animationDuration: '28s' }} />
        
        {/* Inner glow */}
        <circle cx="50" cy="50" r="30" fill="url(#innerGlow)" />
        
        {/* Core mark - Open book / protocol document symbol */}
        <g filter="drop-shadow(0 0 6px rgba(14,165,233,0.6))">
          {/* Book cover - left page */}
          <path 
            d="M30 28 L50 28 L50 72 L30 72 Z" 
            stroke="url(#bookGradient)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none" 
          />
          <defs>
            <linearGradient id="bookGradient" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#0ea5e9"/>
              <stop offset="50%" stopColor="#06b6d4"/>
              <stop offset="100%" stopColor="#3b82f6"/>
            </linearGradient>
          </defs>
          
          {/* Book cover - right page */}
          <path 
            d="M50 28 L70 28 L70 72 L50 72 Z" 
            stroke="url(#bookGradient)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none" 
          />
          
          {/* Spine */}
          <path 
            d="M50 28 L50 72" 
            stroke="url(#bookGradient)" 
            strokeWidth="2" 
            strokeLinecap="round" 
          />
          
          {/* Open page lines - representing content/protocols */}
          <g stroke="url(#bookGradient)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
            <path d="M36 38 L44 38" />
            <path d="M36 46 L44 46" />
            <path d="M36 54 L44 54" />
            <path d="M56 38 L64 38" />
            <path d="M56 46 L64 46" />
            <path d="M56 54 L64 54" />
          </g>
          
          {/* Central connection point - the protocol link */}
          <circle cx="50" cy="50" r="6" stroke="url(#bookGradient)" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="3" fill="url(#bookGradient)" />
        </g>
        
        {/* Accent particles - data flowing */}
        <g opacity="0.5">
          <circle cx="22" cy="22" r="1.5" fill="#0ea5e9" className="animate-pulse" style={{ animationDelay: '0s', animationDuration: '2.5s' }} />
          <circle cx="78" cy="22" r="1.5" fill="#06b6d4" className="animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.5s' }} />
          <circle cx="22" cy="78" r="1.5" fill="#3b82f6" className="animate-pulse" style={{ animationDelay: '1.6s', animationDuration: '2.5s' }} />
          <circle cx="78" cy="78" r="1.5" fill="#0ea5e9" className="animate-pulse" style={{ animationDelay: '2.4s', animationDuration: '2.5s' }} />
        </g>
      </svg>
    </div>
  );

  const Wordmark = (
    <span className={cn("font-mono tracking-tighter font-semibold", s.wordmark, "text-white")}>
      OPEN<span className="text-sky-400">IDENTITY</span>
    </span>
  );

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      {variant !== "icon-only" && showWordmark ? (
        <div className="flex items-center gap-2">
          {LogoMark}
          {Wordmark}
        </div>
      ) : (
        LogoMark
      )}
    </div>
  );
}

export default OpenIdentityLogo;