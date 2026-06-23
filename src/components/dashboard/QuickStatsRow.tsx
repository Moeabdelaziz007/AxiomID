"use client";

import { useLanguage } from "@/app/context/language-context";

interface QuickStatsRowProps {
  trustScore: number;
  xp: number;
  levelProgress: number;
  agentStatus: string;
  daysActive: number;
}

function CircularProgress({ value, size = 36 }: { value: number; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#3b82f6" : "#f59e0b";
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">
        {value}
      </text>
    </svg>
  );
}

export function QuickStatsRow({ trustScore, xp, levelProgress, agentStatus, daysActive }: QuickStatsRowProps) {
  const { t } = useLanguage();
  const nextLevelXp = levelProgress > 0 ? Math.ceil((xp * 100) / levelProgress) : 0;
  const xpNeeded = Math.max(0, nextLevelXp - xp);
  const agentActive = agentStatus === "ACTIVE";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Trust Score - Circular Gauge */}
      <div className="bento-card p-4 flex items-center gap-3">
        <CircularProgress value={trustScore} />
        <div className="min-w-0">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block truncate">{t("trust_score_label")}</span>
          <span className="text-sm font-mono font-bold text-surface">{trustScore}%</span>
        </div>
      </div>

      {/* XP Progress - Progress Bar */}
      <div className="bento-card p-4">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">{t("xp_progress")}</span>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(levelProgress, 100)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-500 shrink-0">{xpNeeded} to go</span>
        </div>
      </div>

      {/* Agent Status - Green/Red Dot */}
      <div className="bento-card p-4 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full shrink-0 ${agentActive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
        <div className="min-w-0">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block truncate">{t("agent_status")}</span>
          <span className={`text-sm font-mono font-bold ${agentActive ? "text-green-400" : "text-gray-400"}`}>
            {agentActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      {/* Days Active - Counter */}
      <div className="bento-card p-4">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">{t("days_active")}</span>
        <span className="text-2xl font-mono font-bold text-surface">{daysActive}</span>
      </div>
    </div>
  );
}
