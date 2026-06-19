"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "../context/wallet-context";
import skillsData from "@/data/skills.json";
import { StampBoard } from "@/components/StampBoard";
import { AgentCard } from "@/components/AgentCard";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { useLanguage } from "../context/language-context";
import { Fingerprint, Zap, Bot, Terminal, Store } from "lucide-react";
import { AnimatePresence } from "framer-motion";

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
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TabId>("passport");
  const [showTerminal, setShowTerminal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const onboardingStep = !user ? 1 : !user.agent ? 2 : 3;

  useEffect(() => {
    const onboardingCompleted = localStorage.getItem("axiom_onboarding_completed");
    if (onboardingCompleted !== "true") {
      queueMicrotask(() => setShowOnboarding(true));
    }
  }, []);

  const shouldShowPiBrowserPrompt = !isPiBrowser;

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
    await createAgent(name || agentName || undefined);
    setAgentName("");
  };

  const handleActivateAgent = async () => {
    await activateAgent();
  };

  const handlePauseAgent = async () => {
    await pauseAgent();
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
      ) : !user ? (
        /* ── NOT CONNECTED ── */
        <div className="space-y-6">
          <div className="bento-card p-5 border border-electric-blue/20 bg-electric-blue/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-electric-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Connect Your Pi Wallet</h3>
                  <p className="text-xs text-gray-400">Open Pi Browser to authenticate and manage your agent.</p>
                </div>
              </div>
              {shouldShowPiBrowserPrompt ? (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-center text-amber-200 text-xs">
                  Open in Pi Browser
                </div>
              ) : (
                <button onClick={connectWallet} disabled={isConnecting} className="btn-primary text-xs px-4 py-2">
                  {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : user ? (
        /* ── AUTHENTICATED VIEW ── */
        <>
          <WelcomeBanner
            username={user.piUsername || "User"}
            tier={user.tier}
            xp={user.xp}
            levelProgress={levelProgress}
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
                <QuickLinksCard passportSlug={user.piUsername || user.walletAddress || "user"} did={user.did || undefined} />
              </div>
              <KYAVerificationCard
                kycStatus={user.kycStatus ?? "UNVERIFIED"}
                did={user.did ?? ""}
                piUsername={user.piUsername ?? ""}
                onVerify={async (username: string) => { await claimKya(username); }}
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
            onClear={() => { clearWalletLogs(); setLogs([]); }}
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
            agentLoading={false}
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

