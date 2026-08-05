"use client";

import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Bot, Users, Ticket, Zap } from "lucide-react";
import nextDynamic from "next/dynamic";
const NetworkGraph = nextDynamic(() => import("@/components/ui/NetworkGraph"), { ssr: false });
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Tier } from "@/lib/tiers";
import { ExplorerSkeleton } from "@/components/skeletons/ExplorerSkeleton";

export const dynamic = 'force-dynamic';


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

  const { data, isLoading, error, refetch } = useQuery<ExplorerData>({
    queryKey: ["explorer"],
    queryFn: async () => {
      const res = await fetch("/api/explorer");
      if (!res.ok) throw new Error("Failed to fetch explorer datasets");
      return res.json();
    },
    refetchInterval: 15000,
  });

  return (
    <main className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      <Header showBack />

      {/* Hero Banner — Glassmorphism */}
      <div className="max-w-6xl mx-auto px-4 mt-6 relative z-10">
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-electric-blue/10 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="relative z-10">
            <span className="stitch-badge mb-3">PROTOCOL EXPLORER</span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-surface">
              {language === "en" ? "Live Identity Ledger" : "مستكشف الهوية المباشر"}
            </h1>
            <p className="text-xs sm:text-sm text-faint mt-1 max-w-xl">
              {language === "en" 
                ? "Audit the cryptographic state of registered agents, verifiable credentials, and decentralized identifiers anchored to the Stellar and Pi networks."
                : "تحقق من الحالة التشفيرية للعملاء المسجلين والشهادات القابلة للتحقق والهويات اللامركزية المرتبطة بشبكتي Stellar و Pi."}
            </p>
          </div>
          <div className="flex-shrink-0 glass-card px-4 py-2 rounded-xl text-[10px] font-mono text-faint relative z-10">
            NETWORK STATUS: <span className="text-neon-green font-bold">ONLINE</span>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6">
            <ExplorerSkeleton />
          </div>
        ) : error ? (
          <div className="text-center py-20 mt-10 bento-card">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Unable to Fetch Explorer Data</h3>
            <p className="text-xs text-faint font-mono mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="btn-primary px-4 py-2 text-xs font-mono"
            >
              RETRY
            </button>
          </div>
        ) : data && data.stats.registeredUsers === 0 ? (
          <div className="text-center py-20 mt-10 glass-card">
            <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 border border-electric-blue/20">
              <Bot className="w-7 h-7 text-electric-blue" />
            </div>
            <h3 className="text-sm font-bold text-surface mb-1">{language === "en" ? "No Agents Registered Yet" : "لم يتم تسجيل عملاء بعد"}</h3>
            <p className="text-xs text-faint font-mono max-w-sm mx-auto">
              {language === "en" 
                ? "The protocol is live. Be the first pioneer to register an agent and appear on the explorer."
                : "البروتوكول مباشر. كن أول رائد يسجل عميلاً ويظهر على المستكشف."}
            </p>
            <a href="/dashboard" className="inline-flex items-center gap-2 mt-4 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all">
              {language === "en" ? "Launch App" : "ابدأ الآن"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
          </div>
        ) : data ? (
          <>
            {/* Live Stats Row — Glassmorphism */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: t("stat_users"), value: data.stats.registeredUsers, icon: <Users className="w-5 h-5 text-electric-blue" />, color: "blue" },
                { label: t("stat_agents"), value: data.stats.totalAgents, icon: <Bot className="w-5 h-5 text-emerald-400" />, color: "green" },
                { label: t("total_xp"), value: data.stats.totalXpEarned, icon: <Ticket className="w-5 h-5 text-purple-400" />, color: "purple" },
                { label: t("stat_tx"), value: data.stats.totalPayments, icon: <Zap className="w-5 h-5 text-amber-400" />, color: "amber" },
              ].map((stat) => (
                <div key={stat.label} className={`stat-card-glow ${stat.color} glass-card p-5 flex items-center gap-4`}>
                  <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center border border-white/[0.06]">
                    {stat.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-faint uppercase tracking-wider block">{stat.label}</span>
                    <h3 className="text-lg font-bold font-mono text-surface mt-0.5">
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
                  <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-4">
                    {language === "en" ? "Identity Tier Distribution" : "توزيع طبقات الهوية"}
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
                            <span className="text-faint">{item.count} ({Math.round(percent)}%)</span>
                          </div>
                          <div className="h-1 bg-glass rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Payments Ledger */}
                <div className="bento-card p-5">
                  <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-4">
                    {language === "en" ? "Recent Payments Ledger" : "سجل المدفوعات الأخيرة"}
                  </h3>
                  {data.recentPayments.length > 0 ? (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {data.recentPayments.map((pay) => (
                        <div key={pay.id} className="flex justify-between items-center p-2 rounded-lg border border-glass bg-white/[0.01]">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-white block truncate">
                              @{pay.user.piUsername || pay.user.walletAddress.slice(0, 10)}
                            </span>
                            <span className="text-[8px] font-mono text-faint block truncate">
                              {pay.memo || "Gas Fee Payment"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                              +{pay.amount} PI
                            </span>
                            <span className="text-[8px] font-mono text-faint" suppressHydrationWarning>
                              {new Date(pay.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs font-mono text-zinc-600">
                      {language === "en" ? "No payments found on ledger" : "لم يتم العثور على مدفوعات في السجل"}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
