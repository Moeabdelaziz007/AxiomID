"use client";

import { useState } from "react";
import { Play, Pause, Bot, Eye } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface AgentControlsCardProps {
  agentName: string;
  agentId: string;
  status: "ACTIVE" | "INACTIVE" | "PAUSED";
  trustScore: number;
  xp: number;
  lastActive: string | null;
  onActivate: () => Promise<void>;
  onPause: () => Promise<void>;
}

/**
 * Renders a card displaying agent information and controls.
 *
 * Displays the agent's name, ID, status badge, and key metrics (trust score, XP, last active time). Provides conditional action buttons to activate, resume, or pause the agent based on its current status. Manages loading state during async operations.
 */
export function AgentControlsCard({
  agentName,
  agentId,
  status,
  trustScore,
  xp,
  lastActive,
  onActivate,
  onPause,
}: AgentControlsCardProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleActivate = async () => {
    setLoading(true);
    await onActivate();
    setLoading(false);
  };

  const handlePause = async () => {
    setLoading(true);
    await onPause();
    setLoading(false);
  };

  return (
    <div className="bento-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Bot className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{agentName}</h3>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('agent_id_label')} {agentId.slice(0, 8)}...</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 ${
            status === "ACTIVE"
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : status === "PAUSED"
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : ""
          }`}
          style={status === "INACTIVE" ? { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' } : undefined}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status === "ACTIVE" ? "bg-green-500" : status === "PAUSED" ? "bg-amber-500" : "bg-gray-500"}`} />
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <Eye className="w-3.5 h-3.5 mb-1" style={{ color: 'var(--text-muted)' }} />
          <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('agent_trust_label')}</span>
          <span className="text-sm font-mono mt-0.5 block" style={{ color: 'var(--text-primary)' }}>{trustScore}%</span>
        </div>
        <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <span className="text-[9px] font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>{t('agent_xp_label')}</span>
          <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{xp.toLocaleString()}</span>
        </div>
        <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <span className="text-[9px] font-mono block mb-1" style={{ color: 'var(--text-muted)' }}>{t('agent_last_active')}</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>
            {lastActive ? new Date(lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : t('agent_never_active')}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        {(status === "INACTIVE" || status === "PAUSED") && (
          <button
            onClick={handleActivate}
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? (status === "PAUSED" ? t('agent_resuming') : t('agent_activating')) : (status === "PAUSED" ? t('agent_resume') : t('agent_activate'))}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 flex-1 justify-center"
          >
            <Play className="w-4 h-4" />
            {loading ? (status === "PAUSED" ? t('agent_resuming') : t('agent_activating')) : (status === "PAUSED" ? t('agent_resume') : t('agent_activate'))}
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            onClick={handlePause}
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? t('agent_pausing') : t('agent_pause')}
            className="text-sm px-5 py-2.5 flex items-center gap-2 rounded-lg border flex-1 justify-center"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            <Pause className="w-4 h-4" />
            {loading ? t('agent_pausing') : t('agent_pause')}
          </button>
        )}
      </div>
    </div>
  );
}
