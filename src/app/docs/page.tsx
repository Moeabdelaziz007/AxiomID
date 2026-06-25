"use client";

import React, { useState, useMemo } from "react";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen, Key, Cpu, HelpCircle, Search } from "lucide-react";
import CodeBlock from "@/components/ui/CodeBlock";

type SectionId = "intro" | "sdk" | "api" | "stamps";

const SECTIONS: { id: SectionId; en: string; ar: string; icon: React.ReactNode; keywords: string[] }[] = [
  { id: "intro", en: "1. Introduction", ar: "١. مقدمة", icon: <BookOpen className="w-4 h-4" />, keywords: ["introduction", "did", "axiom", "protocol", "identity", "decentralized", "mقدمة", "بروتوكول"] },
  { id: "stamps", en: "2. Identity Stamps", ar: "٢. طوابع الهوية", icon: <Key className="w-4 h-4" />, keywords: ["stamps", "trust", "kyc", "wallet", "social", "agent", "transaction", "xp", "طوابع", "ثقة", "تحقق"] },
  { id: "sdk", en: "3. SDK & Integration", ar: "٣. مكتبة المطورين", icon: <Cpu className="w-4 h-4" />, keywords: ["sdk", "npm", "install", "integration", "code", "typescript", "مكتبة", "دمج"] },
  { id: "api", en: "4. API Reference", ar: "٤. مرجع API", icon: <HelpCircle className="w-4 h-4" />, keywords: ["api", "endpoint", "get", "post", "rest", "http", "reference", "مرجع", "واجهة"] },
];

