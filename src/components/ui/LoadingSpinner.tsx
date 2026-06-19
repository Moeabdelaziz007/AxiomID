"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return <Loader2 className={`animate-spin text-current ${sizeMap[size]} ${className}`} />;
}
