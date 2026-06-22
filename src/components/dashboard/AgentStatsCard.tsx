"use client";

import { useLanguage } from "@/app/context/language-context";

interface AgentStatsCardProps {
  tier: string;
  xp: number;
  agentName: string | null;
  agentStatus: string;
  trustScore: number;
}

/**
 * Displays agent statistics including level, experience points, trust score, and current operational status.
 */
export function AgentStatsCard({ tier, xp, agentName, agentStatus, trustScore }: AgentStatsCardProps) {
  const { t, language } = useLanguage();

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Background glow */}
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
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06] relative z-10">
        <span className="text-[11px] text-zinc-500">{language === "en" ? "Status" : "الحالة"}</span>
        <span className="text-xs font-mono flex items-center gap-1.5" style={{ color: agentStatus === "ACTIVE" ? "var(--color-success)" : agentStatus === "PAUSED" ? "var(--color-warning)" : "var(--text-muted)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${agentStatus === "ACTIVE" ? "bg-green-500" : agentStatus === "PAUSED" ? "bg-amber-500" : "bg-gray-500"}`} />
          {agentStatus}
        </span>
      </div>
    </div>
  );
}
