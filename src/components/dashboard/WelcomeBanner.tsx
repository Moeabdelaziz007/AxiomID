"use client";

import { useLanguage } from "@/app/context/language-context";

interface WelcomeBannerProps {
  username: string;
  tier: string;
  levelProgress: number;
  xp: number;
}

/**
 * Renders a welcome banner displaying the user's name, tier level, XP, and progress towards the next level.
 *
 * @param levelProgress - The percentage of progress towards the next level, from 0 to 100
 * @returns The welcome banner element
 */
export function WelcomeBanner({ username, tier, levelProgress, xp }: WelcomeBannerProps) {
  const { t } = useLanguage();
  return (
    <div className="bento-card p-6 sm:p-8 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('welcome_back_name').replace('{username}', username)}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('agent_identity_ready')} <span className="text-blue-500 font-mono">{tier}</span>
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <div className="text-right">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">{t('xp_balance')}</span>
            <span className="font-mono text-base font-bold text-neon-green">{xp.toLocaleString()} XP</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1">
          <span>{t('level_progress')}</span>
          <span>{Math.round(levelProgress)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
