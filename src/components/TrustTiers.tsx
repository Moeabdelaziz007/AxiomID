"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface TierInfo {
  key: string;
  xp: string;
  letter: string;
  color: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  perksEn: string[];
  perksAr: string[];
}

const tiers: TierInfo[] = [
  {
    key: "visitor",
    xp: "0",
    letter: "V",
    color: "#64748b",
    nameEn: "Visitor",
    nameAr: "زائر",
    descEn: "Connect your wallet to begin",
    descAr: "اربط محفظتك للبدء",
    perksEn: ["Basic DID Passport", "Community access", "Protocol explorer"],
    perksAr: ["جواز DID أساسي", "الوصول للمجتمع", "مستكشف البروتوكول"],
  },
  {
    key: "citizen",
    xp: "100",
    letter: "C",
    color: "#00ff41",
    nameEn: "Citizen",
    nameAr: "مواطن",
    descEn: "Social verification + actions",
    descAr: "التوثيق الاجتماعي والإجراءات",
    perksEn: ["Marketplace access", "Agent deployment", "KYA verification", "XP rewards"],
    perksAr: ["الوصول للسوق", "نشر العملاء", "توثيق KYA", "مكافآت XP"],
  },
  {
    key: "validator",
    xp: "500",
    letter: "V",
    color: "#00d4ff",
    nameEn: "Validator",
    nameAr: "مدقق",
    descEn: "KYC verified identity",
    descAr: "هوية موثقة بـ KYC",
    perksEn: ["Revenue share", "Governance voting", "Priority support", "Custom stamps"],
    perksAr: ["مشاركة الأرباح", "التصويت على الحوكمة", "دعم ذو أولوية", "طوابع مخصصة"],
  },
  {
    key: "sovereign",
    xp: "1000",
    letter: "S",
    color: "#a855f7",
    nameEn: "Sovereign",
    nameAr: "سيادي",
    descEn: "Full protocol control",
    descAr: "تحكم كامل في البروتوكول",
    perksEn: ["Full delegation", "Custom agents", "Protocol governance", "Maximum trust score"],
    perksAr: ["تفويض كامل", "عملاء مخصصون", "حوكمة البروتوكول", "أعلى نقاط ثقة"],
  },
];

/**
 * Renders expandable trust tier cards.
 *
 * @returns A grid of tier cards that expands to show each tier's perks when selected.
 */
export default function TrustTiers() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list">
      {tiers.map((tier) => {
        const isExpanded = expanded === tier.key;
        return (
          <div
            key={tier.key}
            role="listitem"
            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer text-left"
            style={{
              borderColor: isExpanded ? `${tier.color}30` : undefined,
              boxShadow: isExpanded ? `0 0 20px ${tier.color}08` : undefined,
            }}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : tier.key)}
              aria-expanded={isExpanded}
              aria-controls={`tier-perks-${tier.key}`}
              aria-label={`${t(tier.nameEn, tier.nameAr)} tier — ${tier.xp} XP — ${t(tier.descEn, tier.descAr)}`}
              className="w-full text-left"
            >
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center border transition-all duration-300"
                style={{
                  borderColor: `${tier.color}20`,
                  background: `${tier.color}08`,
                  color: tier.color,
                }}
              >
                <span className="font-bold text-lg font-mono">{tier.letter}</span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1">{t(tier.nameEn, tier.nameAr)}</h3>
              <span className="text-[11px] font-mono block mb-2" style={{ color: tier.color }}>
                {tier.xp} XP
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{t(tier.descEn, tier.descAr)}</p>

              <div className="mt-3 flex justify-center">
                <ChevronDown
                  className="w-4 h-4 text-zinc-400 transition-transform duration-300"
                  style={{ transform: isExpanded ? "rotate(180deg)" : undefined }}
                />
              </div>
            </button>

            {isExpanded && (
              <div
                id={`tier-perks-${tier.key}`}
                className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5"
                role="region"
                aria-label={`${t(tier.nameEn, tier.nameAr)} perks`}
              >
                {(language === "en" ? tier.perksEn : tier.perksAr).map((perk) => (
                  <div key={perk} className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tier.color }} />
                    {perk}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
