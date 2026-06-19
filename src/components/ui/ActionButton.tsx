"use client";

import { LoadingSpinner } from "./LoadingSpinner";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const variantClasses = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
} as const;

const sizeClasses = {
  sm: "text-[10px] px-3 py-1.5 min-h-[36px]",
  md: "text-xs px-4 py-2 min-h-[44px]",
  lg: "text-sm px-5 py-2.5 min-h-[48px]",
} as const;

export function ActionButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  disabled,
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${variantClasses[variant]} ${sizeClasses[size]} flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
