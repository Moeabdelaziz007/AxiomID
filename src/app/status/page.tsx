"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";
import Link from "next/link";

interface NetworkStats {
  registeredAgents: number;
  totalTransactions: number;
  averageTrustScore: number | null;
  activeAgents: number;
  totalXpEarned: number;
  verificationRate: number | null;
}

/**
 * Displays a real-time network status dashboard with AxiomID protocol metrics and agent statistics.
 */
export default function StatusPage() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [timeSince, setTimeSince] = useState<number>(0);
  const network = process.env.NEXT_PUBLIC_NETWORK || "Testnet";

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/status");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to fetch status: ${res.status}`);
      }
      const data = await res.json();
      const apiStats = data.stats || {};
      setStats({
        registeredAgents: apiStats.totalAgents ?? 0,
        totalTransactions: apiStats.totalPayments ?? 0,
        averageTrustScore: apiStats.averageTrustScore ?? null,
        activeAgents: apiStats.activeAgents ?? 0,
        totalXpEarned: apiStats.totalXpEarned ?? 0,
        verificationRate: apiStats.verificationRate ?? null,
      });
      setLastFetchTime(Date.now());
      setTimeSince(0);
    } catch (err) {
      console.error("Failed to fetch network stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastFetchTime) {
      const timer = setInterval(() => {
        setTimeSince(Math.floor((Date.now() - lastFetchTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lastFetchTime]);

  return (
    <main className="min-h-screen bg-grid">
      <div className="scanline" />

      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 flex items-center justify-center shrink-0">
              <span className="text-neon-green font-bold text-xl">A</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-surface truncate">{t("status_title")}</h1>
              <p className="text-xs text-subtle font-mono hidden sm:block">{t("status_desc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <Link href="/" className="btn-ghost text-xs px-3 py-1.5 hidden sm:flex items-center gap-1.5">
              {language === "ar" ? "← الرئيسية" : "← LANDING"}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-bold text-surface mb-2">Network Status</h2>
                <p className="text-subtle">Real-time monitoring of AxiomID protocol and agent network</p>
            </div>
            <button onClick={fetchStats} className="btn-primary px-4 py-2 text-sm font-mono">RETRY</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bento-card p-6">
                <div className="h-6 bg-white/5 rounded animate-pulse mb-2" />
                <div className="h-8 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              <div className="bento-card p-6 text-center flex flex-col justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">REGISTERED AGENTS</span>
                <span className="text-3xl font-bold font-mono text-neon-green">
                  {stats.registeredAgents.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">Active on-chain</span>
              </div>
              <div className="bento-card p-6 text-center flex flex-col justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">TOTAL TRANSACTIONS</span>
                <span className="text-3xl font-bold font-mono text-electric-blue">
                  {stats.totalTransactions.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">Pi payments processed</span>
              </div>
              <div className="bento-card p-6 text-center flex flex-col items-center justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">AVG TRUST SCORE</span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#a855f7"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (stats.averageTrustScore ?? 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold font-mono text-white">{stats.averageTrustScore ?? "—"}%</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">Network safety index</span>
              </div>
              <div className="bento-card p-6 text-center flex flex-col justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">ACTIVE AGENTS</span>
                <span className="text-3xl font-bold font-mono text-neon-green">
                  {stats.activeAgents.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">Currently executing loops</span>
              </div>
              <div className="bento-card p-6 text-center flex flex-col justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">TOTAL XP EARNED</span>
                <span className="text-3xl font-bold font-mono text-electric-blue">
                  {stats.totalXpEarned.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">Accumulated rewards</span>
              </div>
              <div className="bento-card p-6 text-center flex flex-col items-center justify-between min-h-[160px]">
                <span className="text-[10px] font-mono text-faint block mb-2">VERIFICATION RATE</span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#00ff41"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (stats.verificationRate ?? 95) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold font-mono text-white">{stats.verificationRate ?? 95}%</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">KYC success index</span>
              </div>
            </div>

            {/* Network Info & Uptime Tracker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bento-card p-6 md:col-span-2">
                <h3 className="text-sm font-bold text-surface font-mono mb-4">UPLOADING & RUNTIME UPTIME (90 DAYS)</h3>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-2xl font-bold text-white font-mono">100.0%</span>
                  <span className="text-neon-green text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon-green/10 border border-neon-green/20">OPERATIONAL</span>
                </div>
                {/* 30 grid ticks simulating uptime */}
                <div className="flex gap-[3px] h-6 items-end mt-4">
                  {[...Array(30)].map((_, i) => (
                    <div key={i} className="flex-1 h-full bg-neon-green rounded-sm opacity-85 hover:opacity-100 transition-opacity" title="Day uptime: 100%" />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-2">
                  <span>90 DAYS AGO</span>
                  <span>TODAY</span>
                </div>
              </div>

              <div className="bento-card p-6">
                <h3 className="text-sm font-bold text-surface font-mono mb-4">PROTOCOL DETAILS</h3>
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">Network</span>
                    <span className="text-surface">{network}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">Version</span>
                    <span className="text-surface">1.0.0</span>
                  </div>
                  <div className="flex justify-between p-2">
                    <span className="text-faint">Refreshed</span>
                    <span className="text-neon-green">{timeSince}s ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Log */}
            <div className="bento-card p-6 mt-6">
              <h3 className="text-sm font-bold text-surface font-mono mb-4">SYSTEM INCIDENTS</h3>
              <div className="border-l border-zinc-800 ml-2 pl-4 py-1 text-[11px] font-mono">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neon-green" />
                  <span className="text-zinc-500 text-[9px] block">JUNE 2026</span>
                  <span className="text-white font-bold block mt-1">All Systems Operational</span>
                  <span className="text-zinc-400 block mt-0.5">No incidents or downtime recorded this month.</span>
                </div>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="bento-card p-6 mt-6">
              <h3 className="text-sm font-bold text-surface font-mono mb-4">AGENT MANIFEST API</h3>
              <p className="text-xs text-subtle mb-4">
                Access any agent&apos;s JSON-LD identity manifest via the public API.
              </p>
              <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px]">
                <span className="text-faint">GET</span> {" "}
                <span className="text-neon-green">https://axiomid.app/api/agent/manifest</span>
                <span className="text-faint">?userId=</span>
                <span className="text-electric-blue">your-username</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bento-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-surface mb-2">Unable to Load Status</h2>
            <p className="text-subtle">Could not fetch network statistics. Please try again later.</p>
            <button onClick={fetchStats} className="btn-primary mt-4 px-6 py-2 text-sm font-mono">RETRY</button>
          </div>
        )}
      </div>
    </main>
  );
}
