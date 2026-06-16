"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "../context/wallet-context";
import { createUserDid } from "@/lib/did";
import skillsData from "@/data/skills.json";
import { StampBoard } from "@/components/StampBoard";
import { AgentCard } from "@/components/AgentCard";
import { useLanguage } from "../context/language-context";
import { Fingerprint, Zap, Bot, Terminal, Store } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { TabPanel } from "@/components/dashboard/TabPanel";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { AgentStatsCard } from "@/components/dashboard/AgentStatsCard";
import { SkillsCard } from "@/components/dashboard/SkillsCard";
import { QuickLinksCard } from "@/components/dashboard/QuickLinksCard";
import { KYAVerificationCard } from "@/components/dashboard/KYAVerificationCard";
import { AgentControlsCard } from "@/components/dashboard/AgentControlsCard";
import { CreateAgentCard } from "@/components/dashboard/CreateAgentCard";
import { TerminalOverlay } from "@/components/dashboard/TerminalOverlay";
import { PiBrowserGuard, PiBrowserBanner } from "@/components/PiBrowserGuard";

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
    disconnectWallet: _disconnectWallet,
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
  const [_kycUsername, setKycUsername] = useState("");
  const [_kycLoading, setKycLoading] = useState(false);

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

  const handleVerifyIdentity = async (username: string) => {
    setKycLoading(true);
    await claimKya(username);
    setKycLoading(false);
  };

  const isDemo = !user && !isLoading;
  const shouldShowPiBrowserPrompt = !isPiBrowser && !isDemoWalletEnabled;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs((prev) => [...prev, "SYSTEM: Wallet connection check completed."]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabClick = (tabId: TabId) => {
    if (tabId === "marketplace") {
      router.push("/dashboard/marketplace");
      return;
    }
    if (tabId === "terminal") {
      setShowTerminal((prev) => !prev);
      setActiveTab((prev) => (prev === "terminal" ? "passport" : "terminal"));
      return;
    }
    setShowTerminal(false);
    setActiveTab(tabId);
  };

  const handleCreateAgent = async (name?: string) => {
    setAgentLoading(true);
    await createAgent(name || agentName || undefined);
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
  const agentStatus = (agent?.status ?? "NONE") as "ACTIVE" | "INACTIVE" | "PAUSED";

  return (
    <PiBrowserGuard showSplash={false}>
      <PiBrowserBanner />
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
          <div className="bento-card p-5 border border-electric-blue/20 bg-electric-blue/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-electric-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Demo Mode</h3>
                  <p className="text-xs text-gray-400">Connect your wallet to manage your agent.</p>
                </div>
              </div>
              {shouldShowPiBrowserPrompt ? (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-center text-amber-200 text-xs">
                  Open in Pi Browser (Demo Disabled)
                </div>
              ) : (
                <button onClick={connectWallet} disabled={isConnecting} className="btn-primary text-xs px-4 py-2">
                  {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
              )}
            </div>
          </div>

          {/* Demo agent card */}
          <AgentCard
            name={DEMO_PROFILE.name}
            tier={DEMO_PROFILE.tier}
            trustScore={85}
            xp={DEMO_PROFILE.xp}
            status={DEMO_PROFILE.status as "ACTIVE"}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <AgentStatsCard
              tier={DEMO_PROFILE.tier}
              xp={DEMO_PROFILE.xp}
              agentName={DEMO_PROFILE.name}
              agentStatus={DEMO_PROFILE.status}
              trustScore={85}
            />
            <SkillsCard skills={skillsData.skills.slice(0, 4)} />
            <QuickLinksCard passportSlug="demo" />
          </div>

          <StampBoard user={null} claimAction={claimAction} connectWallet={connectWallet} />
        </div>
      ) : user ? (
        /* ── AUTHENTICATED VIEW ── */
        <>
          <WelcomeBanner
            username={user.piUsername || "User"}
            tier={user.tier}
            xp={user.xp}
            levelProgress={levelProgress}
            isDemoWallet={isDemoWallet}
          />

          {/* Tab content */}
          <TabPanel id="passport" activeTab={activeTab}>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <AgentStatsCard
                  tier={user.tier}
                  xp={user.xp}
                  agentName={agent?.name ?? null}
                  agentStatus={agentStatus}
                  trustScore={user.trustScore}
                />
                <SkillsCard skills={skillsData.skills.slice(0, 3)} />
                <QuickLinksCard passportSlug={user.piUsername || user.walletAddress || "user"} />
              </div>
              <KYAVerificationCard
                kycStatus={user.kycStatus ?? "UNVERIFIED"}
                did={user.did ?? ""}
                piUsername={user.piUsername ?? ""}
                onVerify={handleVerifyIdentity}
              />
            </div>
          </TabPanel>

          <TabPanel id="actions" activeTab={activeTab}>
            <div className="space-y-5">
              <StampBoard user={user} claimAction={claimAction} connectWallet={connectWallet} />

              {/* Skills marketplace preview */}
              <div className="bento-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-axiom-purple" />
                    Skills Marketplace
                  </h3>
                  <Link href="/dashboard/marketplace" className="text-[10px] font-mono text-axiom-purple hover:text-axiom-purple/80 transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {skillsData.skills.slice(0, 6).map((skill: { name: string; description: string; tier?: string }) => (
                    <div
                      key={skill.name}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-axiom-purple/30 transition-colors cursor-default"
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
          </TabPanel>

          <TabPanel id="agent" activeTab={activeTab}>
            <div className="space-y-5">
              {!hasAgent ? (
                <CreateAgentCard onCreate={handleCreateAgent} />
              ) : (
                <>
                  <AgentControlsCard
                    agentName={agent!.name}
                    agentId={agent!.id}
                    status={agentStatus}
                    trustScore={user.trustScore}
                    xp={user.xp}
                    lastActive={agent!.lastActive}
                    onActivate={handleActivateAgent}
                    onPause={handlePauseAgent}
                  />

                  {/* Agent card preview */}
                  <AgentCard
                    name={agent!.name}
                    tier={user.tier}
                    trustScore={user.trustScore}
                    xp={user.xp}
                    status={agentStatus}
                    did={user.did ?? undefined}
                    onClick={() => router.push(`/passport/${user.piUsername || user.walletAddress}`)}
                  />
                </>
              )}
            </div>
          </TabPanel>
        </>
      ) : null}

      {/* ── TAB NAVIGATION ── */}
      {user && (
        <nav className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar" role="tablist" aria-label="Dashboard sections">
          {([
            { id: "passport" as TabId, icon: <Fingerprint className="w-4 h-4" />, label: language === "ar" ? "الجواز" : "Passport" },
            { id: "actions" as TabId, icon: <Zap className="w-4 h-4" />, label: language === "ar" ? "العمليات" : "Actions" },
            { id: "agent" as TabId, icon: <Bot className="w-4 h-4" />, label: language === "ar" ? "العميل" : "Agent" },
            { id: "terminal" as TabId, icon: <Terminal className="w-4 h-4" />, label: language === "ar" ? "الطرفية" : "Terminal" },
          ]).map((tab) => {
            const isActive = tab.id === "terminal" ? showTerminal : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] rounded-lg text-xs font-mono transition-all flex-shrink-0 ${
                  isActive
                    ? "bg-neon-green/20 text-neon-green shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* ── TERMINAL OVERLAY ── */}
      <AnimatePresence>
        {showTerminal && (
          <TerminalOverlay
            logs={logs}
            walletLogs={walletLogs}
            onClear={() => { clearWalletLogs(); setLogs(INITIAL_LOGS); }}
            onRunTest={runWalletTest}
            onClose={() => { setShowTerminal(false); setActiveTab("passport"); }}
          />
        )}
      </AnimatePresence>

      {/* ── ONBOARDING MODAL ── */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            step={onboardingStep}
            agentName={agentName}
            setAgentName={setAgentName}
            agentLoading={agentLoading}
            shouldShowPiBrowserPrompt={shouldShowPiBrowserPrompt}
            isConnecting={isConnecting}
            user={user ? { agent: user.agent ? { name: user.agent.name } : undefined, id: user.id } : null}
            onConnect={connectWallet}
            onCreateAgent={handleCreateAgent}
            onSkip={() => {
              localStorage.setItem("axiom_onboarding_completed", "true");
              setShowOnboarding(false);
            }}
            onComplete={() => {
              localStorage.setItem("axiom_onboarding_completed", "true");
              setShowOnboarding(false);
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </PiBrowserGuard>
  );
}

/* ── Onboarding Modal ── */
function OnboardingModal({
  step,
  agentName,
  setAgentName,
  agentLoading,
  shouldShowPiBrowserPrompt,
  isConnecting,
  user,
  onConnect,
  onCreateAgent,
  onSkip,
  onComplete,
  t,
}: {
  step: number;
  agentName: string;
  setAgentName: (v: string) => void;
  agentLoading: boolean;
  shouldShowPiBrowserPrompt: boolean;
  isConnecting: boolean;
  user: { agent?: { name?: string }; id: string } | null;
  onConnect: () => void;
  onCreateAgent: (name?: string) => Promise<void>;
  onSkip: () => void;
  onComplete: () => void;
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bento-card max-w-md w-full p-6 sm:p-8 relative flex flex-col border border-white/10 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-white font-mono">AGENT ONBOARDING</h3>
            <p className="text-xs text-gray-400 font-mono mt-1">Step {step} of 3</p>
          </div>
          <button onClick={onSkip} className="text-gray-500 hover:text-white text-xs font-mono border border-white/5 hover:border-white/10 px-2.5 py-1 rounded">
            SKIP
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s === step ? "bg-neon-green" : s < step ? "bg-neon-green/40" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 min-h-[200px] flex flex-col justify-between">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Fingerprint className="w-10 h-10 mx-auto text-neon-green" /></div>
              <h4 className="text-base font-semibold text-white text-center">Connect Your Pi Wallet</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Link your secure Pi cryptographic identity to anchor your autonomous agent.
              </p>
              {shouldShowPiBrowserPrompt && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-amber-200 text-xs">
                  Open in Pi Browser
                </div>
              )}
              <div className="pt-4">
                <button onClick={onConnect} disabled={isConnecting || shouldShowPiBrowserPrompt} className="btn-primary w-full py-3 text-xs tracking-wider">
                  {isConnecting ? t("connecting") : t("connect_wallet")}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Bot className="w-10 h-10 mx-auto text-axiom-purple" /></div>
              <h4 className="text-base font-semibold text-white text-center">Create Autonomous Agent</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed font-mono">
                Define the name for your autonomous gRPC agent.
              </p>
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Agent name (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono"
                />
                <button onClick={() => onCreateAgent(agentName)} disabled={agentLoading} className="btn-primary w-full py-3 text-xs tracking-wider">
                  {agentLoading ? "CREATING AGENT..." : "CREATE AGENT"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4 text-4xl animate-float"><Zap className="w-10 h-10 mx-auto text-electric-blue" /></div>
              <h4 className="text-base font-semibold text-white text-center">Your Passport is Ready!</h4>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Your agent identity passport has been successfully anchored.
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
                <button onClick={onComplete} className="btn-primary w-full py-3 text-xs tracking-wider">GET STARTED</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
