"use client";

import { useEffect, useState } from "react";

interface XPBurstProps {
  xp: number;
  trigger: boolean;
}

export function XPBurst({ xp, trigger }: XPBurstProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      queueMicrotask(() => setActive(true));
      const timer = setTimeout(() => setActive(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!active) return null;

  // Generate 8 particle offsets distributed in a circle
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i * 360) / 8;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * 45;
    const y = Math.sin(rad) * 45;
    return { x, y };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 overflow-hidden">
      {/* Floating XP Text */}
      <span className="text-sm font-mono font-bold text-neon-green animate-xp-text-float drop-shadow-[0_0_8px_var(--neon-green)]">
        +{xp} XP
      </span>

      {/* Particles */}
      {particles.map((p, idx) => (
        <span
          key={idx}
          className="absolute w-1.5 h-1.5 rounded-full bg-neon-green animate-xp-particle"
          style={{
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
