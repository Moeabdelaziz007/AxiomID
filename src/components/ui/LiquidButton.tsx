"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { liquidClass, getMagneticTransform, liquidTokens } from "@/lib/liquid-ui";

interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "neon";
  size?: "sm" | "md" | "lg" | "xl";
  magnetic?: boolean;
  glow?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: "bg-zinc-950 text-zinc-50 border-zinc-950 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-50",
  secondary: "bg-transparent text-zinc-950 border-zinc-950 hover:bg-zinc-950 hover:text-zinc-50 dark:text-zinc-50 dark:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-950",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 border-transparent",
  danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
  neon: "bg-transparent text-[#00ff41] border-[#00ff41] hover:bg-[#00ff41] hover:text-zinc-950 shadow-[0_0_20px_rgba(0,255,65,0.3)]",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-7 py-3.5 text-lg",
  xl: "px-10 py-4.5 text-xl",
};

export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      magnetic = true,
      glow = false,
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      className,
      disabled,
      children,
      style,
      onMouseMove,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [magneticTransform, setMagneticTransform] = useState("");

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!magnetic || disabled || loading) return;
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const { x, y } = getMagneticTransform(e, rect);
        setMagneticTransform(`translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
      }
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (magnetic) setMagneticTransform("");
      onMouseLeave?.(e);
    };

    const baseClasses = liquidClass(
      "relative inline-flex items-center justify-center font-semibold tracking-wide",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-50",
      "disabled:opacity-40 disabled:cursor-not-allowed",
      liquidTokens.borders.thick,
      liquidTokens.shadows.hard,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && "w-full",
      glow && "animate-pulse-glow",
      magnetic && "will-change-transform",
      className
    );

    return (
      <button
        ref={(el) => {
          buttonRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        className={baseClasses}
        style={{
          ...style,
          transform: magneticTransform,
          transition: magneticTransform ? "none" : "transform 0.2s ease-out",
        } as React.CSSProperties}
        disabled={disabled || loading}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        {!loading && (
          <span
            className="relative flex items-center gap-2"
            style={{ transform: loading ? "scale(0)" : "scale(1)" }}
          >
            {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
            {children}
            {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
          </span>
        )}
        {/* Liquid shimmer overlay */}
        <span className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </span>
        {/* Neo-brutalism corner accents */}
        <span className="absolute -top-1 -left-1 w-2 h-2 border-t-[3px] border-l-[3px] border-zinc-950 dark:border-zinc-50" />
        <span className="absolute -top-1 -right-1 w-2 h-2 border-t-[3px] border-r-[3px] border-zinc-950 dark:border-zinc-50" />
        <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-[3px] border-l-[3px] border-zinc-950 dark:border-zinc-50" />
        <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-[3px] border-r-[3px] border-zinc-950 dark:border-zinc-50" />
      </button>
    );
  }
);

LiquidButton.displayName = "LiquidButton";