"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Shield, Globe, Cpu } from "lucide-react";
import RoadmapTimeline from "@/components/ui/RoadmapTimeline";

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <main id="main-content" className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 md:p-6 max-w-6xl mx-auto relative z-10 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50 group-hover:bg-neon-green/30 transition-all">
            <span className="text-neon-green font-bold text-sm">A</span>
          </div>
          <span className="font-mono text-lg tracking-tighter text-white">
            AXIOM<span className="text-zinc-500">ID</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/" className="btn-ghost text-xs font-mono px-3 py-1.5 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            {language === "en" ? "BACK" : "عودة"}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 mt-8 relative z-10 text-center">
        <span className="stitch-badge uppercase tracking-widest">ABOUT PROTOCOL</span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-4">
          {language === "en" ? "Sovereign Human Authorization" : "تفويض الهوية البشرية السيادية"}
        </h1>
        <p className="text-sm md:text-base text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
          {language === "en"
            ? "AxiomID is a cryptographic framework that bridges human intent with autonomous AI actions, building a decentralized layer of trust using W3C DIDs and secure blockchain state assertions."
            : "AxiomID هو إطار عمل تشفيري يربط بين النوايا البشرية وإجراءات الذكاء الاصطناعي المستقلة، مما يبني طبقة لامركزية من الثقة باستخدام معرفات W3C DIDs وتأكيدات حالة البلوكشين الآمنة."}
        </p>
      </div>

      {/* Main Grid: Mission + Timeline */}
      <div className="max-w-4xl mx-auto px-4 mt-12 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Mission details */}
        <div className="md:col-span-5 space-y-6">
          <div className="bento-card p-5 border border-white/5 bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Sybil Resistance
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono">
              By using Pi Network KYC bindings and Stellar anchors, AxiomID prevents multi-account sybil attacks in AI interactions while keeping full cryptographic user privacy.
            </p>
          </div>

          <div className="bento-card p-5 border border-white/5 bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-electric-blue" />
              Sovereign DIDs
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono">
              Your DID document is yours. AxiomID does not store passwords or credentials; you assert your keys using public-key cryptography on the ledger.
            </p>
          </div>

          <div className="bento-card p-5 border border-white/5 bg-white/[0.01]">
            <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Agent Delegation
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono">
              Authorize AI agents to claim, execute, and sign transactions within sandbox containers securely using micro-authorizations.
            </p>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="md:col-span-7">
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-2 pl-2">
            Project Roadmap & Phases
          </h2>
          <RoadmapTimeline />
        </div>

      </div>
    </main>
  );
}
