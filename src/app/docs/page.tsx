"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, BookOpen, Key, Cpu, HelpCircle } from "lucide-react";
import CodeBlock from "@/components/ui/CodeBlock";

type SectionId = "intro" | "sdk" | "api" | "stamps";

export default function DocsPage() {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionId>("intro");

  const didExample = `{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:axiom:pioneer.username",
  "verificationMethod": [{
    "id": "did:axiom:pioneer.username#keys-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:axiom:pioneer.username",
    "publicKeyMultibase": "z6Mkmuy..."
  }],
  "authentication": [
    "did:axiom:pioneer.username#keys-1"
  ]
}`;

  const sdkExample = `import { AxiomSDK } from "@axiomid/sdk";

// Initialize
const axiom = new AxiomSDK({ network: "mainnet" });

// Authenticate and verify user DID passport
const passport = await axiom.verifyPassport("pioneer.username");
console.log("Trust Score:", passport.trustScore);
console.log("Active Agent status:", passport.agent.status);`;

  const apiResponseExample = `{
  "success": true,
  "data": {
    "did": "did:axiom:pioneer.username",
    "walletAddress": "GD5T...",
    "tier": "Sovereign",
    "trustScore": 98,
    "xp": 1250
  }
}`;

  return (
    <main className="min-h-screen bg-grid relative pb-20">
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

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-4 mt-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="md:col-span-3 space-y-2">
          <div className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {language === "en" ? "Documentation" : "الوثائق التقنية"}
          </div>
          {[
            { id: "intro" as SectionId, label: language === "en" ? "1. Introduction" : "١. مقدمة عن البروتوكول", icon: <BookOpen className="w-4 h-4" /> },
            { id: "stamps" as SectionId, label: language === "en" ? "2. Identity Stamps" : "٢. طوابع الهوية", icon: <Key className="w-4 h-4" /> },
            { id: "sdk" as SectionId, label: language === "en" ? "3. SDK & Integration" : "٣. مكتبة المطورين والدمج", icon: <Cpu className="w-4 h-4" /> },
            { id: "api" as SectionId, label: language === "en" ? "4. API Reference" : "٤. مرجع واجهة البرمجة", icon: <HelpCircle className="w-4 h-4" /> },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-mono transition-all ${
                activeSection === sec.id
                  ? "bg-electric-blue/15 text-electric-blue border border-electric-blue/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9 bento-card p-6 md:p-8 min-h-[500px]">
          {activeSection === "intro" && (
            <div className="space-y-6">
              <span className="stitch-badge">Core Protocol</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">Introduction to AxiomID</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                AxiomID is a decentralized identity and human-authorization layer engineered to manage sybil-resistant agentic loops. By using W3C compliant Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs), AxiomID allows humans to safely delegate transactional, computational, or social tasks to autonomous AI agents.
              </p>
              
              <h3 className="text-sm font-bold font-mono text-white pt-2 border-b border-white/5 pb-2">The did:axiom DID Method</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Each verified Pioneer generates a unique sovereign DID formatted as <code className="text-neon-green font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs">did:axiom:piUsername</code>. This document is cryptographically resolved by our oracle network, binding public keys directly to ledger accounts.
              </p>
              <CodeBlock code={didExample} language="json" />
            </div>
          )}

          {activeSection === "stamps" && (
            <div className="space-y-6">
              <span className="stitch-badge">Trust Engine</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">Verifiable Stamps & Trust Scores</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Trust is verified via cryptographically signed stamps. Earning stamps increments the user's overall **Trust Score** and awards **XP (Experience Points)**, elevating their Identity Tier.
              </p>
              
              <div className="space-y-3 pt-2">
                {[
                  { name: "Wallet Age Stamp", xp: "100 XP", desc: "Verifies the antiquity and active transactions of the connected Stellar/Pi address." },
                  { name: "KYC Bound Stamp", xp: "250 XP", desc: "Anchors proof of Pi Network KYC verification without disclosing real names or data." },
                  { name: "Social Identity Stamp", xp: "100 XP each", desc: "Validates ownership of Twitter, Discord, and Google accounts via protocol signatures." },
                  { name: "Daily PoW Proof Stamp", xp: "10 XP daily", desc: "Establishes daily active human participation through lightweight cryptographic proof-of-work tasks." }
                ].map((stamp, i) => (
                  <div key={i} className="flex justify-between items-start p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">{stamp.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-1">{stamp.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded font-bold">
                      {stamp.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "sdk" && (
            <div className="space-y-6">
              <span className="stitch-badge">Client Integration</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">SDK & App Integration</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                App developers can query AxiomID directly to guard endpoints, restrict API rates, or authorize transaction delegations for AI agents.
              </p>
              
              <h3 className="text-sm font-bold font-mono text-white pt-2 border-b border-white/5 pb-2">Example SDK Usage</h3>
              <CodeBlock code={sdkExample} language="typescript" />
            </div>
          )}

          {activeSection === "api" && (
            <div className="space-y-6">
              <span className="stitch-badge">HTTP Reference</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">API References</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                AxiomID exposes public read-only endpoints to inspect active identities, retrieve DID documents, and fetch sandbox logs.
              </p>
              
              <div className="space-y-4 pt-2">
                {[
                  { method: "GET", path: "/api/passport/:slug", desc: "Retrieve public profile credentials and stamps configuration." },
                  { method: "GET", path: "/api/did-document?did=:did", desc: "Resolve a sovereign did:axiom identifier to its W3C JSON DID document." },
                  { method: "GET", path: "/api/status", desc: "Retrieve real-time protocol transaction metrics and average trust score." },
                ].map((route, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2 py-0.5 bg-electric-blue/20 text-electric-blue border border-electric-blue/30 rounded font-bold">{route.method}</span>
                      <span className="text-white font-semibold">{route.path}</span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono pl-2 border-l border-zinc-700">{route.desc}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold font-mono text-white pt-4 border-b border-white/5 pb-2">Response Envelope</h3>
              <CodeBlock code={apiResponseExample} language="json" />
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
