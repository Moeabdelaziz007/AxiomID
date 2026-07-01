"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface TimelineItem {
  phase: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  status: "completed" | "active" | "future";
  itemsEn: string[];
  itemsAr: string[];
}

export default function RoadmapTimeline() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const items: TimelineItem[] = [
    {
      phase: "PHASE 1",
      titleEn: "Core Trust Protocol",
      titleAr: "بروتوكول الثقة الأساسي",
      descEn: "Establish sovereign identities and cryptographically secure credentials.",
      descAr: "تأسيس الهويات السيادية وبيانات الاعتماد الآمنة تشفيرياً.",
      status: "active",
      itemsEn: ["Stellar & Pi Wallet integration", "Sovereign DID method registry", "ZKP human-verifiable proofs"],
      itemsAr: ["تكامل Stellar و Pi Wallet", "سجل طريقة DID السيادية", "إثباتات ZKP قابلة للتحقق بشرياً"],
    },
    {
      phase: "PHASE 2",
      titleEn: "Agent Passport System",
      titleAr: "نظام جواز العميل",
      descEn: "Provision customizable autonomous agent cards that represent human delegators.",
      descAr: "إنشاء بطاقات عملاء مستقلة قابلة للتعديل تمثل المفوّضين البشريين.",
      status: "active",
      itemsEn: ["Passport credential stamps board", "Dynamic identity progression & tiers", "Pi Browser compliance sandbox"],
      itemsAr: ["لوحة طوابع بيانات اعتماد الجواز", "تقدم الهوية الديناميكي والفئات", "بيئة امتثال متصفح Pi"],
    },
    {
      phase: "PHASE 3",
      titleEn: "Marketplace & Tooling",
      titleAr: "السوق والأدوات",
      descEn: "Enable third-party developers to upload, secure, and monetize agent skills.",
      descAr: "تمكين المطورين من تحميل وتأمين وتحصيل أرباح مهارات العملاء.",
      status: "active",
      itemsEn: ["Genomic skills repository", "E2E automated sandbox script validation", "Confined runtime playground"],
      itemsAr: ["مستودع المهارات الجينومية", "تحقق آلي من نصوص السكريبتات", "بيئة تشغيل محصّنة"],
    },
    {
      phase: "PHASE 4",
      titleEn: "Decentralized Governance",
      titleAr: "الحوكمة اللامركزية",
      descEn: "Delegate system adjustments and authority governance to sovereign token holders.",
      descAr: "تفويض تعديلات النظام والحوكمة لحملة الرموز السياديين.",
      status: "future",
      itemsEn: ["Sovereign voting DAO consensus", "Trust circle validation delegation", "Inter-agent payment clearing"],
      itemsAr: ["إجماع التصويت السيادي DAO", "تفويض التحقق من دائرة الثقة", "تسوية المدفوعات بين العملاء"],
    },
  ];

  return (
    <div className="relative border-l border-white/5 ml-4 pl-6 space-y-8 my-10">
      {items.map((item, index) => {
        const isCompleted = item.status === "completed";
        const isActive = item.status === "active";
        
        return (
          <div key={index} className="relative group">
            {/* Timeline bullet indicator */}
            <div className="absolute -left-[35px] top-1 z-10 flex items-center justify-center bg-[#10131a]">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 filter drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" />
              ) : isActive ? (
                <div className="w-5 h-5 rounded-full border-2 border-electric-blue flex items-center justify-center animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-electric-blue" />
                </div>
              ) : (
                <Circle className="w-5 h-5 text-zinc-600" />
              )}
            </div>

            {/* Content card */}
            <div 
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                isCompleted 
                  ? "border-emerald-500/10 bg-emerald-500/[0.01] hover:border-emerald-500/20" 
                  : isActive 
                    ? "border-electric-blue/20 bg-electric-blue/[0.02] shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:border-electric-blue/30"
                    : "border-white/5 bg-white/[0.005] hover:border-white/10"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span 
                  className={`text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded ${
                    isCompleted 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : isActive 
                        ? "bg-electric-blue/15 text-electric-blue"
                        : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {item.phase}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {isCompleted ? t("Completed", "مكتمل") : isActive ? t("Active Development", "تطوير نشط") : t("Future Goal", "هدف مستقبلي")}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono mt-3">{t(item.titleEn, item.titleAr)}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t(item.descEn, item.descAr)}</p>

              {/* Sub items checklist */}
              <ul className="mt-4 space-y-2 border-t border-white/5 pt-4 text-[11px] font-mono text-zinc-500">
                {(language === "en" ? item.itemsEn : item.itemsAr).map((sub, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={isCompleted ? "text-emerald-400" : isActive ? "text-electric-blue" : "text-zinc-600"}>
                      {isCompleted ? "✓" : "•"}
                    </span>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
