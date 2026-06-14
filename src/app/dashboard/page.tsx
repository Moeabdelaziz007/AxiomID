"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "../context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createUserDid } from "@/lib/did";
import skillsData from "@/data/skills.json";
import { StampBoard } from "@/components/StampBoard";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";

type TabId = "passport" | "actions" | "terminal" | "marketplace" | "agent";

const DEMO_PROFILE = {
  name: "Demo Agent",
  tier: "Sovereign" as const,
  xp: 2450,
  status: "ACTIVE" as const,
};

const INITIAL_LOGS = [
  "SYSTEM: initializing did:axiom resolver...",
  "RESOLVER: resolved did:axiom:user-********",
  "SECURITY: gRPC auth interceptor active",
  "SYSTEM: Agentic OS online. Ready for task routing.",
];



/**
 * Renders the Agent Identity Layer dashboard page and manages its UI state and behavior.
 *
 * The component controls wallet interactions (connect, disconnect, wallet logs, demo mode),
 * onboarding flow, tab navigation (passport, actions, agent, terminal), agent lifecycle
 * actions (create, activate, pause), KYA verification, and the terminal overlay.
 *
 * @returns The React element representing the dashboard page.
 */
export default function Dashboard() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const {
    user,
    isLoading,
    connectWallet,
    isConnecting,
    levelProgress,
    walletLogs,
    clearWalletLogs,
    runWalletTest,
    disconnectWallet,
    claimAction,
    createAgent,
    activateAgent,
    pauseAgent,
    claimKya,
    isPiBrowser,
    isDemoWallet,
    isDemoWalletEnabled,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TabId>("passport");
  const [showTerminal, setShowTerminal] = useState(false);
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);

  const [agentName, setAgentName] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [kycUsername, setKycUsername] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const onboardingStep = !user ? 1 : !user.agent ? 2 : 3;

  useEffect(() => {
    const onboardingCompleted = localStorage.getItem("axiom_onboarding_completed");
    if (onboardingCompleted !== "true") {
      queueMicrotask(() => setShowOnboarding(true));
    }
  }, []);

  useEffect(() => {
    if (user?.piUsername) {
      queueMicrotask(() => setKycUsername(user.piUsername || ""));
    }
  }, [user?.piUsername]);

  const handleVerifyIdentity = async () => {
    if (!kycUsername.trim()) return;
    setKycLoading(true);
    await claimKya(kycUsername.trim());
    setKycLoading(false);
  };

  const isDemo = !user && !isLoading;
  const shouldShowPiBrowserPrompt = !isPiBrowser && !isDemoWalletEnabled;

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, walletLogs, showTerminal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs((prev) => [...prev, "SYSTEM: Wallet connection check completed."]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabClick = (tabId: TabId) => {
    if (tabId === "marketplace") return;

    if (tabId === "terminal") {
      setShowTerminal((prev) => !prev);
      setActiveTab((prev) => (prev === "terminal" ? "passport" : "terminal"));
      return;
    }

    setShowTerminal(false);
    setActiveTab(tabId);
  };



  const handleCreateAgent = async () => {
    setAgentLoading(true);
    await createAgent(agentName || undefined);
    setAgentLoading(false);
    setAgentName("");
  };

  const handleActivateAgent = async () => {
    setAgentLoading(true);
    await activateAgent();
    setAgentLoading(false);
  };

  const handlePauseAgent = async () => {
    setAgentLoading(true);
    await pauseAgent();
    setAgentLoading(false);
  };

  const agent = user?.agent;
  const hasAgent = !!agent;
  const agentStatus = agent?.status ?? "NONE";
  return (
    <main id="main-content" className="min-h-screen bg-grid">
      <div className="scanline" />
      <ErrorBanner />

      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'color-mix(in srgb, var(--bg-card) 90%, transparent)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-neon-green font-mono">AXIOM</span>
              <span className="text-xl font-bold text-white font-mono">ID</span>
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t("dashboard_title")}</h1>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Agent Identity Layer v1.0.0</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <LanguageToggle />
              <button
                onClick={() => {
                  localStorage.removeItem("axiom_onboarding_completed");
                  setShowOnboarding(true);
                }}
                className="btn-ghost text-xs px-2 sm:px-3 py-1.5 flex items-center gap-1.5"
                title={t("replay_onboarding")}
              >
                <svg className="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="hidden sm:inline">{t("replay_onboarding")}</span>
              </button>
              {user && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href={{ pathname: "/dashboard/settings" }}
                    prefetch={false}
                    className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden sm:inline">{t("nav_settings")}</span>
                  </Link>
                  <button
                    onClick={() => {
                      router.push("/");
                      setTimeout(() => {
                        disconnectWallet();
                      }, 100);
                    }}
                    className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">{t("logout")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {isLoading ? (
          <div className="space-y-6">
            <div className="bento-card p-8">
              <div className="h-8 bg-white/5 rounded animate-pulse mb-4" />
              <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bento-card p-6">
                  <div className="h-6 bg-white/5 rounded animate-pulse mb-2" />
                  <div className="h-8 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : isDemo ? (
          /* ── DEMO VIEW ── */
          <div className="space-y-6">
            <div className="bento-card p-6 border border-electric-blue/20 bg-electric-blue/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-electric-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Demo Mode</h3>
                    <p className="text-xs text-gray-400">Connect your wallet to claim actions and manage your agent.</p>
                  </div>
                </div>
                {shouldShowPiBrowserPrompt ? (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-center text-amber-200 text-xs">
                    افتح التطبيق من Pi Browser (Demo Disabled)
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                  </button>
                )}
              </div>
            </div>

            <div className="bento-card p-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
                  DEMO
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{DEMO_PROFILE.name}</h2>
              <p className="text-gray-400">Demo agent identity — {DEMO_PROFILE.tier} tier &bull; {DEMO_PROFILE.xp.toLocaleString()} XP</p>
              <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-green to-electric-blue"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bento-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Agent Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Level</span>
                    <span className="text-neon-green font-mono">{DEMO_PROFILE.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">XP</span>
                    <span className="text-electric-blue font-mono">{DEMO_PROFILE.xp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Agent</span>
                    <span className="text-axiom-purple font-mono">{DEMO_PROFILE.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="text-neon-green font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                      {DEMO_PROFILE.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bento-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skillsData.skills.slice(0, 4).map((skill: { name: string }) => (
                    <span key={skill.name} className="px-3 py-1 rounded-full bg-axiom-purple/20 text-axiom-purple text-xs font-mono">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bento-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/passport/demo" className="flex items-center gap-2 text-sm text-gray-400 hover:text-neon-green transition-colors">
                    <span className="text-base">🆔</span>
                    View Demo Passport
                  </Link>
                  <Link href="/passport/demo" className="flex items-center gap-2 text-sm text-gray-400 hover:text-electric-blue transition-colors">
                    <span className="text-base">📋</span>
                    DID Document
                  </Link>
                </div>
              </div>
            </div>

            <div className="md:col-span-3">
              <StampBoard user={null} claimAction={claimAction} connectWallet={connectWallet} />
            </div>
          </div>
        ) : user ? (
          /* ── AUTHENTICATED VIEW ── */
          <>
            {/* Welcome banner — always visible */}
            <div className="bento-card p-8 mb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user.piUsername}</h2>
                  <p className="text-gray-400">Your agent identity is ready. Level {user.tier} &bull; {user.xp.toLocaleString()} XP</p>
                </div>
                {isDemoWallet && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-center">
                    <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-red-400">
                      Demo Account
                    </p>
                    <p className="mt-0.5 text-[11px] text-red-200/80">
                      Not valid for production use
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-green to-electric-blue transition-all duration-500"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>

            {/* ── PASSPORT TAB ── */}
            {activeTab === "passport" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bento-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Agent Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Level</span>
                        <span className="text-neon-green font-mono">{user.tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">XP</span>
                        <span className="text-electric-blue font-mono">{user.xp.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Agent</span>
                        <span className="text-axiom-purple font-mono">{agent?.name ?? "None"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className={`font-mono flex items-center gap-1 ${agentStatus === "ACTIVE" ? "text-neon-green" : agentStatus === "PAUSED" ? "text-yellow-400" : "text-gray-500"}`}>
                          {agentStatus === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
                          {agentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bento-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillsData.skills.slice(0, 3).map((skill: { name: string }) => (
                        <span key={skill.name} className="px-3 py-1 rounded-full bg-axiom-purple/20 text-axiom-purple text-xs font-mono">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bento-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                    <div className="space-y-2">
                      <Link
                        href={`/passport/${user.piUsername || user.walletAddress}`}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-neon-green transition-colors"
                      >
                        <span className="text-base">🆔</span>
                        View Passport
                      </Link>
                      <Link
                        href={`/passport/${user.piUsername || user.walletAddress}`}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-electric-blue transition-colors"
                      >
                        <span className="text-base">📋</span>
                        DID Document
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Identity Verification (KYA) Card */}
                <div className="bento-card p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Identity Verification (KYA)</h3>
                      <p className="text-xs text-gray-400 mt-1">Secure your DID document by verifying your sovereign credentials.</p>
                    </div>
                    {user.kycStatus === "VERIFIED" ? (
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 flex items-center gap-1.5 animate-pulse">
                        VERIFIED ✅
                      </span>
                    ) : user.kycStatus === "PENDING" ? (
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1.5 animate-pulse">
                        PENDING
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/5 text-gray-500 border border-white/10">
                        UNVERIFIED
                      </span>
                    )}
                  </div>

                  {user.kycStatus === "VERIFIED" ? (
                    <div className="p-4 rounded-xl border border-neon-green/20 bg-neon-green/5 text-xs text-gray-300 font-mono space-y-2">
                      <p className="text-neon-green font-bold">✓ AxiomID Verification Anchored</p>
                      <p>Your identity has been verified and permanently anchored under DID: <span className="text-white">{user.did}</span></p>
                    </div>
                  ) : user.kycStatus === "PENDING" ? (
                    <div className="p-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 text-xs text-gray-300 font-mono space-y-2">
                      <p className="text-yellow-400 font-bold">⏳ Verification Pending</p>
                      <p>The oracle network is validating your Pi Network credentials. Advanced agent tasks will unlock automatically upon approval.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={kycUsername}
                        onChange={(e) => setKycUsername(e.target.value)}
                        placeholder="Pi Username"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
                      />
                      <button
                        onClick={handleVerifyIdentity}
                        disabled={kycLoading || !kycUsername.trim()}
                        className="btn-primary text-sm px-6 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {kycLoading ? "VERIFYING..." : "VERIFY IDENTITY"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ACTIONS TAB ── */}
            {activeTab === "actions" && (
              <div className="space-y-6">
                <StampBoard user={user} claimAction={claimAction} connectWallet={connectWallet} />

                {/* Skills marketplace preview */}
                <div className="bento-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Skills Marketplace</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {skillsData.skills.slice(0, 6).map((skill: { name: string; description: string; tier?: string }) => (
                      <div
                        key={skill.name}
                        className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-axiom-purple/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white font-mono">{skill.name}</span>
                          {skill.tier && (
                            <span className="text-[9px] font-mono text-axiom-purple bg-axiom-purple/10 px-1.5 py-0.5 rounded">
                              {skill.tier}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">{skill.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── AGENT TAB ── */}
            {activeTab === "agent" && (
              <div className="space-y-6">
                {/* No agent → create form */}
                {!hasAgent && (
                  <div className="bento-card p-8 border border-axiom-purple/20 bg-axiom-purple/5">
                    <h3 className="text-lg font-semibold text-white mb-2">Create Your Agent</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      Give your agent a name to get started. It will begin at Tier 1 with 0 XP.
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Agent name (optional)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
                      />
                      <button
                        onClick={handleCreateAgent}
                        disabled={agentLoading}
                        className="btn-primary text-sm px-6 py-2.5"
                      >
                        {agentLoading ? "CREATING..." : "CREATE AGENT"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Agent exists → status + controls */}
                {hasAgent && (
                  <>
                    <div className="bento-card p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                          <p className="text-xs text-gray-500 font-mono mt-1">Agent ID: {agent.id.slice(0, 8)}...</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono ${
                            agentStatus === "ACTIVE"
                              ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                              : agentStatus === "PAUSED"
                                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                                : "bg-white/5 text-gray-500 border border-white/10"
                          }`}
                        >
                          {agentStatus}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Last Active</span>
                          <span className="text-white text-sm font-mono">
                            {agent.lastActive ? new Date(agent.lastActive).toLocaleString() : "Never"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Trust Score</span>
                          <span className="text-neon-green text-sm font-mono">{user.trustScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 text-sm">Total XP</span>
                          <span className="text-electric-blue text-sm font-mono">{user.xp.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {agentStatus === "INACTIVE" && (
                          <button
                            onClick={handleActivateAgent}
                            disabled={agentLoading}
                            className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {agentLoading ? "ACTIVATING..." : "ACTIVATE"}
                          </button>
                        )}
                        {agentStatus === "ACTIVE" && (
                          <button
                            onClick={handlePauseAgent}
                            disabled={agentLoading}
                            className="text-sm px-6 py-2.5 flex items-center gap-2 rounded-lg border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {agentLoading ? "PAUSING..." : "PAUSE"}
                          </button>
                        )}
                        {agentStatus === "PAUSED" && (
                          <button
                            onClick={handleActivateAgent}
                            disabled={agentLoading}
                            className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {agentLoading ? "RESUMING..." : "RESUME"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Agent quick actions */}
                    <div className="bento-card p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Agent Quick Actions</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link
                          href={`/passport/${user.piUsername || user.walletAddress}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-neon-green/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🆔</span>
                            <span className="text-sm text-white font-mono">View Passport</span>
                          </div>
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setActiveTab("actions")}
                          className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-electric-blue/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">⚡</span>
                            <span className="text-sm text-white font-mono">Claim Actions</span>
                          </div>
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ── TERMINAL OVERLAY ── */}
      {showTerminal && (
        <div className="fixed bottom-16 left-0 right-0 z-40 backdrop-blur-md max-h-[40vh] overflow-hidden flex flex-col" style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)', borderTop: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neon-green">TERMINAL</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{walletLogs.length} entries</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { clearWalletLogs(); setLogs(INITIAL_LOGS); }}
                className="text-[10px] font-mono transition-colors px-2 py-1 rounded border" style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
              >
                CLEAR
              </button>
              <button
                onClick={runWalletTest}
                className="text-[10px] font-mono text-neon-green transition-colors px-2 py-1 rounded border border-neon-green/20 hover:border-neon-green/40"
              >
                RUN TEST
              </button>
              <button
                onClick={() => { setShowTerminal(false); setActiveTab("passport"); }}
                className="text-gray-500 hover:text-white transition-colors ml-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4 font-mono text-[11px] leading-relaxed">
            {logs.map((line, i) => (
              <div key={`init-${i}`} style={{ color: 'var(--text-muted)' }}>{line}</div>
            ))}
            {walletLogs.map((line, i) => (
              <div key={`wallet-${i}`} className="text-neon-green/80">{line}</div>
            ))}
            {walletLogs.length === 0 && logs.length === INITIAL_LOGS.length && (
              <div className="italic" style={{ color: 'var(--text-muted)' }}>No wallet activity yet. Connect or run a test.</div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-md border-t z-40" style={{ background: 'color-mix(in srgb, var(--bg-card) 90%, transparent)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4" role="tablist">
          <div className="flex justify-around sm:justify-center gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
            {([
              { id: "passport" as TabId, icon: "🆔", label: language === "ar" ? "الجواز" : "Passport" },
              { id: "actions" as TabId, icon: "⚡", label: language === "ar" ? "العمليات" : "Actions" },
              { id: "agent" as TabId, icon: "🤖", label: language === "ar" ? "العميل" : "Agent" },
              { id: "terminal" as TabId, icon: "💻", label: language === "ar" ? "الطرفية" : "Terminal" },
              { id: "marketplace" as TabId, icon: "🛒", label: language === "ar" ? "المتجر" : "Marketplace", disabled: true },
            ]).map((tab) => {
              const isActive = tab.id === "terminal"
                ? showTerminal
                : activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  disabled={tab.disabled}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center gap-1 px-2 sm:px-5 py-2 rounded-lg transition-all relative group flex-shrink-0 ${
                    tab.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isActive
                        ? "bg-neon-green/20 text-neon-green"
                        : "hover:text-neon-green"
                  }`}
                  style={!tab.disabled && !isActive ? { color: 'var(--text-muted)' } : undefined}
                >
                  <span className="text-lg sm:text-xl">{tab.icon}</span>
                  <span className="text-[10px] sm:text-xs font-mono">{tab.label}</span>
                  {tab.disabled && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                      {language === "ar" ? "قريباً" : "Coming Soon"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      {/* ── ONBOARDING MODAL ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <div className="bento-card max-w-md w-full p-8 relative flex flex-col border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 id="onboarding-title" className="text-xl font-bold text-white font-mono">
                  AGENT ONBOARDING
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Step {onboardingStep} of 3
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("axiom_onboarding_completed", "true");
                  setShowOnboarding(false);
                }}
                className="text-gray-500 hover:text-white transition-colors text-xs font-mono border border-white/5 hover:border-white/10 px-2.5 py-1 rounded cursor-pointer"
              >
                SKIP
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step === onboardingStep
                      ? "bg-neon-green"
                      : step < onboardingStep
                        ? "bg-neon-green/40"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Step Contents */}
            <div className="flex-1 min-h-[200px] flex flex-col justify-between">
              {onboardingStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center py-4 text-4xl animate-float">🔌</div>
                  <h4 className="text-base font-semibold text-white text-center">Connect Your Pi Wallet</h4>
                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    Link your secure Pi cryptographic identity to anchor your autonomous agent on the AxiomID protocol.
                  </p>
                  {shouldShowPiBrowserPrompt && (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-amber-200">
                      <p className="font-semibold text-xs">افتح التطبيق من Pi Browser</p>
                      <p className="text-[10px] text-amber-100/70 mt-0.5">Demo wallets are disabled for this deployment.</p>
                    </div>
                  )}
                  <div className="pt-4">
                    <button
                      onClick={connectWallet}
                      disabled={isConnecting || shouldShowPiBrowserPrompt}
                      className="btn-primary w-full py-3 text-xs tracking-wider"
                    >
                    {isConnecting ? t("connecting") : t("connect_wallet")}
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center py-4 text-4xl animate-float">🤖</div>
                  <h4 className="text-base font-semibold text-white text-center">Create Autonomous Agent</h4>
                  <p className="text-xs text-gray-400 text-center leading-relaxed font-mono">
                    Define the name for your autonomous gRPC agent. It will begin at Tier 1 with 0 XP.
                  </p>
                  <div className="space-y-3 pt-2">
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Agent name (optional)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
                    />
                    <button
                      onClick={handleCreateAgent}
                      disabled={agentLoading}
                      className="btn-primary w-full py-3 text-xs tracking-wider"
                    >
                      {agentLoading ? "CREATING AGENT..." : "CREATE AGENT"}
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center py-4 text-4xl animate-float">🎫</div>
                  <h4 className="text-base font-semibold text-white text-center">Your Passport is Ready!</h4>
                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    Congratulations! Your agent identity passport has been successfully anchored and is ready to execute automated workflows.
                  </p>
                  
                  {user && (
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Agent:</span>
                        <span className="text-neon-green">{user.agent?.name || "AxiomBot"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">DID:</span>
                        <span className="text-electric-blue">{createUserDid(user.id).slice(0, 32)}...</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        localStorage.setItem("axiom_onboarding_completed", "true");
                        setShowOnboarding(false);
                      }}
                      className="btn-primary w-full py-3 text-xs tracking-wider"
                    >
                      GET STARTED
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
