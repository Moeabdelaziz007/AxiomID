"use client";

import React from "react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useLanguage } from "@/app/context/language-context";
import { Tier } from "@/lib/tiers";

interface PassportBadgesProps {
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  tier: Tier;
  tierColor: string;
}

export function PassportBadges({
  kyaStatus,
  kycStatus,
  tier,
  tierColor,
}: PassportBadgesProps) {
  const { t } = useLanguage();

  return (
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
  );
}
