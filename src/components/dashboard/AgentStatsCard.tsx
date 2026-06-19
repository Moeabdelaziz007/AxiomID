"use client";

import { useLanguage } from "@/app/context/language-context";

interface AgentStatsCardProps {
  tier: string;
  xp: number;
  agentName: string | null;
  agentStatus: string;
  trustScore: number;
}

export function AgentStatsCard({ tier, xp, agentName, agentStatus, trustScore }: AgentStatsCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bento-card p-5">
      <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('agent_stats')}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('stat_level')}</p>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{tier}</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('stat_xp')}</p>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{xp.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('stat_agent')}</p>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{agentName || t('status_none')}</p>
        </div>
        <div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('agent_trust_label')}</p>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{trustScore}%</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('stat_status')}</span>
        <span className="text-xs font-mono flex items-center gap-1.5" style={{ color: agentStatus === "ACTIVE" ? "var(--color-success)" : agentStatus === "PAUSED" ? "var(--color-warning)" : "var(--text-muted)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${agentStatus === "ACTIVE" ? "bg-green-500" : agentStatus === "PAUSED" ? "bg-amber-500" : "bg-gray-500"}`} />
          {agentStatus}
        </span>
      </div>
    </div>
  );
}
