"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ServiceCheck {
  name: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number;
}

interface HealthData {
  status: string;
  uptime: number;
  services: ServiceCheck[];
  timestamp: string;
}

interface NetworkStats {
  registeredAgents: number;
  totalTransactions: number;
  averageTrustScore: number | null;
  activeAgents: number;
  totalXpEarned: number;
  verificationRate: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  ONLINE: "text-neon-green",
  DEGRADED: "text-amber-400",
  OFFLINE: "text-red-400",
};

const STATUS_BG: Record<string, string> = {
  ONLINE: "bg-neon-green/10 border-neon-green/20",
  DEGRADED: "bg-amber-400/10 border-amber-400/20",
  OFFLINE: "bg-red-400/10 border-red-400/20",
};

/**
 * Displays a real-time network status dashboard with AxiomID protocol metrics and service health.
 */
export default function StatusPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [timeSince, setTimeSince] = useState<number>(0);
  const network = process.env.NEXT_PUBLIC_NETWORK || "Testnet";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, healthRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/health"),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const s = statusData.stats || {};
        setStats({
          registeredAgents: s.totalAgents ?? 0,
          totalTransactions: s.totalPayments ?? 0,
          averageTrustScore: s.averageTrustScore ?? null,
          activeAgents: s.activeAgents ?? 0,
          totalXpEarned: s.totalXpEarned ?? 0,
          verificationRate: s.verificationRate ?? null,
        });
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      setLastFetchTime(Date.now());
      setTimeSince(0);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
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

      <Header showBack />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-3xl font-bold text-surface mb-2">Network Status</h2>
                <p className="text-subtle">Real-time monitoring of AxiomID protocol and agent network</p>
            </div>
            <button onClick={fetchAll} className="btn-primary px-4 py-2 text-sm font-mono">RETRY</button>
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
                      stroke="#22c55e"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (stats.verificationRate ?? 0) / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold font-mono text-white">{stats.verificationRate ?? "—"}%</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-2">KYC success index</span>
              </div>
            </div>

            {/* Protocol Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bento-card p-6 md:col-span-3">
                <h3 className="text-sm font-bold text-surface font-mono mb-4">PROTOCOL DETAILS</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">Network</span>
                    <span className="text-surface">{network}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">Version</span>
                    <span className="text-surface">1.0.0</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">Refreshed</span>
                    <span className="text-neon-green">{timeSince}s ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Health */}
            {health && (
              <div className="bento-card p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-surface font-mono">SERVICE HEALTH</h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-faint">UPTIME</span>
                    <span className="text-neon-green font-bold">{health.uptime}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {health.services.map((service) => (
                    <div
                      key={service.name}
                      className={`p-3 rounded-xl border ${STATUS_BG[service.status]}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-surface">{service.name}</span>
                        <span className={`text-[9px] font-mono font-bold ${STATUS_COLORS[service.status]}`}>
                          {service.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {service.latencyMs > 0 ? `${service.latencyMs}ms` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <button onClick={fetchAll} className="btn-primary mt-4 px-6 py-2 text-sm font-mono">RETRY</button>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
