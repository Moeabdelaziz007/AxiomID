"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bot, Users, Ticket, Zap, ArrowLeft, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
const NetworkGraph = dynamic(() => import("@/components/ui/NetworkGraph"), { ssr: false });
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Tier } from "@/lib/tiers";

interface ExplorerData {
  stats: {
    registeredUsers: number;
    totalAgents: number;
    activeAgents: number;
    totalPayments: number;
    totalXpEarned: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    memo: string | null;
    createdAt: string;
    user: {
      piUsername: string | null;
      walletAddress: string;
    };
  }>;
  activeNodes: Array<{
    id: string;
    piUsername: string | null;
    walletAddress: string;
    did: string | null;
    tier: Tier;
    xp: number;
    agent: {
      name: string;
      status: string;
    } | null;
  }>;
  tierDistribution: {
    Visitor: number;
    Citizen: number;
    Validator: number;
    Sovereign: number;
  };
}

export default function ExplorerPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/explorer");
        if (!res.ok) throw new Error("Failed to fetch explorer datasets");
        const json = await res.json();
        if (active && json) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load explorer data:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();

    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval === null) {
        interval = setInterval(fetchData, 15000);
      }
    };
    const stopPolling = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Only poll while the tab is visible to avoid wasteful background DB load.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <main className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 md:p-6 max-w-6xl mx-auto relative z-10">
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

      {/* Hero Banner */}
      <div className="max-w-6xl mx-auto px-4 mt-6 relative z-10">
        <div className="bento-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-white/[0.02] to-white/[0.01]">
          <div>
            <span className="stitch-badge mb-3">PROTOCOL EXPLORER</span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {language === "en" ? "Live Identity Ledger" : "مستكشف الهوية المباشر"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Audit the cryptographic state of registered agents, verifiable credentials, and decentralized identifiers anchored to the Stellar and Pi networks.
            </p>
          </div>
          <div className="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-mono text-zinc-500">
            NETWORK STATUS: <span className="text-neon-green font-bold">ONLINE</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] mt-10">
            <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
            <p className="text-xs text-zinc-500 font-mono mt-3">Loading live protocol states...</p>
          </div>
        ) : data ? (
          <>
            {/* Live Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: t("stat_users"), value: data.stats.registeredUsers, icon: <Users className="w-5 h-5 text-electric-blue" /> },
                { label: t("stat_agents"), value: data.stats.totalAgents, icon: <Bot className="w-5 h-5 text-emerald-400" /> },
                { label: t("total_xp"), value: data.stats.totalXpEarned, icon: <Ticket className="w-5 h-5 text-purple-400" /> },
                { label: t("stat_tx"), value: data.stats.totalPayments, icon: <Zap className="w-5 h-5 text-amber-400" /> },
              ].map((stat) => (
                <div key={stat.label} className="bento-card p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {stat.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">{stat.label}</span>
                    <h3 className="text-lg font-bold font-mono text-white mt-0.5">
                      <AnimatedCounter target={stat.value} duration={1000} />
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              {/* SVG Node Graph */}
              <div className="lg:col-span-7">
                <NetworkGraph nodes={data.activeNodes} />
              </div>

              {/* Recent Ledger + Tier Distribution */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Tier Distribution Bento */}
                <div className="bento-card p-5">
                  <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
                    Identity Tier Distribution
                  </h3>
                  <div className="space-y-3">
                    {[
                      { tier: "Sovereign", count: data.tierDistribution.Sovereign, color: "#a855f7" },
                      { tier: "Validator", count: data.tierDistribution.Validator, color: "#00d4ff" },
                      { tier: "Citizen", count: data.tierDistribution.Citizen, color: "#00ff41" },
                      { tier: "Visitor", count: data.tierDistribution.Visitor, color: "#64748b" },
                    ].map((item) => {
                      const total = Object.values(data.tierDistribution).reduce((a, b) => a + b, 0) || 1;
                      const percent = (item.count / total) * 100;
                      return (
                        <div key={item.tier}>
                          <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                            <span style={{ color: item.color }} className="font-bold">{item.tier.toUpperCase()}</span>
                            <span className="text-zinc-400">{item.count} ({Math.round(percent)}%)</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Payments Ledger */}
                <div className="bento-card p-5">
                  <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest mb-4">
                    Recent Payments Ledger
                  </h3>
                  {data.recentPayments.length > 0 ? (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {data.recentPayments.map((pay) => (
                        <div key={pay.id} className="flex justify-between items-center p-2 rounded-lg border border-white/5 bg-white/[0.01]">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-white block truncate">
                              @{pay.user.piUsername || pay.user.walletAddress.slice(0, 10)}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500 block truncate">
                              {pay.memo || "Gas Fee Payment"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                              +{pay.amount} PI
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500" suppressHydrationWarning>
                              {new Date(pay.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs font-mono text-zinc-600">
                      No payments found on ledger
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-xs font-mono text-zinc-500 mt-10 bento-card">
            Failed to retrieve real-time network states.
          </div>
        )}
      </div>
    </main>
  );
}
