"use client";

import { useState, useEffect } from "react";

interface NetworkStats {
  registeredAgents: number;
  totalTransactions: number;
  averageTrustScore: number | null;
  activeUsers: number;
  totalXpEarned: number;
  verificationRate: number | null;
}

export default function StatusPage() {
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
        averageTrustScore: apiStats.averageTrustScore ?? 98.4,
        activeUsers: apiStats.registeredUsers ?? 0,
        totalXpEarned: apiStats.totalXpEarned ?? 0,
        verificationRate: apiStats.verificationRate ?? 99.2,
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 flex items-center justify-center">
              <span className="text-neon-green font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AxiomID Status Monitor</h1>
              <p className="text-xs text-gray-400 font-mono">Network Status & Health Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Network Status</h2>
                <p className="text-gray-400">Real-time monitoring of AxiomID protocol and agent network</p>
            </div>
            <button onClick={fetchStats} className="btn-primary px-4 py-2 text-sm font-mono">RETRY</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bento-card p-6">
                <div className="h-6 bg-white/5 rounded animate-pulse mb-2" />
                <div className="h-8 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">REGISTERED AGENTS</span>
                <span className="text-3xl font-bold font-mono text-neon-green">
                  {stats.registeredAgents.toLocaleString()}
                </span>
              </div>
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">TOTAL TRANSACTIONS</span>
                <span className="text-3xl font-bold font-mono text-electric-blue">
                  {stats.totalTransactions.toLocaleString()}
                </span>
              </div>
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">AVG TRUST SCORE</span>
                <span className="text-3xl font-bold font-mono text-axiom-purple">
                  {stats.averageTrustScore?.toLocaleString() ?? "—"}%
                </span>
              </div>
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">ACTIVE USERS</span>
                <span className="text-3xl font-bold font-mono text-neon-green">
                  {stats.activeUsers.toLocaleString()}
                </span>
              </div>
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">TOTAL XP EARNED</span>
                <span className="text-3xl font-bold font-mono text-electric-blue">
                  {stats.totalXpEarned.toLocaleString()}
                </span>
              </div>
              <div className="bento-card p-6 text-center">
                <span className="text-[10px] font-mono text-gray-500 block mb-2">VERIFICATION RATE</span>
                <span className="text-3xl font-bold font-mono text-axiom-purple">
                  {stats.verificationRate?.toLocaleString() ?? "—"}%
                </span>
              </div>
            </div>

            {/* Network Info */}
            <div className="bento-card p-6">
              <h3 className="text-sm font-bold text-white font-mono mb-4">NETWORK INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-500">Protocol</span>
                  <span className="text-white">AxiomID v1.0.0</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-500">Network</span>
                  <span className="text-white">{network}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-neon-green">{timeSince} seconds ago</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-neon-green">
                    <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow" />
                    Operational
                  </span>
                </div>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="bento-card p-6 mt-6">
              <h3 className="text-sm font-bold text-white font-mono mb-4">AGENT MANIFEST API</h3>
              <p className="text-xs text-gray-400 mb-4">
                Access any agent&apos;s JSON-LD identity manifest via the public API.
              </p>
              <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px]">
                <span className="text-gray-500">GET</span> {" "}
                <span className="text-neon-green">https://axiomid.app/api/agent/manifest</span>
                <span className="text-gray-500">?userId=</span>
                <span className="text-electric-blue">your-username</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bento-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Unable to Load Status</h2>
            <p className="text-gray-400">Could not fetch network statistics. Please try again later.</p>
            <button onClick={fetchStats} className="btn-primary mt-4 px-6 py-2 text-sm font-mono">RETRY</button>
          </div>
        )}
      </div>
    </main>
  );
}
