"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Eye } from "lucide-react";
import type { Tier } from "@/lib/tiers";

interface AgentCardProps {
  name: string;
  tier: Tier;
  trustScore: number;
  xp: number;
  status: "ACTIVE" | "INACTIVE" | "PAUSED";
  did?: string;
  compact?: boolean;
  onClick?: () => void;
}

function getTierColor(tier: Tier): string {
  switch (tier) {
    case "Sovereign": return "#a855f7";
    case "Validator": return "#00d4ff";
    case "Citizen": return "#00ff41";
    default: return "#64748b";
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return { color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/20", dot: true };
    case "PAUSED":
      return { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", dot: false };
    default:
      return { color: "text-gray-500", bg: "bg-white/5", border: "border-white/10", dot: false };
  }
}

export function AgentCard({
  name,
  tier,
  trustScore,
  xp,
  status,
  did,
  compact = false,
  onClick,
}: AgentCardProps) {
  const tierColor = getTierColor(tier);
  const statusConfig = getStatusConfig(status);

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bento-card p-4 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center border text-sm font-bold font-mono flex-shrink-0"
            style={{
              borderColor: `${tierColor}40`,
              background: `${tierColor}10`,
              color: tierColor,
            }}
          >
            {name ? name[0].toUpperCase() : "?"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{name}</h4>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border flex items-center gap-1`}>
                {statusConfig.dot && <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse" />}
                {status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-mono text-gray-500">{tier}</span>
              <span className="text-[10px] font-mono text-electric-blue">{xp.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Trust mini-gauge */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="relative w-8 h-8">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tierColor} strokeWidth="3" strokeDasharray={`${trustScore}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold" style={{ color: tierColor }}>
                {trustScore}
              </span>
            </div>
            <span className="text-[7px] font-mono text-gray-600">TRUST</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bento-card p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center border text-lg font-bold font-mono"
            style={{
              borderColor: `${tierColor}40`,
              background: `radial-gradient(circle, ${tierColor}20 0%, ${tierColor}05 70%)`,
              color: tierColor,
              boxShadow: `0 0 20px ${tierColor}20`,
            }}
          >
            {name ? name[0].toUpperCase() : "?"}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30` }}>
                {tier.toUpperCase()}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border flex items-center gap-1`}>
                {statusConfig.dot && <span className="w-1 h-1 rounded-full bg-neon-green animate-pulse" />}
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg p-2.5 border border-white/5 bg-white/[0.02] text-center">
          <Eye className="w-3 h-3 mx-auto mb-1 text-gray-500" />
          <span className="text-[9px] font-mono text-gray-500 block">TRUST</span>
          <span className="text-sm font-bold font-mono" style={{ color: tierColor }}>{trustScore}%</span>
        </div>
        <div className="rounded-lg p-2.5 border border-white/5 bg-white/[0.02] text-center">
          <Zap className="w-3 h-3 mx-auto mb-1 text-electric-blue" />
          <span className="text-[9px] font-mono text-gray-500 block">XP</span>
          <span className="text-sm font-bold font-mono text-electric-blue">{xp.toLocaleString()}</span>
        </div>
        <div className="rounded-lg p-2.5 border border-white/5 bg-white/[0.02] text-center">
          <Shield className="w-3 h-3 mx-auto mb-1 text-axiom-purple" />
          <span className="text-[9px] font-mono text-gray-500 block">STATUS</span>
          <span className={`text-sm font-bold font-mono ${statusConfig.color}`}>{status}</span>
        </div>
      </div>

      {/* DID */}
      {did && (
        <div className="rounded-lg px-3 py-2 border border-white/5 bg-white/[0.01]">
          <span className="text-[9px] font-mono text-gray-500">DID</span>
          <p className="text-[10px] font-mono text-gray-400 mt-0.5 break-all">{did}</p>
        </div>
      )}

      {/* Hover indicator */}
      <div className="flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-mono text-gray-500">Click to view passport →</span>
      </div>
    </motion.div>
  );
}
