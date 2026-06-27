"use client";

import { getTierColor } from "@/lib/tiers";
import {
  AgentPassportProps,
  MODULE_SLOTS,
  PassportHeader,
  PassportAvatar,
  PassportIdentity,
  PassportBadges,
  PassportStats,
  PassportModules,
  PassportManifest,
  PassportFooter
} from "./passport";
import { useLanguage } from "@/app/context/language-context";

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
 * @param stamps - Optional array of PassportStamps for connected modules
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
  stamps,
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

  const activeStampTypes = new Set((stamps || []).map((s) => s.type));
  const activeModules = MODULE_SLOTS.filter((m) => m.matchTypes.some((type) => activeStampTypes.has(type)));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="passport-card p-0 animate-holographic">
      <PassportHeader />

      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Left: Photo + Basic Info */}
        <div className="flex flex-col items-center gap-4 md:w-48">
          <PassportAvatar username={username} tierColor={tierColor} />

          <PassportIdentity
            username={username}
            did={did}
            displayAddress={displayAddress}
            shortAddress={shortAddress}
            agentName={agentName}
            agentStatus={agentStatus}
            copyToClipboard={copyToClipboard}
          />
        </div>

        {/* Right: Verification + Stats */}
        <div className="flex-1 flex flex-col gap-4">
          <PassportBadges
            kyaStatus={kyaStatus}
            kycStatus={kycStatus}
            tier={tier}
            tierColor={tierColor}
          />

          <PassportStats
            trustScore={trustScore}
            xp={xp}
            issuedDate={issuedDate}
          />

          <PassportModules
            activeModules={activeModules}
          />

          <PassportManifest
            username={username}
            kycStatus={kycStatus}
          />
        </div>
      </div>

      <PassportFooter issuedDate={issuedDate} />
    </div>
  );
}
