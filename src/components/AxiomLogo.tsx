"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AxiomLogoProps {
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
  default: "border border-white/[0.08] bg-white/[0.03] hover:border-electric-blue/30",
  minimal: "",
  "icon-only": "border border-white/[0.08] bg-white/[0.03] hover:border-electric-blue/30",
  gradient: "bg-gradient-to-br from-emerald-500/20 via-electric-blue/10 to-axiom-purple/20 border border-emerald-500/30",
  glass: "bg-white/[0.04] backdrop-blur-xl border border-white/[0.1] hover:border-electric-blue/40",
};

export function AxiomLogo({ 
  size = "md", 
  showWordmark = true, 
  variant = "default", 
  className = "", 
  animate = true 
}: AxiomLogoProps) {
  const s = sizeMap[size];
  const gradId = useId();

  const LogoMark = (
    <div 
      className={cn(
        s.box, 
        "flex items-center justify-center relative group overflow-hidden transition-all duration-300",
        variantStyles[variant]
      )}
      aria-label={showWordmark ? undefined : "AXIOMID"}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
      
      {animate && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <svg className={`${s.svg} z-10`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="50" r="42" stroke="url(#outerGradient)" strokeWidth="2" strokeDasharray="8 24 40 8" />
          </svg>
        </motion.div>
      )}

      <svg className={`${s.svg} z-10 relative text-white filter drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden={showWordmark ? "true" : undefined}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#39FF14"/>
            <stop offset="30%" stopColor="#00d4ff"/>
            <stop offset="70%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#39FF14"/>
          </linearGradient>
          <linearGradient id="outerGradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#39FF14" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8"/>
          </linearGradient>
          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#39FF14" stopOpacity="0.3"/>
            <stop offset="70%" stopColor="#00d4ff" stopOpacity="0.1"/>
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
          </radialGradient>
        </defs>
        
        {/* Outer rotating ring */}
        <circle cx="50" cy="50" r="42" stroke="url(#outerGradient)" strokeWidth="2" strokeDasharray="6 20 32 12" className={animate ? 'animate-spin-slow' : ''} style={{ animationDuration: '30s' }} />
        
        {/* Inner glow */}
        <circle cx="50" cy="50" r="30" fill="url(#innerGlow)" />
        
        {/* Core mark - Lambda/Arrow symbol representing function/transformation */}
        <g filter="drop-shadow(0 0 6px rgba(57,255,20,0.6))">
          {/* Lambda base - represents function/identity */}
          <path 
            d="M30 70 L50 30 L70 70" 
            stroke="url(#lambdaGradient)" 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none" 
          />
          <defs>
            <linearGradient id="lambdaGradient" x1="0" y1="100" x2="100" y2="0">
              <stop offset="0%" stopColor="#39FF14"/>
              <stop offset="50%" stopColor="#00d4ff"/>
              <stop offset="100%" stopColor="#a855f7"/>
            </linearGradient>
          </defs>
          
          {/* Horizontal bar - represents the bridge/connection */}
          <path 
            d="M32 50 L68 50" 
            stroke="url(#lambdaGradient)" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          
          {/* Central dot - the anchor point */}
          <circle cx="50" cy="50" r="4" fill="url(#lambdaGradient)" />
        </g>
        
        {/* Accent particles */}
        <g opacity="0.6">
          <circle cx="25" cy="25" r="1.5" fill="#39FF14" className="animate-pulse" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <circle cx="75" cy="25" r="1.5" fill="#00d4ff" className="animate-pulse" style={{ animationDelay: '1s', animationDuration: '3s' }} />
          <circle cx="25" cy="75" r="1.5" fill="#a855f7" className="animate-pulse" style={{ animationDelay: '2s', animationDuration: '3s' }} />
          <circle cx="75" cy="75" r="1.5" fill="#39FF14" className="animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3s' }} />
        </g>
      </svg>
    </div>
  );

  const Wordmark = (
    <span className={cn("font-mono tracking-tighter font-semibold", s.wordmark, "text-white")}>
      AXIOM<span className="text-electric-blue">ID</span>
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

// Export default for backward compatibility
export default AxiomLogo;