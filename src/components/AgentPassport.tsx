"use client";

import { VerificationBadge } from "./VerificationBadge";
import { TrustScoreGauge } from "./TrustScoreGauge";
import type { Tier } from "@/lib/tiers";
import { useLanguage } from "@/app/context/language-context";

interface AgentPassportProps {
  username: string;
  walletAddress?: string | null;
  stellarAddress?: string | null;
  tier: Tier;
  trustScore: number;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  issuedDate: string;
  did: string;
  agentName?: string;
  agentStatus?: string;
  xp: number;
}

function getTierColor(tier: Tier): string {
  switch (tier) {
    case "Sovereign": return "#a855f7";
    case "Validator": return "#00d4ff";
    case "Citizen": return "#00ff41";
    default: return "#64748b";
  }
}

function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

/**
 * Render an agent passport card displaying identity, addresses, verification badges, tier, and statistics.
 *
 * @param username - Display name for the agent
 * @param did - Decentralized identifier shown and copyable in the card
 * @param agentName - Optional agent organization or label shown when present
 * @param agentStatus - Optional agent state; when equal to `"ACTIVE"` the status badge is styled as active
 * @param walletAddress - Optional fallback wallet address used if `stellarAddress` is not provided
 * @param stellarAddress - Optional preferred address displayed and copied instead of `walletAddress`
 * @param tier - Agent tier (from `Tier`) used for badge color and label
 * @param trustScore - Numeric trust score rendered by the TrustScoreGauge
 * @param xp - Experience points displayed with locale formatting
 * @param kyaStatus - KYA verification status; one of `"verified" | "pending" | "denied"`
 * @param kycStatus - KYC verification status; one of `"verified" | "pending" | "denied"`
 * @param issuedDate - Date string used to display issued date information
 * @returns The JSX element for the agent passport card
 */
export function AgentPassport({
  username,
  walletAddress,
  stellarAddress,
  tier,
  trustScore,
  kyaStatus,
  kycStatus,
  issuedDate,
  did,
  agentName,
  agentStatus,
  xp,
}: AgentPassportProps) {
  const { t } = useLanguage();
  const tierColor = getTierColor(tier);
  const displayAddress = stellarAddress || walletAddress;
  const shortAddress = displayAddress && displayAddress.length > 20
    ? `${displayAddress.slice(0, 10)}...${displayAddress.slice(-8)}`
    : displayAddress || t('no_address');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="passport-card p-0 animate-holographic">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
            <span className="text-neon-green font-bold text-[10px]">A</span>
          </div>
          <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--text-primary)' }}>AXIOMID</span>
        </div>
        <span className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('agent_passport')}</span>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Left: Photo + Basic Info */}
        <div className="flex flex-col items-center gap-4 md:w-48">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 text-3xl font-bold font-mono animate-glow-pulse"
            style={{
              borderColor: tierColor,
              background: `linear-gradient(135deg, ${tierColor}15, ${tierColor}05)`,
              color: tierColor,
              boxShadow: `0 0 20px ${tierColor}20`,
            }}
          >
            {getInitial(username)}
          </div>

          {/* Name + DID */}
          <div className="text-center">
            <h3 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{username}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{did}</p>
              <button onClick={() => copyToClipboard(did)} className="hover:text-white" style={{ color: 'var(--text-muted)' }} aria-label="Copy DID">📋</button>
            </div>
          </div>

          {/* Wallet */}
          <div className="w-full rounded-lg px-3 py-2 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
            <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>{t('label_wallet')}</span>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neon-green font-mono">{shortAddress}</span>
              {displayAddress && <button onClick={() => copyToClipboard(displayAddress)} className="hover:text-white" style={{ color: 'var(--text-muted)' }} aria-label="Copy Wallet Address">📋</button>}
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
        </div>

        {/* Right: Verification + Stats */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Verification badges */}
          <div className="flex flex-wrap gap-2">
            <VerificationBadge type="kya" status={kyaStatus} />
            <VerificationBadge type="kyc" status={kycStatus} />
            <span
              className="badge"
              style={{
                background: `${tierColor}15`,
                color: tierColor,
                borderColor: `${tierColor}40`,
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{t('tier_label')}: {tier.toUpperCase()}</span>
            </span>
          </div>

          {/* Stats row */}
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
              <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{new Date(issuedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {/* KYA Manifest */}
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
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: 'var(--card-border)', background: 'var(--bg-card)' }}>
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {t('passport_footer_verified')}
        </span>
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {new Date(issuedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
