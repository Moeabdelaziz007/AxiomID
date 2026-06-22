"use client";

import { useLanguage } from "@/app/context/language-context";
import { Tier, getNextLevelXP } from "@/lib/tiers";

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
  const { t, language } = useLanguage();
  const nextXP = getNextLevelXP(tier as Tier);

  return (
    <div className="glass-card p-6 sm:p-8 mb-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-electric-blue/10 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-neon-green/8 to-transparent rounded-full blur-2xl opacity-50 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-surface">
              {language === "en" ? `Hello, ${username}.` : `مرحباً، ${username}.`}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">
                {language === "en" ? "Trust Score:" : "نقاط الثقة:"}
              </span>
              <span className="text-sm font-mono font-bold text-neon-green">{tier}</span>
            </div>
          </div>
          <div className="flex-shrink-0 glass-card px-5 py-3 rounded-xl border border-white/[0.06]">
            <div className="text-right">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">{t('xp_balance')}</span>
              <span className="font-mono text-xl font-bold text-neon-green">{xp.toLocaleString()}</span>
              <span className="text-[10px] font-mono text-zinc-500 ml-1">XP</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1.5">
            <span>{t('level_progress')}</span>
            <span>
              {xp.toLocaleString()} {nextXP ? `/ ${nextXP.toLocaleString()} XP` : "XP (MAX)"}
            </span>
          </div>
          <div className="tier-progress">
            <div
              className="tier-progress-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
