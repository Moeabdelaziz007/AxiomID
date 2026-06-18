import React from "react";
import { useLanguage } from "@/app/context/language-context";

interface PassportManifestProps {
  username: string;
  kycStatus: "verified" | "pending" | "denied";
}

export function PassportManifest({ username, kycStatus }: PassportManifestProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-axiom-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-[10px] tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{t('kya_manifest')}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{t('manifest_principal')} </span>
          <span style={{ color: 'var(--text-primary)' }}>{username}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{t('manifest_network')} </span>
          <span className="text-electric-blue">{t('pi_network')}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{t('manifest_kyc_bound')} </span>
          <span className={kycStatus === "verified" ? "text-neon-green" : ""} style={kycStatus !== "verified" ? { color: 'var(--text-muted)' } : undefined}>
            {kycStatus === "verified" ? t('yes') : t('no')}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>{t('manifest_license')} </span>
          <span className="text-axiom-purple">AxiomID v1</span>
        </div>
      </div>
    </div>
  );
}
