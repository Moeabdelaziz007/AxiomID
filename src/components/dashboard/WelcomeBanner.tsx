"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/app/context/language-context";

interface WelcomeBannerProps {
  username: string;
  tier: string;
  xp: number;
  levelProgress: number;
  isDemoWallet?: boolean;
}

export function WelcomeBanner({ username, tier, xp, levelProgress, isDemoWallet }: WelcomeBannerProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bento-card p-6 sm:p-8 mb-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('welcome_back_name').replace('{username}', username)}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('agent_identity_ready')} <span className="text-electric-blue font-mono">{tier}</span> &bull; {xp.toLocaleString()} XP
          </p>
        </div>
        {isDemoWallet && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-center flex-shrink-0">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-red-400">{t('demo_account')}</p>
            <p className="mt-0.5 text-[11px] text-red-200/80">{t('demo_not_valid')}</p>
          </div>
        )}
      </div>
      <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${levelProgress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="h-full bg-gradient-to-r from-neon-green to-electric-blue rounded-full"
        />
      </div>
    </motion.div>
  );
}
