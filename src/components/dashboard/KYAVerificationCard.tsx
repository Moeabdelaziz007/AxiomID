"use client";

import { useState } from "react";
import { CheckCircle, Clock, Shield } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface KYAVerificationCardProps {
  kycStatus: string;
  did: string;
  piUsername: string | null;
  onVerify: (username: string) => Promise<void>;
}

/**
 * Displays a Know Your Account (KYA) verification card with status and verification controls.
 *
 * Renders different content based on the verification status: a verified DID display
 * if verified, a pending validation message if in progress, or a username input field
 * with a verification button if unverified.
 *
 * @param kycStatus - The current verification status: `"VERIFIED"`, `"PENDING"`, or any other value for unverified.
 * @param onVerify - Callback invoked with the trimmed username when verification is initiated.
 */
export function KYAVerificationCard({ kycStatus, did, piUsername, onVerify }: KYAVerificationCardProps) {
  const [username, setUsername] = useState(piUsername || "");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleVerify = async () => {
    if (!username.trim()) return;
    setLoading(true);
    await onVerify(username.trim());
    setLoading(false);
  };

  return (
    <div className="bento-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('identity_verification_kya')}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('kya_secure_did')}</p>
          </div>
        </div>
        {kycStatus === "VERIFIED" ? (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" /> {t('status_verified')}
          </span>
        ) : kycStatus === "PENDING" ? (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {t('status_pending')}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
            {t('status_unverified')}
          </span>
        )}
      </div>

      {kycStatus === "VERIFIED" ? (
        <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-green-500 font-medium">{t('kya_verified_anchored')}</p>
          <p className="font-mono" style={{ color: 'var(--text-muted)' }}>{did}</p>
        </div>
      ) : kycStatus === "PENDING" ? (
        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-amber-500 font-medium"><Clock className="w-3 h-3 inline me-1" /> {t('kya_verification_pending')}</p>
          <p>{t('kya_oracle_validating')}</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('kya_pi_username')}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-mono transition-colors focus:outline-none focus:border-blue-500/40"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleVerify}
            disabled={loading || !username.trim()}
            className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
          >
            {loading ? t('kya_verifying') : t('kya_verify_identity')}
          </button>
        </div>
      )}
    </div>
  );
}
