"use client";

import { useLanguage } from "@/app/context/language-context";

interface AgentStatsCardProps {
  tier: string;
  xp: number;
  agentName: string | null;
  agentStatus: string;
  trustScore: number;
}

function Sparkline({ xp }: { xp: number }) {
  const w = 120, h = 32;
  const points = [
    Math.max(0, xp * 0.1),
    Math.max(0, xp * 0.25),
    Math.max(0, xp * 0.35),
    Math.max(0, xp * 0.5),
    Math.max(0, xp * 0.65),
    Math.max(0, xp * 0.8),
    xp,
  ];
  const max = Math.max(...points, 1);
  const coords = points.map((p, i) => `${(i / 6) * w},${h - (p / max) * (h - 4)}`);
  const fill = [...coords, `${w},${h}`, `0,${h}`].join(" ");

  return (
    <svg width={w} height={h} className="w-full h-8" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,197,94,0.3)" />
          <stop offset="100%" stopColor="rgba(34,197,94,0)" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#sparkFill)" />
      <polyline points={coords.join(" ")} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentStatsCard({ tier, xp, agentName, agentStatus, trustScore }: AgentStatsCardProps) {
  const { t, language } = useLanguage();

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-axiom-purple/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
      
      <h3 className="text-xs uppercase tracking-wider font-semibold mb-4 text-zinc-500 relative z-10">
        {t('agent_stats')}
      </h3>
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div>
          <p className="text-[11px] text-zinc-500">{language === "en" ? "Tier" : "المستوى"}</p>
          <p className="text-sm font-mono mt-0.5 text-surface font-semibold">{tier}</p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500">{language === "en" ? "Experience" : "الخبرة"}</p>
          <p className="text-sm font-mono mt-0.5 text-surface font-semibold">{xp.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500">{language === "en" ? "Agent" : "العميل"}</p>
          <p className="text-sm font-mono mt-0.5 text-surface font-semibold truncate">{agentName || t('status_none')}</p>
        </div>
        <div>
          <p className="text-[11px] text-zinc-500">{language === "en" ? "Trust Score" : "نقاط الثقة"}</p>
          <p className="text-sm font-mono mt-0.5 text-surface font-semibold">{trustScore}%</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{language === "ar" ? "آخر 7 أيام" : "Last 7 days"}</span>
        </div>
        <Sparkline xp={xp} />
      </div>

      <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.06] relative z-10">
        <span className="text-[11px] text-zinc-500">{language === "en" ? "Status" : "الحالة"}</span>
        <span className="text-xs font-mono flex items-center gap-1.5" style={{ color: agentStatus === "ACTIVE" ? "var(--color-success)" : agentStatus === "PAUSED" ? "var(--color-warning)" : "var(--text-muted)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${agentStatus === "ACTIVE" ? "bg-green-500" : agentStatus === "PAUSED" ? "bg-amber-500" : "bg-gray-500"}`} />
          {agentStatus}
        </span>
      </div>
    </div>
  );
}