export default function DocsPage() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionId>("intro");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter((s) => s.keywords.some((k) => k.includes(q)) || s.en.toLowerCase().includes(q) || s.ar.includes(searchQuery));
  }, [searchQuery]);

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

  const sdkInstallCode = `npm install @axiomid/sdk`;

  const sdkExample = `import { AxiomSDK } from "@axiomid/sdk";

const axiom = new AxiomSDK({
  network: "mainnet",
  apiKey: process.env.AXIOM_API_KEY,
});

// Verify a user's passport
const passport = await axiom.verifyPassport("pioneer.username");
console.log("Trust Score:", passport.trustScore);
console.log("Tier:", passport.tier);
console.log("Agent Status:", passport.agent?.status);

// Check specific stamps
const stamps = await axiom.getStamps("pioneer.username");
console.log("KYC Verified:", stamps.kycBound.verified);
console.log("Wallet Age:", stamps.walletAge.days, "days");

// Resolve DID document
const did = await axiom.resolveDID("did:axiom:pioneer.username");
console.log("Public Key:", did.verificationMethod[0].publicKeyMultibase);`;

  const apiResponseExample = `{
  "success": true,
  "data": {
    "did": "did:axiom:pioneer.username",
    "walletAddress": "GD5T...",
    "tier": "Sovereign",
    "trustScore": 98,
    "xp": 1250,
    "stamps": [
      { "type": "KYC_BOUND", "verified": true },
      { "type": "WALLET_AGE", "days": 365 }
    ],
    "agent": {
      "name": "MyAgent",
      "status": "ACTIVE"
    }
  }
}`;

  const API_ROUTES = [
    { method: "GET", path: "/api/passport/:slug", desc: "Retrieve public passport profile, DID, stamps, and trust score.", auth: "No" },
    { method: "GET", path: "/api/did-document?did=:did", desc: "Resolve a did:axiom identifier to its W3C DID document.", auth: "No" },
    { method: "GET", path: "/api/status", desc: "Real-time protocol metrics: users, agents, XP, payments.", auth: "No" },
    { method: "GET", path: "/api/health", desc: "Service health checks: DB, Stellar, Pi Network, Workers AI.", auth: "No" },
    { method: "GET", path: "/api/explorer", desc: "Live explorer data: stats, recent payments, tier distribution.", auth: "No" },
    { method: "GET", path: "/api/leaderboard", desc: "Top 50 users ranked by XP with trust scores.", auth: "No" },
    { method: "GET", path: "/api/credential-status?did=", desc: "Check credential revocation status for a DID.", auth: "No" },
    { method: "POST", path: "/api/agent/identity", desc: "Generate or resolve agent DID identity.", auth: "Yes" },
    { method: "POST", path: "/api/agent/sign", desc: "Sign a payload with agent's sovereign keypair.", auth: "Yes" },
    { method: "POST", path: "/api/skills", desc: "Publish a new skill to the marketplace.", auth: "Yes" },
    { method: "GET", path: "/api/skills", desc: "Search marketplace skills with filters.", auth: "No" },
    { method: "POST", path: "/api/oauth2/token", desc: "OAuth2 device flow token exchange.", auth: "No" },
    { method: "POST", path: "/api/oauth2/revoke", desc: "Revoke an active OAuth2 token.", auth: "Yes" },
  ];

  return (
    <main className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      <Header showBack />

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-4 mt-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="md:col-span-3 space-y-2">
          <div className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {t("docs_sidebar_label")}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("docs_search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-electric-blue/30 transition-colors"
            />
          </div>

          {filteredSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => { setActiveSection(sec.id); setSearchQuery(""); }}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-mono transition-all ${
                activeSection === sec.id
                  ? "bg-electric-blue/15 text-electric-blue border border-electric-blue/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {sec.icon}
              <span>{sec.id === "intro" ? t("docs_intro_title") : sec.id === "stamps" ? t("docs_stamps_title") : sec.id === "sdk" ? t("docs_sdk_title") : t("docs_api_title")}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-9 bento-card p-6 md:p-8 min-h-[500px]">
          {activeSection === "intro" && (
            <div className="space-y-6">
              <span className="stitch-badge">{t("docs_badge_core")}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">{t("docs_intro_title")}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("docs_intro_desc")}
              </p>
              
              <h3 className="text-sm font-bold font-mono text-white pt-2 border-b border-white/5 pb-2">
                {t("docs_did_title")}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("docs_did_desc")}
              </p>
              <CodeBlock code={didExample} language="json" />
            </div>
          )}

          {activeSection === "stamps" && (
            <div className="space-y-6">
              <span className="stitch-badge">{t("docs_badge_trust")}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {t("docs_stamps_title")}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("docs_stamps_desc")}
              </p>
              
              <div className="space-y-3 pt-2">
                {[
                  { name: t("docs_stamp_kyc_name"), xp: t("docs_stamp_kyc_xp"), desc: t("docs_stamp_kyc_desc"), color: "text-axiom-purple" },
                  { name: t("docs_stamp_wallet_name"), xp: t("docs_stamp_wallet_xp"), desc: t("docs_stamp_wallet_desc"), color: "text-electric-blue" },
                  { name: t("docs_stamp_social_name"), xp: t("docs_stamp_social_xp"), desc: t("docs_stamp_social_desc"), color: "text-neon-green" },
                  { name: t("docs_stamp_tx_name"), xp: t("docs_stamp_tx_xp"), desc: t("docs_stamp_tx_desc"), color: "text-amber-400" },
                  { name: t("docs_stamp_agent_name"), xp: t("docs_stamp_agent_xp"), desc: t("docs_stamp_agent_desc"), color: "text-emerald-400" },
                  { name: t("docs_stamp_pow_name"), xp: t("docs_stamp_pow_xp"), desc: t("docs_stamp_pow_desc"), color: "text-zinc-400" },
                ].map((stamp, i) => (
                  <div key={i} className="flex justify-between items-start p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold font-mono ${stamp.color}`}>{stamp.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{stamp.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded font-bold ml-3 flex-shrink-0">
                      {stamp.xp}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl border border-electric-blue/20 bg-electric-blue/5">
                <h4 className="text-xs font-bold font-mono text-electric-blue mb-2">
                  {t("docs_trust_formula_title")}
                </h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Trust = (XP Score × 0.7) + (Stamp Score × 0.3)  →  0–100%
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {t("docs_trust_formula_desc")}
                </p>
              </div>
            </div>
          )}

          {activeSection === "sdk" && (
            <div className="space-y-6">
              <span className="stitch-badge">{t("docs_badge_sdk")}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {t("docs_sdk_title")}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("docs_sdk_desc")}
              </p>

              <h3 className="text-sm font-bold font-mono text-white pt-2 border-b border-white/5 pb-2">
                {t("docs_sdk_packages_title")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: t("docs_sdk_query_name"), desc: t("docs_sdk_query_desc"), install: "npm install @axiomid/sdk" },
                  { name: t("docs_sdk_crypto_name"), desc: t("docs_sdk_crypto_desc"), install: "npm install @axiomid/crypto" },
                ].map((pkg, i) => (
                  <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                    <h4 className="text-xs font-bold font-mono text-electric-blue">{pkg.name}</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">{pkg.desc}</p>
                    <code className="block mt-2 text-[10px] font-mono text-neon-green bg-black/40 px-2 py-1 rounded">{pkg.install}</code>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold font-mono text-white pt-2 border-b border-white/5 pb-2">
                {t("docs_sdk_config_title")}
              </h3>
              <CodeBlock code={sdkInstallCode} language="bash" />
              <CodeBlock code={sdkExample} language="typescript" />

              <h3 className="text-sm font-bold font-mono text-white pt-4 border-b border-white/5 pb-2">
                {t("docs_sdk_api_title")}
              </h3>
              <div className="space-y-2">
                {[
                  { method: "verifyPassport(slug)", returns: "Promise<Passport>", desc: t("docs_sdk_api_verify") },
                  { method: "getStamps(slug)", returns: "Promise<Stamps>", desc: t("docs_sdk_api_stamps") },
                  { method: "resolveDID(did)", returns: "Promise<DIDDocument>", desc: t("docs_sdk_api_did") },
                  { method: "getTrustScore(did)", returns: "Promise<TrustScore>", desc: t("docs_sdk_api_trust") },
                  { method: "searchSkills(query)", returns: "Promise<Skill[]>", desc: t("docs_sdk_api_skills") },
                ].map((fn, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.01] transition-colors">
                    <code className="text-[11px] font-mono text-neon-green whitespace-nowrap">{fn.method}</code>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-axiom-purple">{fn.returns}</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{fn.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold font-mono text-white pt-4 border-b border-white/5 pb-2">
                {t("docs_sdk_derive_title")}
              </h3>
              <p className="text-xs text-zinc-500 mb-3">
                {t("docs_sdk_derive_desc")}
              </p>
              <CodeBlock code={`import { deriveKeypair, signPayload, verifySignature, deriveUserRootKey } from "@axiomid/crypto";

// Derive a sovereign agent keypair
const keypair = deriveKeypair(stellarAddress, agentId, process.env.SOVEREIGN_KEY_SALT);

// Sign a payload
const signature = signPayload(JSON.stringify(payload), keypair.privateKey);

// Verify a signature
const valid = verifySignature(payload, signature, keypair.publicKey);

// Convenience: derive user root key
const rootKey = deriveUserRootKey(piUid, process.env.SOVEREIGN_KEY_SALT);`} language="typescript" />

              <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <h4 className="text-xs font-bold font-mono text-amber-400 mb-1">
                  {t("docs_sdk_security_title")}
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {t("docs_sdk_security_desc")}
                </p>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div className="space-y-6">
              <span className="stitch-badge">{t("docs_badge_api")}</span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {t("docs_api_title")}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("docs_api_desc")}
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-zinc-500">
                      <th className="py-2 pr-3 w-16">METHOD</th>
                      <th className="py-2 pr-3">ENDPOINT</th>
                      <th className="py-2 pr-3">DESCRIPTION</th>
                      <th className="py-2 w-16">AUTH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {API_ROUTES.map((route, i) => (
                      <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            route.method === "GET" ? "bg-electric-blue/20 text-electric-blue" : "bg-neon-green/20 text-neon-green"
                          }`}>
                            {route.method}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-white font-semibold">{route.path}</td>
                        <td className="py-2.5 pr-3 text-zinc-500">{route.desc}</td>
                        <td className="py-2.5">
                          <span className={`text-[9px] font-bold ${route.auth === "Yes" ? "text-amber-400" : "text-zinc-600"}`}>
                            {route.auth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-sm font-bold font-mono text-white pt-4 border-b border-white/5 pb-2">
                {t("docs_api_response_title")}
              </h3>
              <CodeBlock code={apiResponseExample} language="json" />

              <h3 className="text-sm font-bold font-mono text-white pt-4 border-b border-white/5 pb-2">
                {t("docs_api_openapi_title")}
              </h3>
              <p className="text-xs text-zinc-500 mb-2">
                {t("docs_api_openapi_desc")}
              </p>
              <div className="bg-black/80 border border-white/5 rounded-xl p-3 font-mono text-[11px]">
                <span className="text-neon-green">GET</span>{" "}
                <span className="text-white">https://axiomid.app/openapi.json</span>
              </div>
            </div>
          )}
        </div>

      </div>
      <Footer />
    </main>
  );
}
