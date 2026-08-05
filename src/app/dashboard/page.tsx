"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { useWallet } from "../context/wallet-context";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { useLanguage } from "../context/language-context";
import { Fingerprint, Zap, Brain, Wallet, Code2, LayoutDashboard, Settings } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import { TabPanel } from "@/components/dashboard/TabPanel";
import { PiBrowserGuard, PiBrowserBanner } from "@/components/PiBrowserGuard";
import { DevModeBanner } from "@/components/DevModeBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import nextDynamic from "next/dynamic";

import { HomeTab } from "@/components/dashboard/tabs/HomeTab";
import { IdentityTab } from "@/components/dashboard/tabs/IdentityTab";
import { SkillsTab } from "@/components/dashboard/tabs/SkillsTab";
import { WalletTab } from "@/components/dashboard/tabs/WalletTab";
import { MemoryTab } from "@/components/dashboard/tabs/MemoryTab";
import { SettingsTab } from "@/components/dashboard/tabs/SettingsTab";

const InteractivePassportCard = nextDynamic(() => import("@/components/ui/InteractivePassportCard"), { ssr: false });
const TerminalOverlay = nextDynamic(() => import("@/components/dashboard/TerminalOverlay").then(m => m.TerminalOverlay), { ssr: false });

export const dynamic = 'force-dynamic';

type TabId = "home" | "identity" | "skills" | "wallet" | "memory" | "settings";

const TABS: { id: TabId; icon: typeof Fingerprint; label: string }[] = [
  { id: "home", icon: LayoutDashboard, label: "Home" },
  { id: "identity", icon: Fingerprint, label: "Identity" },
  { id: "skills", icon: Code2, label: "Skills" },
  { id: "wallet", icon: Wallet, label: "Wallet" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "settings", icon: Settings, label: "Settings" },
];

/**
 * Renders the dashboard, including wallet connection, onboarding, navigation, and authenticated tab content.
 */
