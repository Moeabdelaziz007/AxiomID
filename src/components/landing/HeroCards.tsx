"use client";

import { useLanguage } from "@/app/context/language-context";
import { Shield, Fingerprint, Cpu, UserCheck, Wallet, Globe } from "lucide-react";

/**
 * Renders side-by-side static cards representing Human and Agent identities.
 * Features bilingual support and rich, premium developer aesthetics.
 */
export default function HeroCards() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
      {/* Decorative center divider glow */}
      <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[70%] bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Card 1: Human Identity */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#10131a]/85 backdrop-blur-md p-6 space-y-4 hover:border-emerald-500/30 transition-all duration-300 group shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                {t("Human Passport", "جواز سفر بشري")}
              </h3>
              <p className="text-[10px] font-mono text-faint">did:axiom:usr_88f2x</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t("KYA ✓", "توثيق ✓")}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {/* Attributes */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div>
              <span className="text-faint block text-[9px] uppercase tracking-wider">{t("Trust Score", "مستوى الثقة")}</span>
              <span className="text-emerald-400 font-bold text-xs">98<span className="text-faint text-[10px] font-normal">/100</span></span>
            </div>
            <div>
              <span className="text-faint block text-[9px] uppercase tracking-wider">{t("XP", "الخبرة")}</span>
              <span className="text-emerald-400 font-bold text-xs">2,450</span>
            </div>
          </div>

          {/* Key details */}
          <ul className="space-y-2 text-[11px] font-mono text-faint">
            <li className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("Verified Human Operator", "مشغل بشري تم التحقق منه")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("Sovereign Identity Key", "مفتاح الهوية السيادية")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t("Federated Reputation", "سمعة شبكية موحدة")}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Card 2: Agent Identity */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#10131a]/85 backdrop-blur-md p-6 space-y-4 hover:border-axiom-purple/30 transition-all duration-300 group shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-axiom-purple/10 border border-axiom-purple/20 flex items-center justify-center text-axiom-purple group-hover:scale-105 transition-transform duration-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                {t("Agent Passport", "جواز سفر الوكيل")}
              </h3>
              <p className="text-[10px] font-mono text-faint">did:axiom:agt_33d7p</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold bg-axiom-purple/10 text-axiom-purple border border-axiom-purple/20">
            {t("ACTIVE ✓", "نشط ✓")}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {/* Attributes */}
          <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div>
              <span className="text-faint block text-[9px] uppercase tracking-wider">{t("Autonomy", "مستوى الاستقلالية")}</span>
              <span className="text-axiom-purple font-bold text-xs">92<span className="text-faint text-[10px] font-normal">/100</span></span>
            </div>
            <div>
              <span className="text-faint block text-[9px] uppercase tracking-wider">{t("UPTIME", "وقت التشغيل")}</span>
              <span className="text-emerald-400 font-bold text-xs">99.98%</span>
            </div>
          </div>

          {/* Key details */}
          <ul className="space-y-2 text-[11px] font-mono text-faint">
            <li className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-axiom-purple" />
              <span>{t("Autonomous Pi Wallet", "محفظة Pi ذاتية التحكم")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-axiom-purple" />
              <span>{t("Cryptographic Attestation", "إثبات وتوثيق تشفيري")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-axiom-purple" />
              <span>{t("Zero-Permission Execution", "تنفيذ بدون صلاحيات مسبقة")}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
