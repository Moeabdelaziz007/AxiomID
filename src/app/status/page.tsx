"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "../context/language-context";

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
  const { t } = useLanguage();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [timeSince, setTimeSince] = useState<number>(0);
  const network = process.env.NEXT_PUBLIC_NETWORK || "Testnet";
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

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
                <h2 className="text-3xl font-bold text-surface mb-2">{t("status_network_title")}</h2>
                <p className="text-subtle">{t("status_network_desc")}</p>
            </div>
            <button onClick={fetchAll} className="btn-primary px-4 py-2 text-sm font-mono">{t("status_retry")}</button>
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
        ) : stats && stats.registeredAgents === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-electric-blue/10 flex items-center justify-center mx-auto mb-4 border border-electric-blue/20">
              <span className="text-2xl">📡</span>
            </div>
            <h2 className="text-xl font-bold text-surface mb-2">{t("status_no_data")}</h2>
            <p className="text-subtle">{t("status_no_data_desc")}</p>
            <button onClick={fetchAll} className="btn-primary mt-4 px-6 py-2 text-sm font-mono">{t("status_retry")}</button>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 text-center flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neon-green/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_registered_agents")}</span>
                <span className="text-3xl font-bold font-mono text-neon-green relative z-10">
                  {stats.registeredAgents.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2 relative z-10">{t("status_active_onchain")}</span>
              </div>
              <div className="glass-card p-6 text-center flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-electric-blue/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_total_transactions")}</span>
                <span className="text-3xl font-bold font-mono text-electric-blue relative z-10">
                  {stats.totalTransactions.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2 relative z-10">{t("status_pi_payments")}</span>
              </div>
              <div className="glass-card p-6 text-center flex flex-col items-center justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-axiom-purple/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_avg_trust")}</span>
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
                <span className="text-[9px] font-mono text-zinc-500 mt-2">{t("status_network_safety")}</span>
              </div>
              <div className="glass-card p-6 text-center flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-neon-green/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_active_agents")}</span>
                <span className="text-3xl font-bold font-mono text-neon-green relative z-10">
                  {stats.activeAgents.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2 relative z-10">{t("status_executing_loops")}</span>
              </div>
              <div className="glass-card p-6 text-center flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-electric-blue/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_total_xp")}</span>
                <span className="text-3xl font-bold font-mono text-electric-blue relative z-10">
                  {stats.totalXpEarned.toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-2 relative z-10">{t("status_accumulated")}</span>
              </div>
              <div className="glass-card p-6 text-center flex flex-col items-center justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-axiom-purple/10 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />
                <span className="text-[10px] font-mono text-faint block mb-2 relative z-10">{t("status_verification_rate")}</span>
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
                <span className="text-[9px] font-mono text-zinc-500 mt-2">{t("status_kyc_index")}</span>
              </div>
            </div>

            {/* Protocol Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 md:col-span-3">
                <h3 className="text-sm font-bold text-surface font-mono mb-4">{t("status_protocol_details")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">{t("status_network")}</span>
                    <span className="text-surface">{network}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">{t("status_version")}</span>
                    <span className="text-surface">{version}</span>
                  </div>
                  <div className="flex justify-between p-2 border-b border-white/5">
                    <span className="text-faint">{t("status_refreshed")}</span>
                    <span className="text-neon-green">{timeSince}{t("status_ago")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Health */}
            {health && (
              <div className="glass-card p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-surface font-mono">{t("status_service_health")}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-faint">{t("status_uptime")}</span>
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
            <div className="glass-card p-6 mt-6">
              <h3 className="text-sm font-bold text-surface font-mono mb-4">{t("status_manifest_api")}</h3>
              <p className="text-xs text-subtle mb-4">
                {t("status_manifest_desc")}
              </p>
              <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px]">
                <span className="text-faint">{t("status_get")}</span> {" "}
                <span className="text-neon-green">https://axiomid.app/api/agent/manifest</span>
                <span className="text-faint">?userId=</span>
                <span className="text-electric-blue">your-username</span>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-surface mb-2">{t("status_unable_load")}</h2>
            <p className="text-subtle">{t("status_could_not_fetch")}</p>
            <button onClick={fetchAll} className="btn-primary mt-4 px-6 py-2 text-sm font-mono">{t("status_retry")}</button>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
