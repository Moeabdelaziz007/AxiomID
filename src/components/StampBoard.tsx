"use client";

import { useState, useRef } from "react";
import { StampCard } from "./StampCard";
import { TrustScoreGauge } from "./TrustScoreGauge";
import type { Tier } from "@/lib/tiers";

interface Action {
  type: string;
  xp: number;
  timestamp: string;
  metadata?: string | null;
}

interface Stamp {
  type: string;
  provider: string;
  xpAwarded: number;
  metadata?: string | null;
  createdAt: string;
}

interface User {
  id: string;
  walletAddress: string;
  stellarAddress?: string | null;
  piUsername?: string | null;
  xp: number;
  tier: Tier;
  actions?: Action[];
  stamps?: Stamp[];
}

interface StampBoardProps {
  user: User | null;
  claimAction: (actionType: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  connectWallet: () => void;
}

const STAMP_DEFS = [
  { type: "connect_twitter", label: "Twitter Stamp", xp: 50, icon: "🐦", isAutomatic: false },
  { type: "connect_discord", label: "Discord Stamp", xp: 50, icon: "💬", isAutomatic: false },
  { type: "connect_google", label: "Google Stamp", xp: 50, icon: "🔑", isAutomatic: false },
  { type: "daily_pow", label: "Proof of Work", xp: 20, icon: "⛏️", isAutomatic: true },
  { type: "wallet_age", label: "Wallet Activity", xp: 300, icon: "💰", isAutomatic: true },
  { type: "verify_identity", label: "KYC Status Stamp", xp: 100, icon: "🔐", isAutomatic: true },
];

export function StampBoard({ user, claimAction, connectWallet }: StampBoardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeVc, setActiveVc] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const vcDialogRef = useRef<HTMLDialogElement>(null);

  const isConnected = (type: string) => {
    return !!user?.stamps?.some((s) => s.type === type);
  };

  const getMetadata = (type: string) => {
    return user?.stamps?.find((s) => s.type === type)?.metadata || null;
  };

  const handleConnect = async (type: string, handle: string) => {
    if (!user) {
      connectWallet();
      return false;
    }
    return await claimAction(type, { handle });
  };

  const openVcModal = (type: string) => {
    const stamp = user?.stamps?.find((s) => s.type === type);
    if (!stamp) return;
    try {
      const parsedVc = JSON.parse(stamp.metadata || "{}");
      if (parsedVc === null) {
        throw new Error("Invalid or empty credential metadata");
      }
      setActiveVc(parsedVc);
      vcDialogRef.current?.showModal();
    } catch {
      setActiveVc({ error: "Failed to parse Verifiable Credential payload." });
      vcDialogRef.current?.showModal();
    }
  };

  const copyVcPayload = () => {
    if (!activeVc) return;
    navigator.clipboard.writeText(JSON.stringify(activeVc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = vcDialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInContent =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isInContent) {
      dialog.close();
    }
  };

  // Calculate Trust Score (percentage of stamps claimed)
  const totalStamps = STAMP_DEFS.length;
  const claimedCount = STAMP_DEFS.filter((s) => isConnected(s.type)).length;
  const trustScore = totalStamps > 0 ? Math.round((claimedCount / totalStamps) * 100) : 0;

  // Next Tier progress
  const currentXp = user?.xp || 0;
  let nextTierXp = 100;
  let nextTierName = "Citizen";
  if (user?.tier === "Citizen") {
    nextTierXp = 500;
    nextTierName = "Validator";
  } else if (user?.tier === "Validator") {
    nextTierXp = 1000;
    nextTierName = "Sovereign";
  } else if (user?.tier === "Sovereign") {
    nextTierXp = 1000;
    nextTierName = "Maximized";
  }
  const progressPercent = Math.min(100, Math.round((currentXp / nextTierXp) * 100));

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trust Gauge card */}
        <div className="bento-card p-6 flex items-center justify-between border border-white/5 bg-white/[0.01]">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Trust Score</h3>
            <p className="text-xs text-gray-400 max-w-[160px] leading-relaxed">
              Earn stamps to build your cryptographic trust score.
            </p>
            <div className="pt-2 font-mono text-[10px] text-gray-500">
              Stamps: <span className="text-neon-green font-bold">{claimedCount}</span> / {totalStamps}
            </div>
          </div>
          <div className="flex-shrink-0">
            <TrustScoreGauge score={trustScore} size={84} />
          </div>
        </div>

        {/* Progress Card */}
        <div className="bento-card p-6 flex flex-col justify-between border border-white/5 bg-white/[0.01] md:col-span-2 col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Level Progress</h3>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Current Tier: <span className="text-neon-green font-bold">{user?.tier || "VISITOR"}</span>
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {currentXp} / {nextTierXp} XP
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-neon-green to-electric-blue transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>{progressPercent}% Complete</span>
              {user?.tier !== "Sovereign" && (
                <span>Next Tier: {nextTierName} ({nextTierXp - currentXp} XP needed)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stamps Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Live Stamps Collection</h3>
          <span className="text-[10px] font-mono text-gray-500">Complete tasks to anchor verifiable credentials</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {STAMP_DEFS.map((stamp) => (
            <StampCard
              key={stamp.type}
              type={stamp.type}
              label={stamp.label}
              xp={stamp.xp}
              icon={stamp.icon}
              isConnected={isConnected(stamp.type)}
              metadata={getMetadata(stamp.type)}
              onConnect={(handle) => handleConnect(stamp.type, handle)}
              onInspectVc={() => openVcModal(stamp.type)}
              isAutomatic={stamp.isAutomatic}
            />
          ))}
        </div>
      </div>

      {/* VC Inspector Modal */}
      <dialog
        ref={vcDialogRef}
        onClick={handleBackdropClick}
        className="bg-transparent p-4 focus:outline-none"
      >
        <div className="bento-card max-w-lg w-full p-6 border border-white/10 shadow-2xl bg-black">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                W3C Verifiable Credential
              </h3>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                Cryptographically signed claim payload
              </p>
            </div>
            <button
              onClick={() => vcDialogRef.current?.close()}
              className="text-gray-500 hover:text-white text-xs font-mono border border-white/5 hover:border-white/10 px-2 py-0.5 rounded cursor-pointer"
            >
              CLOSE
            </button>
          </div>

          {activeVc && (
            <div className="space-y-4">
              <pre className="text-[9px] text-neon-green font-mono bg-black/80 p-3 rounded-lg border border-white/5 overflow-x-auto max-h-64 scrollbar-thin">
                {JSON.stringify(activeVc, null, 2)}
              </pre>

              <div className="flex gap-2">
                <button
                  onClick={copyVcPayload}
                  className="flex-1 btn-primary py-2 text-[10px] font-mono"
                >
                  {copied ? "COPIED!" : "COPY PAYLOAD"}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(activeVc, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `credential-${activeVc.credentialSubject?.platform || "identity"}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-ghost py-2 text-[10px] font-mono px-4"
                >
                  DOWNLOAD JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
