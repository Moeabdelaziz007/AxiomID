"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useWallet } from "../context/wallet-context";
import skillsData from "@/data/skills.json";
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
import { PiBrowserGuard, PiBrowserBanner } from "@/components/PiBrowserGuard";
import { QuickStatsRow } from "@/components/dashboard/QuickStatsRow";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import dynamic from "next/dynamic";
const InteractivePassportCard = dynamic(() => import("@/components/ui/InteractivePassportCard"), { ssr: false });
const StampBoard = dynamic(() => import("@/components/StampBoard").then(m => m.StampBoard), { ssr: false });
const TerminalOverlay = dynamic(() => import("@/components/dashboard/TerminalOverlay").then(m => m.TerminalOverlay), { ssr: false });

type TabId = "passport" | "actions" | "terminal" | "marketplace" | "agent";

/**
 * Renders the user dashboard with tab-based navigation and agent management.
 *
 * Displays different views based on wallet connection state: a connection prompt when
 * not authenticated, or a full dashboard with tabs for passport, actions, agent, and
 * terminal when authenticated. Manages an onboarding modal on first visit and provides
 * controls for agent creation, activation, and pause operations.
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
    disconnectWallet: _disconnectWallet,
    claimAction,
    createAgent,
    activateAgent,
    pauseAgent,
    claimKya,
    isPiBrowser,
    connectDemo,
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

  const [adLoading, setAdLoading] = useState(false);

  const handleWatchAd = async () => {
    setAdLoading(true);
    const pushLog = (msg: string) => {
      setLogs((prev) => [...prev, `[ADS] ${msg}`]);
    };
    try {
      pushLog("Starting Pi Network rewarded ad...");
      const { showRewardedAd } = await import("@/lib/pi-sdk");
      const result = await showRewardedAd(pushLog);
      
      if (result.success && result.adId) {
        pushLog("Verifying ad reward on backend...");
        const response = await fetch("/api/pi/ads/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adId: result.adId }),
        });
        
        if (response.ok) {
          const verifyData = await response.json();
          pushLog(`Reward claimed! +${verifyData.xpEarned || 10} XP awarded.`);
          if (typeof window !== "undefined" && typeof window.location !== "undefined") {
            window.location.reload();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          pushLog(`Verification failed: ${errorData.message || "Unknown error"}`);
        }
      } else {
        pushLog("Ad playback failed or cancelled.");
      }
    } catch (err) {
      pushLog(`Error watching ad: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAdLoading(false);
    }
  };

  const handleRunTest = async () => {
    setLogs((prev) => [...prev, "SYSTEM: Starting diagnostic verification...", "SYSTEM: Checking Pi Wallet connection..."]);
    try {
      await runWalletTest();
    } catch {
      // Ignored: runWalletTest already logs to walletLogs
    }

    setLogs((prev) => [...prev, "SYSTEM: Triggering edge database synchronization..."]);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "all", dryRun: false }),
      });
      
      if (response.ok) {
        const syncData = await response.json();
        setLogs((prev) => [
          ...prev,
          `SYSTEM: Sync status: ${syncData.message}`,
          `SYSTEM: Harvest Results synced: ${syncData.results?.harvestResults?.synced ?? 0}`,
          `SYSTEM: Agent Presence synced: ${syncData.results?.agentPresence?.synced ?? 0}`,
          `SYSTEM: Shannon Entropy: ${syncData.results?.harvestResults?.entropy?.toFixed(4) ?? "0.0000"}`
        ]);
      } else {
        const errorText = await response.text();
        setLogs((prev) => [...prev, `SYSTEM: Sync failed: ${errorText}`]);
      }
    } catch (err) {
      setLogs((prev) => [...prev, `SYSTEM: Sync network error: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

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
    toast.success("Agent created successfully");
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
        /* ── NOT CONNECTED / SHOWCASE MODE ── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left: Connect Wallet Promo */}
            <div className="md:col-span-7 space-y-4">
              <div className="bento-card p-6 border border-electric-blue/20 bg-electric-blue/5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-electric-blue/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-electric-blue animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{t("connect_wallet")}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{t("settings_wallet_prompt")}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    {shouldShowPiBrowserPrompt ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center text-amber-200 text-xs font-mono">
                          {t("pi_browser_required")}
                        </div>
                        <button
                          type="button"
                          onClick={connectDemo}
                          className="btn-primary w-full text-xs py-3 font-semibold uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-axiom-purple to-electric-blue hover:from-axiom-purple/90 hover:to-electric-blue/90 text-white font-mono"
                        >
                          Explore Demo Mode
                          <Zap className="w-4 h-4 text-amber-400" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={connectWallet} disabled={isConnecting} className="btn-primary w-full text-xs py-3 font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
                        {isConnecting ? (
                          <><span className="animate-spin">⟳</span> {t("connecting")}</>
                        ) : (
                          <>
                            {t("connect_wallet")}
                            <Fingerprint className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bento-card p-5 border border-white/5 bg-white/[0.01]">
                <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-2">{t("showcase_title")}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {t("showcase_desc")}
                </p>
              </div>
            </div>

            {/* Right: Locked Passport Showcase */}
            <div className="md:col-span-5 flex justify-center relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/5 via-electric-blue/5 to-axiom-purple/5 rounded-[36px] filter blur-xl opacity-60 pointer-events-none" />
              <InteractivePassportCard
                readonly
                locked
                user={null}
              />
            </div>

          </div>
        </div>
      ) : user ? (
        /* ── AUTHENTICATED VIEW ── */
        <>
          <WelcomeBanner
            username={user.piUsername || "User"}
            tier={user.tier}
            levelProgress={levelProgress}
            xp={user.xp}
          />

          {/* Quick Stats Row */}
          <QuickStatsRow
            trustScore={user.trustScore}
            xp={user.xp}
            levelProgress={levelProgress}
            agentStatus={agentStatus}
            daysActive={Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))}
          />

          {/* Tab content */}
          <TabPanel id="passport" activeTab={activeTab}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* 3D Passport card */}
                <div className="lg:col-span-5">
                  <div className="relative group cursor-pointer" onClick={() => router.push(`/passport/${user.piUsername || user.walletAddress}`)}>
                    <InteractivePassportCard
                      user={{
                        piUsername: user.piUsername,
                        walletAddress: user.walletAddress,
                        tier: user.tier,
                        xp: user.xp,
                        trustScore: user.trustScore,
                        kyaStatus: user.kycStatus ? "verified" : "pending",
                        kycStatus: user.kycStatus ? "verified" : "pending"
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-mono text-white tracking-widest uppercase bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
                        {t("view_passport")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats + Links */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <AgentStatsCard
                      tier={user.tier}
                      xp={user.xp}
                      agentName={agent?.name ?? null}
                      agentStatus={agentStatus}
                      trustScore={user.trustScore}
                    />
                    <QuickLinksCard passportSlug={user.piUsername || user.walletAddress || "user"} did={user.did || undefined} passportUrl={user.passportUrl} />
                  </div>
                  
                  {/* Pi Network Ads Reward Card */}
                  <div className="bento-card p-5 border border-amber-400/20 bg-amber-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full filter blur-xl opacity-60 pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-amber-200 flex items-center gap-1.5 font-mono">
                          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                          {language === "ar" ? "إعلانات مكافأة PI" : "REWARDED PI ADS"}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {language === "ar" 
                            ? "شاهد إعلاناً قصيراً للحصول على 10 XP إضافية على الفور ورفع مستوى التوثيق الخاص بك."
                            : "Watch a short ad to earn +10 XP immediately and upgrade your authorization tier."}
                        </p>
                      </div>
                      <button
                        onClick={handleWatchAd}
                        disabled={adLoading}
                        className="btn-primary text-xs font-semibold py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black border-amber-600 hover:border-amber-500 shrink-0 font-mono tracking-wider transition-all disabled:opacity-50"
                      >
                        {adLoading ? (
                          <span className="flex items-center gap-1.5">
                            <span className="animate-spin">⟳</span> {language === "ar" ? "جاري التحميل..." : "LOADING..."}
                          </span>
                        ) : (
                          language === "ar" ? "شاهد الإعلان (+10 XP)" : "WATCH AD (+10 XP)"
                        )}
                      </button>
                    </div>
                  </div>

                  <SkillsCard skills={skillsData.skills.slice(0, 3)} />
                </div>

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
                  <h3 className="text-sm font-semibold text-surface flex items-center gap-2">
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
                        <span className="text-sm text-surface font-mono">{skill.name}</span>
                        {skill.tier && (
                          <span className="text-[9px] font-mono text-axiom-purple bg-axiom-purple/10 px-1.5 py-0.5 rounded">
                            {skill.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-faint line-clamp-2">{skill.description}</p>
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

          {/* Recent Activity */}
          <RecentActivity user={{ ...user, kycStatus: user.kycStatus ?? undefined }} />
        </>
      ) : null}

      {/* ── TAB NAVIGATION ── */}
      {user && (
        <nav className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar px-1" role="tablist" aria-label="Dashboard sections">
          {(() => {
            const totalStamps = 6;
            const claimedStamps = user.stamps?.length ?? 0;
            const unclaimedStamps = Math.max(0, totalStamps - claimedStamps);
            const tabs = [
              { id: "passport" as TabId, icon: <Fingerprint className="w-4 h-4" />, label: language === "ar" ? "الجواز" : "Passport", badge: 0 },
              { id: "actions" as TabId, icon: <Zap className="w-4 h-4" />, label: language === "ar" ? "العمليات" : "Actions", badge: unclaimedStamps },
              { id: "agent" as TabId, icon: <Bot className="w-4 h-4" />, label: language === "ar" ? "العميل" : "Agent", badge: hasAgent ? 0 : 1 },
              { id: "terminal" as TabId, icon: <Terminal className="w-4 h-4" />, label: language === "ar" ? "الطرفية" : "Terminal", badge: 0 },
            ];
            return tabs.map((tab) => {
              const isActive = tab.id === "terminal" ? showTerminal : activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-mono transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-neon-green/20 text-neon-green shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      : "text-subtle hover:text-surface hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full text-[8px] font-bold bg-emerald-500 text-white">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-emerald-400 to-neon-green" />
                  )}
                </button>
              );
            });
          })()}
        </nav>
      )}

      {/* ── TERMINAL OVERLAY ── */}
      <AnimatePresence>
        {showTerminal && (
          <TerminalOverlay
            logs={logs}
            walletLogs={walletLogs}
            onClear={() => { clearWalletLogs(); setLogs([]); }}
            onRunTest={handleRunTest}
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
            user={user}
            onConnect={connectWallet}
            onConnectDemo={connectDemo}
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

