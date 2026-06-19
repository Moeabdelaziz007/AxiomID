"use client";

import { useLanguage } from "@/app/context/language-context";

interface WelcomeBannerProps {
  username: string;
  tier: string;
  xp: number;
  levelProgress: number;
}

export function WelcomeBanner({ username, tier, xp: _xp, levelProgress }: WelcomeBannerProps) {
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
      </div>
      <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-700"
          style={{ width: `${levelProgress}%` }}
        />
      </div>
    </div>
  );
}
