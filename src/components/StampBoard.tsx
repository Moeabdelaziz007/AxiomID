"use client";

import { useState, useRef } from "react";
import { AtSign, MessageCircle, Key, Pickaxe, Wallet, ShieldCheck } from "lucide-react";
import { StampCard } from "./StampCard";
import { TrustScoreGauge } from "./TrustScoreGauge";
import type { Tier } from "@/lib/tiers";
import { calculateTrustScore } from "@/lib/trust";
import { getLevelProgress, getNextLevelXP } from "@/lib/tiers";
import { useLanguage } from "@/app/context/language-context";

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
  { type: "connect_twitter", label: "Twitter Stamp", xp: 50, icon: <AtSign className="w-6 h-6" />, isAutomatic: false },
  { type: "connect_discord", label: "Discord Stamp", xp: 50, icon: <MessageCircle className="w-6 h-6" />, isAutomatic: false },
  { type: "connect_google", label: "Google Stamp", xp: 50, icon: <Key className="w-6 h-6" />, isAutomatic: false },
  { type: "daily_pow", label: "Proof of Work", xp: 20, icon: <Pickaxe className="w-6 h-6" />, isAutomatic: true },
  { type: "wallet_age", label: "Wallet Activity", xp: 300, icon: <Wallet className="w-6 h-6" />, isAutomatic: true },
  { type: "verify_identity", label: "KYC Status Stamp", xp: 100, icon: <ShieldCheck className="w-6 h-6" />, isAutomatic: true },
];

/**
 * Renders the user's live stamps dashboard including trust score, level progress, stamps grid, and a modal to inspect or download Verifiable Credential payloads.
 *
 * @param user - The current user object or `null`. Used to determine claimed stamps, XP, and tier for display.
 * @param claimAction - Called to initiate a stamp claim; receives the stamp `type` and optional `metadata`, and should resolve to `true` on success.
 * @param connectWallet - Invoked when an action requires an authenticated user and `user` is `null`.
 * @returns The StampBoard React element.
 */
export function StampBoard({ user, claimAction, connectWallet }: StampBoardProps) {
  const { t } = useLanguage();
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
      const raw = stamp.metadata;
      if (!raw || typeof raw !== "string" || raw.trim() === "" || raw.trim() === "{}") {
        setActiveVc({ error: t("vc_no_data") });
        vcDialogRef.current?.showModal();
        return;
      }
      const parsedVc = JSON.parse(raw);
      if (!parsedVc || typeof parsedVc !== "object" || Object.keys(parsedVc).length === 0) {
        setActiveVc({ error: t("vc_empty_metadata") });
      } else {
        setActiveVc(parsedVc);
      }
      vcDialogRef.current?.showModal();
    } catch {
      setActiveVc({ error: t("vc_parse_error") });
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

  // Calculate Trust Score (blended: 70% XP, 30% stamps)
  const totalStamps = STAMP_DEFS.length;
  const claimedCount = STAMP_DEFS.filter((s) => isConnected(s.type)).length;
  const trustScore = calculateTrustScore(user?.xp || 0, claimedCount);

  // Next Tier progress (from lib/tiers.ts)
  const currentXp = user?.xp || 0;
  const currentTier: Tier = user?.tier || "Visitor";
  const progressPercent = getLevelProgress(currentXp, currentTier);
  const nextLevelXp = getNextLevelXP(currentTier);
  const TIER_ORDER: Tier[] = ["Visitor", "Citizen", "Validator", "Sovereign"];
  const tierIndex = TIER_ORDER.indexOf(currentTier);
  const nextTierName = tierIndex < 3 ? TIER_ORDER[tierIndex + 1] : null;
  const nextTierXp = nextLevelXp ?? currentXp;

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trust Gauge card */}
        <div className="bento-card p-6 flex items-center justify-between border border-white/5 bg-white/[0.01]">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-surface font-mono uppercase tracking-wider">{t('trust_score')}</h3>
            <p className="text-xs text-subtle max-w-[160px] leading-relaxed">
              {t('trust_score_desc')}
            </p>
            <div className="pt-2 font-mono text-[10px] text-faint">
              {t('stamps_label')} <span className="text-neon-green font-bold">{claimedCount}</span> / {totalStamps}
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
              <h3 className="text-sm font-bold text-surface font-mono uppercase tracking-wider">{t('level_progress')}</h3>
              <p className="text-xs text-subtle mt-1 font-mono">
                {t('current_tier')} <span className="text-neon-green font-bold">{user?.tier || "VISITOR"}</span>
              </p>
            </div>
            <span className="text-[10px] font-mono text-faint">
              {currentXp.toLocaleString()} / {nextTierXp.toLocaleString()} XP
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-neon-green to-electric-blue transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-faint">
              <span>{progressPercent}{t('percent_complete')}</span>
              {user?.tier !== "Sovereign" && (
                <span>{t('next_tier')} {nextTierName} ({(nextTierXp - currentXp).toLocaleString()} {t('xp_needed')})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stamps Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-surface font-mono uppercase tracking-wider">{t('live_stamps_collection')}</h3>
          <span className="text-[10px] font-mono text-faint">{t('stamps_collection_desc')}</span>
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
              <h3 className="text-base font-bold text-surface font-mono">
                {t('w3c_vc_title')}
              </h3>
              <p className="text-[9px] text-faint font-mono mt-0.5">
                {t('w3c_vc_subtitle')}
              </p>
            </div>
            <button
              onClick={() => vcDialogRef.current?.close()}
              className="text-faint hover:text-surface text-xs font-mono border border-white/5 hover:border-white/10 px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded cursor-pointer"
            >
              {t('close')}
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
                  {copied ? t('copied') : t('copy_payload')}
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
                  {t('download_json')}
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