export default function Dashboard() {
  const { t } = useLanguage();
  const {
    user, isLoading, connectWallet, isConnecting, levelProgress,
    walletLogs, clearWalletLogs, runWalletTest,
    claimAction, createAgent,
    claimKya, isPiBrowser, connectDemo,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [showTerminal, setShowTerminal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const onboardingStep = !user ? 1 : !user.agent ? 2 : 3;
  const shouldShowPiBrowserPrompt = !isPiBrowser;

  useEffect(() => {
    try {
      const onboardingCompleted = localStorage.getItem("axiom_onboarding_completed");
      if (onboardingCompleted !== "true") queueMicrotask(() => setShowOnboarding(true));
    } catch {
      queueMicrotask(() => setShowOnboarding(true));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs((prev) => [...prev, "SYSTEM: Wallet connection check completed."]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRunTest = async () => {
    setLogs((prev) => [...prev, "SYSTEM: Starting diagnostic verification...", "SYSTEM: Checking Pi Wallet connection..."]);
    try { await runWalletTest(); } catch { /* ignored */ }
    setLogs((prev) => [...prev, "SYSTEM: Triggering edge database synchronization..."]);
    try {
      const response = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "all", dryRun: false }) });
      if (response.ok) {
        const syncData = await response.json();
        setLogs((prev) => [...prev, `SYSTEM: Sync status: ${syncData.message}`, `SYSTEM: Harvest Results synced: ${syncData.results?.harvestResults?.synced ?? 0}`, `SYSTEM: Agent Presence synced: ${syncData.results?.agentPresence?.synced ?? 0}`]);
      }
    } catch (err) {
      setLogs((prev) => [...prev, `SYSTEM: Sync error: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

  const handleCreateAgent = async (name?: string) => {
    const success = await createAgent(name || agentName || undefined);
    setAgentName("");
    if (success) {
      posthog.capture("agent_created", {
        agent_name: name || agentName || undefined,
      });
      toast.success("Agent created successfully");
    }
  };

  const agent = user?.agent;
  const agentStatus = (agent?.status ?? "NONE") as "ACTIVE" | "INACTIVE" | "PAUSED";
  const daysActive = useMemo(() => user ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000)) : 0, [user]);

  return (
    <ErrorBoundary>
    <PiBrowserGuard showSplash={false}>
      <PiBrowserBanner />
      <DevModeBanner />
      {isLoading ? (
        <div className="space-y-6">
          <div className="bento-card p-8">
            <div className="h-8 bg-glass rounded animate-pulse mb-4" />
            <div className="h-4 bg-glass rounded animate-pulse w-3/4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bento-card p-6">
                <div className="h-6 bg-glass rounded animate-pulse mb-2" />
                <div className="h-8 bg-glass rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : !user ? (
        /* NOT CONNECTED */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="bento-card p-6 border border-electric-blue/20 bg-electric-blue/5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-electric-blue/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-electric-blue animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{t("connect_wallet")}</h3>
                      <p className="text-xs text-faint mt-1">{t("settings_wallet_prompt")}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    {shouldShowPiBrowserPrompt ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center text-amber-200 text-xs font-mono">
                          {t("pi_browser_required")}
                        </div>
                        <button type="button" onClick={connectDemo} className="btn-primary w-full text-xs py-3 font-semibold uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-axiom-purple to-electric-blue hover:from-axiom-purple/90 hover:to-electric-blue/90 text-white font-mono">
                          Explore Demo Mode <Zap className="w-4 h-4 text-amber-400" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={connectWallet} disabled={isConnecting} className="btn-primary w-full text-xs py-3 font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
                        {isConnecting ? <><span className="animate-spin">⟳</span> {t("connecting")}</> : <>{t("connect_wallet")} <Fingerprint className="w-4 h-4" /></>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="bento-card p-5 border border-glass bg-white/[0.01]">
                <h4 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-2">{t("showcase_title")}</h4>
                <p className="text-xs text-faint leading-relaxed">{t("showcase_desc")}</p>
              </div>
            </div>
            <div className="md:col-span-5 flex justify-center relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 rounded-[36px] filter blur-xl opacity-60 pointer-events-none" />
              <InteractivePassportCard readonly locked user={null} />
            </div>
          </div>
        </div>
      ) : (
        /* AUTHENTICATED VIEW */
        <>
          {/* TAB NAVIGATION — desktop top bar */}
          <nav className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar px-1 max-md:hidden" role="tablist" aria-label="Dashboard sections">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-mono transition-all flex-shrink-0 ${isActive ? "bg-neon-green/20 text-neon-green shadow-[0_0_12px_rgba(16,185,129,0.1)]" : "text-subtle hover:text-surface hover:bg-glass"}`}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-emerald-400 to-neon-green" />}
                </button>
              );
            })}
          </nav>

          {/* TAB CONTENT */}
          <div className="pb-20 md:pb-0">
            <TabPanel id="home" activeTab={activeTab}>
              <HomeTab user={user} levelProgress={levelProgress} agentStatus={agentStatus} daysActive={daysActive} />
            </TabPanel>
            <TabPanel id="identity" activeTab={activeTab}>
              <IdentityTab user={user} claimAction={claimAction} claimKya={claimKya} connectWallet={connectWallet} />
            </TabPanel>
            <TabPanel id="skills" activeTab={activeTab}>
              <SkillsTab />
            </TabPanel>
            <TabPanel id="wallet" activeTab={activeTab}>
              <WalletTab />
            </TabPanel>
            <TabPanel id="memory" activeTab={activeTab}>
              <MemoryTab />
            </TabPanel>
            <TabPanel id="settings" activeTab={activeTab}>
              <SettingsTab />
            </TabPanel>
          </div>

          {/* TAB NAVIGATION — mobile bottom bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)', borderColor: 'var(--card-border)', paddingBottom: 'env(safe-area-inset-bottom)' }} role="tablist" aria-label="Dashboard sections">
            <div className="flex items-center justify-around py-1 px-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-h-[48px] rounded-lg text-[10px] font-mono transition-all flex-1 max-w-[64px] ${isActive ? "text-neon-green" : "text-faint hover:text-subtle"}`}>
                    <tab.icon className="w-5 h-5" />
                    <span className="truncate w-full text-center leading-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      {/* TERMINAL OVERLAY — removed in PR 2 */}
      <AnimatePresence>
        {showTerminal && (
          <TerminalOverlay logs={logs} walletLogs={walletLogs}
            onClear={() => { clearWalletLogs(); setLogs([]); }}
            onRunTest={handleRunTest}
            onClose={() => { setShowTerminal(false); setActiveTab("home"); }} />
        )}
      </AnimatePresence>

      {/* ONBOARDING MODAL */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal step={onboardingStep} agentName={agentName} setAgentName={setAgentName}
            agentLoading={false} shouldShowPiBrowserPrompt={shouldShowPiBrowserPrompt}
            isConnecting={isConnecting} user={user} onConnect={connectWallet}
            onConnectDemo={connectDemo} onCreateAgent={handleCreateAgent}
            onSkip={() => { try { localStorage.setItem("axiom_onboarding_completed", "true"); } catch {} setShowOnboarding(false); }}
            onComplete={() => {
              try { localStorage.setItem("axiom_onboarding_completed", "true"); } catch {}
              posthog.capture("onboarding_completed");
              setShowOnboarding(false);
            }}
            t={t} />
        )}
      </AnimatePresence>
    </PiBrowserGuard>
    </ErrorBoundary>
  );
}
