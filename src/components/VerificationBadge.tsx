"use client";

import { useLanguage } from "@/app/context/language-context";

interface VerificationBadgeProps {
  type: "kya" | "kyc";
  status: "verified" | "pending" | "denied";
}

const STATUS_ICONS = {
  verified: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  pending: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  denied: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const TYPE_LABELS = {
  kya: "KYA",
  kyc: "KYC",
};

export function VerificationBadge({ type, status }: VerificationBadgeProps) {
  const { t } = useLanguage();
  const icon = STATUS_ICONS[status];
  const labelKey = `status_${status}` as const;

  return (
    <span className={`badge badge-${status}`}>
      {icon}
      <span>{TYPE_LABELS[type]}</span>
      <span className="opacity-60">{t(labelKey)}</span>
    </span>
  );
}
