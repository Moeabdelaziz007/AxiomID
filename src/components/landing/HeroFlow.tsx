"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/context/language-context";
import { Fingerprint, Cpu, ArrowRight, ExternalLink } from "lucide-react";
interface HeroFlowProps {
  t: (key: string) => string;
}

const steps = [
  {
    id: "human",
    icon: Fingerprint,
    didPrefix: "usr_",
    title: { en: "Human Identity", ar: "هوية بشرية" },
    subtitle: { en: "Verify your humanity", ar: "تحقق من إنسانيتك" },
    desc: { en: "Connect wallet → Complete KYA → Earn trust", ar: "اربط المحفظة → أكمل KYA → اكسب الثقة" },
    badge: { en: "KYA Verified", ar: "KYA موثق" },
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    accentColor: "emerald",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    borderColor: "border-emerald-500/30",
    accent: "text-emerald-400",
    stats: [
      { label: { en: "Trust Score", ar: "مستوى الثقة" }, value: "98/100" },
      { label: { en: "XP", ar: "الخبرة" }, value: "2,450" },
    ],
    features: [
      { en: "Verified Human Operator", ar: "مشغل بشري تم التحقق منه" },
      { en: "Sovereign Identity Key", ar: "مفتاح الهوية السيادية" },
      { en: "Federated Reputation", ar: "سمعة شبكية موحدة" },
    ],
  },
  {
    id: "agent",
    icon: Cpu,
    didPrefix: "agt_",
    title: { en: "Agent Deployment", ar: "نشر العميل" },
    subtitle: { en: "Deploy your AI agent", ar: "انشر عميلك الذكي" },
    desc: { en: "Create agent → Configure → Go live", ar: "أنشئ العميل → اضبط الإعدادات → انطلق" },
    badge: { en: "ACTIVE", ar: "نشط" },
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    accentColor: "purple",
    gradient: "from-purple-500/10 to-purple-500/5",
    borderColor: "border-purple-500/30",
    accent: "text-purple-400",
    stats: [
      { label: { en: "Autonomy", ar: "مستوى الاستقلالية" }, value: "92/100" },
      { label: { en: "Uptime", ar: "وقت التشغيل" }, value: "99.98%" },
    ],
    features: [
      { en: "Autonomous Pi Wallet", ar: "محفظة Pi ذاتية التحكم" },
      { en: "Cryptographic Attestation", ar: "إثبات وتوثيق تشفيري" },
      { en: "Zero-Permission Execution", ar: "تنفيذ بدون صلاحيات مسبقة" },
    ],
  },
];

export default function HeroFlow({ t }: HeroFlowProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const { language } = useLanguage();
  const [didSuffix] = useState(() => Math.random().toString(36).slice(2, 8));

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoAdvance]);

  // Helper to get localized text from step objects
  const lt = (obj: { en: string; ar: string }) => (language === "ar" ? obj.ar : obj.en);

  return (
    <div className="w-full relative z-10">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => { setActiveStep(index); setAutoAdvance(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono transition-all duration-300 ${
              index === activeStep
                ? "bg-white/5 border border-white/10 text-white"
                : "bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-white"
            }`}
            aria-current={index === activeStep ? "step" : undefined}
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold">
              {index + 1}
            </span>
            <span className="hidden sm:block uppercase tracking-wider">
              {index === 0 ? t("verify_human") : t("deploy_agent")}
            </span>
          </button>
        ))}
        <button
          onClick={() => setAutoAdvance(!autoAdvance)}
          className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-white transition-colors"
          aria-label={autoAdvance ? t("pause_auto_play") : t("resume_auto_play")}
        >
          {autoAdvance ? "⏸" : "▶"}
        </button>
      </div>

      {/* Flow visualization */}
      <div className="relative">
        {/* Animated connector line */}
        <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`relative group p-6 rounded-2xl transition-all duration-500 ${
                index === activeStep
                  ? "bg-white/[0.04] border-white/[0.12] shadow-xl"
                  : "bg-white/[0.02] border-white/[0.04]"
              } ${step.borderColor} backdrop-blur-sm`}
              style={{
                background: step.gradient,
              }}
            >
              {/* Step indicator badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${step.badgeColor} flex items-center justify-center ${step.accent} group-hover:scale-105 transition-transform duration-300`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white tracking-wide">
                      {t(lt(step.title))}
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500">did:axiom:{step.didPrefix}{didSuffix}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider font-semibold ${step.badgeColor}`}>
                  {lt(step.badge)}
                </span>
              </div>

              <div className="space-y-4">
                {/* Subtitle & Description */}
                <div className="space-y-2">
                  <p className="text-xs font-mono text-subtle uppercase tracking-wider">{lt(step.subtitle)}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{lt(step.desc)}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  {step.stats.map((stat, i) => (
                    <div key={i}>
                      <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">{lt(stat.label)}</span>
                      <span className={`${step.accent} font-bold text-xs`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-2 text-[11px] font-mono text-zinc-400">
                  {step.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-200">
                      <span className="w-3.5 h-3.5 ${step.accent}">{index === 0 ? "✓" : "→"}</span>
                      <span>{lt(feature)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="pt-4 border-t border-white/5">
                  <a
                    href={index === 0 ? "/claim" : "/dashboard/marketplace"}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-mono text-sm tracking-wider uppercase transition-all duration-300 ${
                      index === 0
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                        : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    }`}
                  >
                    <span>{t(index === 0 ? "start_verification" : "deploy_agent")}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center arrow connector (mobile) */}
        <div className="sm:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12">
          <ArrowRight className="w-8 h-8 text-white/30 animate-bounce" />
        </div>
      </div>
    </div>
  );
}