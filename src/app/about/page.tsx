"use client";

import React from "react";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Globe, Cpu } from "lucide-react";
import RoadmapTimeline from "@/components/ui/RoadmapTimeline";

export default function AboutPage() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <main id="main-content" className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      {/* Header */}
      <Header showBack />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 mt-8 relative z-10 text-center">
        <span className="stitch-badge uppercase tracking-widest">{t("ABOUT PROTOCOL", "عن البروتوكول")}</span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-4">
          {t("Sovereign Human Authorization", "تفويض الهوية البشرية السيادية")}
        </h1>
        <p className="text-sm md:text-base text-faint mt-3 max-w-2xl mx-auto leading-relaxed">
          {t(
            "AxiomID is a cryptographic framework that bridges human intent with autonomous AI actions, building a decentralized layer of trust using W3C DIDs and secure blockchain state assertions.",
            "AxiomID هو إطار عمل تشفيري يربط بين النوايا البشرية وإجراءات الذكاء الاصطناعي المستقلة، مما يبني طبقة لامركزية من الثقة باستخدام معرفات W3C DIDs وتأكيدات حالة البلوكشين الآمنة."
          )}
        </p>
      </div>

      {/* Main Grid: Mission + Timeline */}
      <div className="max-w-4xl mx-auto px-4 mt-12 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Mission details */}
        <div className="md:col-span-5 space-y-6">
          <div className="bento-card p-5 border border-glass bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              {t("Sybil Resistance", "مقاومة سيبيل")}
            </h3>
            <p className="text-xs text-faint leading-relaxed font-mono">
              {t(
                "By using Pi Network KYC bindings and Stellar anchors, AxiomID prevents multi-account sybil attacks in AI interactions while keeping full cryptographic user privacy.",
                "من خلال استخدام ربط KYC من شبكة Pi وanchors Stellar، يمنع AxiomID هجمات سيبيل متعددة الحسابات في تفاعلات الذكاء الاصطناعي مع الحفاظ على خصوصية المستخدم التشفيرية الكاملة."
              )}
            </p>
          </div>

          <div className="bento-card p-5 border border-glass bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-electric-blue" />
              {t("Sovereign DIDs", "المعرفات السيادية")}
            </h3>
            <p className="text-xs text-faint leading-relaxed font-mono">
              {t(
                "Your DID document is yours. AxiomID does not store passwords or credentials; you assert your keys using public-key cryptography on the ledger.",
                "مستند DID الخاص بك ملكك. AxiomID لا يخزن كلمات مرور أو بيانات اعتماد؛ أنت تؤكد مفاتيحك باستخدام تشفير المفتاح العام على السجل."
              )}
            </p>
          </div>

          <div className="bento-card p-5 border border-glass bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              {t("Agent Delegation", "تفويض الوكلاء")}
            </h3>
            <p className="text-xs text-faint leading-relaxed font-mono">
              {t(
                "Authorize AI agents to claim, execute, and sign transactions within sandbox containers securely using micro-authorizations.",
                "تفويض وكلاء الذكاء الاصطناعي للمطالبة والتنفيذ والتوقيع على المعاملات داخل حاويات sandbox بشكل آمن باستخدام التفويضات الدقيقة."
              )}
            </p>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-7">
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-widest mb-4 border-b border-glass pb-2 pl-2">
            {t("Project Roadmap & Phases", "خارطة طريق المشروع والمراحل")}
          </h2>
          <RoadmapTimeline />
        </div>

      </div>
      <Footer />
    </main>
  );
}
