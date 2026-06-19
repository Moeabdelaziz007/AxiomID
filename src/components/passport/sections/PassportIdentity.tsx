"use client";

import React from "react";
import { Copy } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface PassportIdentityProps {
  username: string;
  did: string;
  displayAddress?: string | null;
  shortAddress: string;
  agentName?: string;
  agentStatus?: string;
  copyToClipboard: (text: string) => void;
}

export function PassportIdentity({
  username,
  did,
  displayAddress,
  shortAddress,
  agentName,
  agentStatus,
  copyToClipboard,
}: PassportIdentityProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Name + DID */}
      <div className="text-center">
        <h3 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{username}</h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{did}</p>
          <button type="button" onClick={() => copyToClipboard(did)} className="hover:text-surface" style={{ color: 'var(--text-muted)' }} aria-label="Copy DID"><Copy className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Wallet */}
      <div className="w-full rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
        <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_wallet')}</span>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neon-green font-mono">{shortAddress}</span>
          {displayAddress && <button type="button" onClick={() => copyToClipboard(displayAddress)} className="hover:text-surface" style={{ color: 'var(--text-muted)' }} aria-label="Copy Wallet Address"><Copy className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Agent info */}
      {agentName && (
        <div className="w-full rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
          <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_agent')}</span>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{agentName}</span>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
              agentStatus?.toUpperCase() === "ACTIVE"
                ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                : "border"
            }`} style={agentStatus?.toUpperCase() !== "ACTIVE" ? { background: 'var(--bg-card)', color: 'var(--text-muted)', borderColor: 'var(--card-border)' } : undefined}>
              {agentStatus?.toUpperCase() || t('status_none')}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
