"use client";

import { VerificationBadge } from "./VerificationBadge";
import { TrustScoreGauge } from "./TrustScoreGauge";
import type { Tier } from "@/lib/tiers";

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
  const tierColor = getTierColor(tier);
  const displayAddress = stellarAddress || walletAddress;
  const shortAddress = displayAddress && displayAddress.length > 20
    ? `${displayAddress.slice(0, 10)}...${displayAddress.slice(-8)}`
    : displayAddress || 'No address';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="passport-card p-0 animate-holographic">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
            <span className="text-neon-green font-bold text-[10px]">A</span>
          </div>
          <span className="font-mono text-xs tracking-wider text-white">AXIOMID</span>
        </div>
        <span className="font-mono text-[9px] text-gray-500 tracking-widest">AGENT PASSPORT</span>
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
            <h3 className="text-lg font-bold text-white font-mono">{username}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-[10px] text-gray-500 font-mono break-all">{did}</p>
              <button onClick={() => copyToClipboard(did)} className="text-gray-500 hover:text-white" aria-label="Copy DID">📋</button>
            </div>
          </div>

          {/* Wallet */}
          <div className="w-full bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[9px] text-gray-500 font-mono block">WALLET</span>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neon-green font-mono">{shortAddress}</span>
              {displayAddress && <button onClick={() => copyToClipboard(displayAddress)} className="text-gray-500 hover:text-white" aria-label="Copy Wallet Address">📋</button>}
            </div>
          </div>

          {/* Agent info */}
          {agentName && (
            <div className="w-full bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-[9px] text-gray-500 font-mono block">AGENT</span>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white font-mono">{agentName}</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                  agentStatus === "active"
                    ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                    : "bg-white/5 text-gray-400 border border-white/10"
                }`}>
                  {agentStatus?.toUpperCase() || "NONE"}
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
              <span>TIER: {tier.toUpperCase()}</span>
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
              <span className="text-[9px] text-gray-500 font-mono block">TRUST</span>
              <TrustScoreGauge score={trustScore} size={64} />
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[9px] text-gray-500 font-mono block">XP</span>
              <span className="text-xl font-bold text-white font-mono">{xp}</span>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center">
              <span className="text-[9px] text-gray-500 font-mono block">ISSUED</span>
              <span className="text-[11px] text-white font-mono">{new Date(issuedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {/* KYA Manifest */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-axiom-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider">KYA MANIFEST</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-gray-500">Principal: </span>
                <span className="text-white">{username}</span>
              </div>
              <div>
                <span className="text-gray-500">Network: </span>
                <span className="text-electric-blue">Pi Network</span>
              </div>
              <div>
                <span className="text-gray-500">KYC Bound: </span>
                <span className={kycStatus === "verified" ? "text-neon-green" : "text-gray-400"}>
                  {kycStatus === "verified" ? "YES" : "NO"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">License: </span>
                <span className="text-axiom-purple">AxiomID v1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-white/[0.01]">
        <span className="text-[9px] text-gray-600 font-mono">
          AxiomID Verified • Pi Compatible Identity
        </span>
        <span className="text-[9px] text-gray-600 font-mono">
          {new Date(issuedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
