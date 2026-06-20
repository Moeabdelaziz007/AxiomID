"use client";

import React from "react";
import { Award, Trophy } from "lucide-react";
import { getTierColor, Tier } from "@/lib/tiers";

interface LeaderboardUser {
  rank: number;
  id: string;
  piUsername?: string | null;
  walletAddress: string;
  tier: string;
  xp: number;
  trustScore: number;
  stampsCount: number;
}

interface TopThreeCardsProps {
  users: LeaderboardUser[];
}

export default function TopThreeCards({ users }: TopThreeCardsProps) {
  // Re-order users list so that Silver is Left, Gold is Middle, Bronze is Right
  const silver = users.find((u) => u.rank === 2);
  const gold = users.find((u) => u.rank === 1);
  const bronze = users.find((u) => u.rank === 3);

  const renderCard = (user: LeaderboardUser | undefined, type: "gold" | "silver" | "bronze") => {
    if (!user) return <div className="flex-1 min-h-[180px]" />;

    const borderClass = 
      type === "gold" 
        ? "border-amber-400/40 bg-amber-500/[0.02]" 
        : type === "silver"
          ? "border-zinc-400/30 bg-zinc-400/[0.01]"
          : "border-amber-700/30 bg-amber-800/[0.01]";
          
    const textGlowClass =
      type === "gold"
        ? "text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
        : type === "silver"
          ? "text-zinc-300 filter drop-shadow-[0_0_8px_rgba(212,212,216,0.2)]"
          : "text-amber-600 filter drop-shadow-[0_0_8px_rgba(180,83,9,0.2)]";

    const heightClass = type === "gold" ? "min-h-[220px] md:scale-105 z-10" : "min-h-[190px]";
    const tierColor = getTierColor(user.tier as Tier);

    return (
      <div 
        className={`flex-1 flex flex-col justify-between p-5 rounded-2xl border ${borderClass} ${heightClass} relative group transition-all duration-300`}
      >
        {/* Glow effect */}
        <div className={`absolute -inset-px rounded-2xl opacity-10 group-hover:opacity-20 transition-opacity filter blur-sm ${
          type === "gold" ? "bg-amber-400" : type === "silver" ? "bg-zinc-400" : "bg-amber-700"
        }`} />

        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-1">
            <Trophy className={`w-4 h-4 ${textGlowClass}`} />
            <span className="text-[10px] font-mono font-bold text-zinc-500">RANK {user.rank}</span>
          </div>
          <span 
            className="text-[8px] font-mono px-2 py-0.5 rounded border uppercase"
            style={{ color: tierColor, borderColor: `${tierColor}30`, background: `${tierColor}10` }}
          >
            {user.tier}
          </span>
        </div>

        {/* Username Avatar */}
        <div className="flex flex-col items-center gap-2 my-2 z-10">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold font-mono border"
            style={{ 
              borderColor: `${tierColor}30`,
              background: `linear-gradient(135deg, ${tierColor}15 0%, rgba(255,255,255,0.02) 100%)`,
              color: tierColor
            }}
          >
            {user.piUsername ? user.piUsername[0].toUpperCase() : "?"}
          </div>
          <span className="text-xs font-mono font-bold text-white max-w-full truncate">
            @{user.piUsername || "anonymous"}
          </span>
        </div>

        <div className="flex justify-between items-center border-t border-white/5 pt-3 z-10 text-[10px] font-mono">
          <span className="text-zinc-500">SCORE: {user.trustScore}%</span>
          <span className={`${textGlowClass} font-bold`}>{user.xp.toLocaleString()} XP</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-end gap-5 justify-center mt-6">
      {/* 2nd Place */}
      {renderCard(silver, "silver")}
      {/* 1st Place */}
      {renderCard(gold, "gold")}
      {/* 3rd Place */}
      {renderCard(bronze, "bronze")}
    </div>
  );
}
