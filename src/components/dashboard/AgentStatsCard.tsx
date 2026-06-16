"use client";

import { motion } from "framer-motion";
import { Eye, Zap, Shield, User } from "lucide-react";
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
  const stats = [
    { label: t('stat_level'), value: tier, color: "text-neon-green", icon: <Shield className="w-3.5 h-3.5" /> },
    { label: t('stat_xp'), value: xp.toLocaleString(), color: "text-electric-blue", icon: <Zap className="w-3.5 h-3.5" /> },
    { label: t('stat_agent'), value: agentName || t('status_none'), color: "text-axiom-purple", icon: <User className="w-3.5 h-3.5" /> },
    { label: t('agent_trust_label'), value: `${trustScore}%`, color: "text-neon-green", icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bento-card p-5"
    >
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <Shield className="w-4 h-4 text-neon-green" />
        {t('agent_stats')}
      </h3>
      <div className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{stat.icon}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
            </div>
            <span className={`${stat.color} font-mono text-sm`}>{stat.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('stat_status')}</span>
          <span className={`font-mono text-sm flex items-center gap-1.5 ${agentStatus === "ACTIVE" ? "text-neon-green" : agentStatus === "PAUSED" ? "text-yellow-400" : "text-gray-500"}`}>
            {agentStatus === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
            {agentStatus}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
