"use client";

import { SOUL_PRINCIPLES, type SoulPrincipleKey } from "@/lib/soul-principles";

interface SoulBadgeProps {
  principle: SoulPrincipleKey;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Color-coded badge showing which SOUL principle a skill serves.
 */
export function SoulBadge({ principle, showLabel = true, size = 'sm' }: SoulBadgeProps) {
  const meta = SOUL_PRINCIPLES[principle];
  if (!meta) return null;

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
      style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
    >
      <span
        className={`${dotSize} rounded-full shrink-0`}
        style={{ backgroundColor: meta.color }}
      />
      {showLabel && (
        <span className={`${textSize} font-mono`} style={{ color: meta.color }}>
          {meta.en}
        </span>
      )}
    </span>
  );
}
