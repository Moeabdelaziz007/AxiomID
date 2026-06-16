"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Bot, Zap, Eye } from "lucide-react";
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bento-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-axiom-purple/10 border border-axiom-purple/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-axiom-purple" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{agentName}</h3>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('agent_id_label')} {agentId.slice(0, 8)}...</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 ${
            status === "ACTIVE"
              ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
              : status === "PAUSED"
                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                : "text-gray-500"
          }`}
          style={status === "INACTIVE" ? { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' } : undefined}
        >
          {status === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
          {status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg p-3 border text-center" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-gray-500" />
          <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('agent_trust_label')}</span>
          <span className="text-sm font-bold font-mono text-neon-green">{trustScore}%</span>
        </div>
        <div className="rounded-lg p-3 border text-center" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <Zap className="w-3.5 h-3.5 mx-auto mb-1 text-electric-blue" />
          <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('agent_xp_label')}</span>
          <span className="text-sm font-bold font-mono text-electric-blue">{xp.toLocaleString()}</span>
        </div>
        <div className="rounded-lg p-3 border text-center" style={{ borderColor: 'var(--card-border)', background: 'rgba(255,255,255,0.02)' }}>
          <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('agent_last_active')}</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>
            {lastActive ? new Date(lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : t('agent_never_active')}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {status === "INACTIVE" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleActivate}
            disabled={loading}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 flex-1 justify-center"
          >
            <Play className="w-4 h-4" />
            {loading ? t('agent_activating') : t('agent_activate')}
          </motion.button>
        )}
        {status === "ACTIVE" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePause}
            disabled={loading}
            className="text-sm px-5 py-2.5 flex items-center gap-2 rounded-lg border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/10 transition-colors flex-1 justify-center"
          >
            <Pause className="w-4 h-4" />
            {loading ? t('agent_pausing') : t('agent_pause')}
          </motion.button>
        )}
        {status === "PAUSED" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleActivate}
            disabled={loading}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 flex-1 justify-center"
          >
            <Play className="w-4 h-4" />
            {loading ? t('agent_resuming') : t('agent_resume')}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
