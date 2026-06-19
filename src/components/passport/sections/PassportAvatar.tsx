import React from "react";

interface PassportAvatarProps {
  username: string;
  tierColor: string;
}

function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export function PassportAvatar({ username, tierColor }: PassportAvatarProps) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center mb-2">
      {/* Outer rotating neon ring */}
      <div className="absolute inset-0 rounded-full border border-dashed border-neon-green/40 animate-spin" style={{ animationDuration: '10s' }} />
      {/* Middle pulsing glow ring */}
      <div className="absolute inset-2 rounded-full border border-neon-green/20 animate-ping" style={{ animationDuration: '3s' }} />
      {/* Inner 3D sphere visualization */}
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center border-2 text-3xl font-bold font-mono overflow-hidden"
        style={{
          borderColor: tierColor,
          background: `radial-gradient(circle, ${tierColor}30 0%, ${tierColor}05 70%)`,
          color: tierColor,
          boxShadow: `0 0 25px ${tierColor}40, inset 0 0 15px ${tierColor}30`,
        }}
      >
        {/* Scanner line scanning up and down */}
        <div className="absolute left-0 w-full h-[2px] bg-neon-green/80 shadow-[0_0_8px_var(--neon-green)] animate-bounce" style={{ top: '50%', animationDuration: '4s' }} />
        {/* Holographic matrix grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%]" />
        {getInitial(username)}
      </div>
    </div>
  );
}
