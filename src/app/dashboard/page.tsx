"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "../context/wallet-context";
import { createPiPayment } from "@/lib/pi-sdk";
import { AgentPassport } from "@/components/AgentPassport";
import { VerificationBadge } from "@/components/VerificationBadge";
import { TrustScoreGauge } from "@/components/TrustScoreGauge";
import Link from "next/link";
import skillsData from "@/data/skills.json";

type Tab = "passport" | "actions" | "terminal" | "marketplace";

const INITIAL_LOGS = [
  "SYSTEM: initializing did:axiom resolver...",
  "RESOLVER: resolved did:axiom:axiomid.app:pw-agt-369",
  "SECURITY: gRPC auth interceptor active",
  "SYSTEM: Agentic OS online. Ready for task routing.",
];

export default function Dashboard() {
  const {
    user,
    isLoading,
    connectWallet,
    isConnecting,
    levelProgress,
    nextXP,
    isPiBrowser,
    createAgent,
    activateAgent,
    pauseAgent,
    refreshUser,
    claimAction,
    error,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<Tab>("passport");
  const [logs, setLogs] = useState<string[]>(INITIAL_LOGS);
  const [terminalInput, setTerminalInput] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const events = [
        `SYSTEM: heartbeat pulse (latency: ${(10 + Math.random() * 5).toFixed(0)}ms)`,
        `TRUSTCHAIN: verification score updated`,
        `STELLAR: ledger sync complete`,
        `KYA: manifest validated`,
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      setLogs((prev) => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${event}`]);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim().toLowerCase();
    setLogs((prev) => [...prev, `> ${terminalInput}`]);
    setTerminalInput("");

    if (cmd === "clear") { setLogs([]); return; }

    const responses: Record<string, string> = {
      help: "Commands: status, did, tier, xp, clear",
      status: `User: ${user?.piUsername || "anonymous"}. Tier: ${user?.tier || "None"}. Agent: ${user?.agent?.name || "None"}.`,
      did: user ? `did:axiom:axiomid.app:${user.id.slice(0, 8)}` : "did:axiom:anonymous",
      tier: `Current tier: ${user?.tier || "Visitor"}. XP: ${user?.xp || 0}.`,
      xp: `Experience: ${user?.xp || 0} XP. Level progress: ${levelProgress}%.`,
    };

    setLogs((prev) => [...prev, `[SYSTEM] ${responses[cmd] || `Unknown command: '${cmd}'. Type 'help'.`}`]);
  };

  const handleClaim = async (actionId: string) => {
    if (claiming) return;
    setClaiming(actionId);
    await claimAction(actionId);
    setClaiming(null);
  };

  const isClaimed = (actionId: string) => user?.actions?.some((a) => a.type === actionId) ?? false;

  const handleProvisionAgent = async () => {
    if (!user) return;
    setAgentStatus("Provisioning...");
    const success = await createAgent("My Axiom Agent");
    setLogs((prev) => [...prev, `[SYSTEM] Agent provisioned: ${success ? "SUCCESS" : "FAILED"}`]);
    setAgentStatus(success ? "Agent provisioned!" : "Error");
    setTimeout(() => setAgentStatus(null), 3000);
  };

  const handleToggleAgent = async () => {
    if (!user?.agent) return;
    const isActive = user.agent.status === "active";
    setAgentStatus(isActive ? "Pausing..." : "Activating...");
    const success = isActive ? await pauseAgent() : await activateAgent();
    setLogs((prev) => [...prev, `[SYSTEM] Agent ${success ? "updated" : "failed"}`]);
    setAgentStatus(success ? "Updated!" : "Error");
    setTimeout(() => setAgentStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-grid flex flex-col">
      <div className="scanline" />

      {/* Top Header */}
      <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-sm tracking-tighter text-white">AXIOM<span className="text-gray-600">ID</span></span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-mono text-xs text-gray-500 hidden md:inline">Dashboard</span>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <button onClick={connectWallet} disabled={isConnecting} className="btn-primary text-[10px] px-3 py-1.5">
              {isConnecting ? "CONNECTING..." : "CONNECT"}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-mono text-white block">{user.piUsername}</span>
                <span className="text-[9px] font-mono text-neon-green">{user.tier}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-xs font-bold font-mono text-neon-green">
                {user.piUsername?.slice(0, 2).toUpperCase() || "??"}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tab Bar */}
      <div className="border-b border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl px-6 sticky top-16 z-10">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {([
            { id: "passport", label: "Passport" },
            { id: "actions", label: "Actions" },
            { id: "terminal", label: "Terminal" },
            { id: "marketplace", label: "Marketplace" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-mono transition-all border-b-2 ${
                activeTab === tab.id
                  ? "border-neon-green text-neon-green"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-xs font-mono text-gray-500">Loading passport...</span>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-16 h-16 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
            <p className="text-sm text-gray-400 text-center max-w-md">
              Connect your Pi wallet or Stellar address to access your Agent Passport.
            </p>
            <button onClick={connectWallet} disabled={isConnecting} className="btn-primary">
              {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          </div>
        ) : (
          <>
            {/* Passport Tab */}
            {activeTab === "passport" && (
              <div className="flex flex-col gap-6">
                <AgentPassport
                  username={user.piUsername || user.id}
                  walletAddress={user.stellarAddress || user.walletAddress}
                  stellarAddress={user.stellarAddress}
                  tier={user.tier}
                  trustScore={user.trustScore}
                  kyaStatus={user.tier !== "Visitor" ? "verified" : "pending"}
                  kycStatus={user.tier === "Sovereign" || user.tier === "Validator" ? "verified" : "pending"}
                  issuedDate={user.createdAt}
                  did={`did:axiom:axiomid.app:${user.id.slice(0, 8)}`}
                  agentName={user.agent?.name}
                  agentStatus={user.agent?.status}
                  xp={user.xp}
                />

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "XP", value: user.xp.toString(), color: "text-neon-green" },
                    { label: "TIER", value: user.tier, color: "text-electric-blue" },
                    { label: "ACTIONS", value: (user.actions?.length || 0).toString(), color: "text-axiom-purple" },
                    { label: "TRUST", value: `${Math.min(100, Math.floor((user.xp / 1000) * 100))}%`, color: "text-neon-green" },
                  ].map((stat) => (
                    <div key={stat.label} className="bento-card p-4 text-center">
                      <span className="text-[9px] font-mono text-gray-500 block">{stat.label}</span>
                      <span className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Agent Provisioning */}
                <div className="bento-card p-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <h3 className="text-sm font-bold text-white font-mono">AGENT PROVISIONING</h3>
                    <span className="text-[9px] font-mono text-gray-500">1 slot per user</span>
                  </div>

                  {agentStatus && (
                    <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-3 text-xs font-mono text-neon-green mb-4">
                      {agentStatus}
                    </div>
                  )}

                  {user.agent ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white">{user.agent.name}</span>
                        <span className={`ml-2 text-[9px] font-mono px-2 py-0.5 rounded ${
                          user.agent.status === "active"
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}>
                          {user.agent.status.toUpperCase()}
                        </span>
                      </div>
                      <button onClick={handleToggleAgent} className="btn-ghost text-[10px]">
                        {user.agent.status === "active" ? "PAUSE" : "ACTIVATE"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">No agent provisioned</span>
                      <button onClick={handleProvisionAgent} className="btn-primary text-[10px]">
                        PROVISION AGENT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Tab */}
            {activeTab === "actions" && (
              <div className="flex flex-col gap-6">
                <div className="bento-card p-6">
                  <h3 className="text-sm font-bold text-white font-mono mb-4">EARN XP</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: "twitter", label: "CONNECT TWITTER", xp: 50 },
                      { id: "discord", label: "CONNECT DISCORD", xp: 50 },
                      { id: "github", label: "CONNECT GITHUB", xp: 50 },
                      { id: "google", label: "CONNECT GOOGLE", xp: 50 },
                      { id: "identity", label: "VERIFY IDENTITY", xp: 100 },
                      { id: "daily_pow", label: "DAILY PROOF OF WORK", xp: 25 },
                      { id: "wallet_age", label: "WALLET AGE BONUS", xp: 100 },
                      { id: "crypto_wallet", label: "CONNECT CRYPTO WALLET", xp: 150 },
                    ].map((action) => {
                      const claimed = isClaimed(action.id);
                      return (
                        <div key={action.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-neon-green/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              claimed ? "bg-neon-green/20 text-neon-green" : "bg-white/5 text-gray-400"
                            }`}>
                              {claimed ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-mono text-white">{action.label}</span>
                              <span className="text-[10px] font-mono text-neon-green ml-2">+{action.xp} XP</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleClaim(action.id)}
                            disabled={claimed || !!claiming}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                              claimed
                                ? "text-neon-green border border-neon-green/20 bg-neon-green/5"
                                : "text-white border border-white/20 hover:border-neon-green hover:text-neon-green"
                            }`}
                          >
                            {claiming === action.id ? "..." : claimed ? "DONE" : "CLAIM"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Tab */}
            {activeTab === "terminal" && (
              <div className="bento-card p-6 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#ff4444]" />
                      <div className="w-2 h-2 rounded-full bg-[#ffdd00]" />
                      <div className="w-2 h-2 rounded-full bg-neon-green" />
                    </div>
                    <span className="text-xs font-mono text-gray-400">console@axiomid</span>
                  </div>
                  <button onClick={() => setLogs([])} className="text-[9px] font-mono text-gray-500 hover:text-white">
                    CLEAR
                  </button>
                </div>

                <div className="flex-1 bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[400px] text-neon-green/90">
                  <div className="flex flex-col gap-1.5">
                    {logs.map((log, i) => (
                      <div key={i} className="whitespace-pre-wrap">{log}</div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

                <form onSubmit={handleCommand} className="flex gap-2 mt-3">
                  <span className="font-mono text-xs text-neon-green py-2">{">"}</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Type 'help' for commands..."
                    className="flex-1 bg-white/5 border border-white/5 focus:border-neon-green/30 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </form>
              </div>
            )}

            {/* Marketplace Tab */}
            {activeTab === "marketplace" && (
              <div className="flex flex-col gap-6">
                <div className="bento-card p-6">
                  <h3 className="text-sm font-bold text-white font-mono mb-4">SKILL MARKETPLACE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(skillsData.skills || []).slice(0, 6).map((skill: any) => (
                      <div key={skill.name} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-neon-green/20 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xs font-bold text-white capitalize">{skill.name.replace(/-/g, " ")}</h4>
                          <span className="text-[10px] font-mono text-axiom-gold">
                            {skill.price_usdc ? `${(parseFloat(skill.price_usdc) * 10).toFixed(1)} π` : "1.0 π"}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-3">{skill.description}</p>
                        <button className="w-full px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 text-[10px] font-mono text-neon-green hover:bg-neon-green hover:text-black transition-all">
                          FORGE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-[9px] font-mono text-gray-600 flex justify-between">
        <span>&copy; 2026 AxiomID</span>
        <span>{user ? `${user.tier} Tier` : "Visitor"}</span>
      </footer>
    </div>
  );
}
