"use client";

import React from "react";
import { useLanguage } from "@/app/context/language-context";

export function PassportHeader() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
          <span className="text-neon-green font-bold text-[10px]">A</span>
        </div>
        <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>AXIOMID</span>
      </div>
      <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('agent_passport')}</span>
    </div>
  );
}
