"use client";

import React from "react";
import { TrustScoreGauge } from "@/components/TrustScoreGauge";
import { useLanguage } from "@/app/context/language-context";

interface PassportStatsProps {
  trustScore: number;
  xp: number;
  issuedDate: string;
}

export function PassportStats({ trustScore, xp, issuedDate }: PassportStatsProps) {
  const { t } = useLanguage();
  const parsedDate = new Date(issuedDate);
  const formattedDate = isNaN(parsedDate.getTime())
    ? "N/A"
    : parsedDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-xl p-2 sm:p-3 border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
        <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_trust')}</span>
        <TrustScoreGauge score={trustScore} size={64} />
      </div>
      <div className="rounded-xl p-2 sm:p-3 border flex flex-col items-center justify-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
        <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_xp')}</span>
        <span className="text-base sm:text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{xp.toLocaleString()}</span>
      </div>
      <div className="rounded-xl p-2 sm:p-3 border flex flex-col items-center justify-center text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
        <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_issued')}</span>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{formattedDate}</span>
      </div>
    </div>
  );
}
