"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../context/language-context";
import { useWallet } from "../context/wallet-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy, Search, ChevronDown } from "lucide-react";
import TopThreeCards from "@/components/ui/TopThreeCards";
import { getTierColor, Tier } from "@/lib/tiers";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';


const PAGE_SIZE = 20;

interface LeaderboardUser {
  rank: number;
  id: string;
  piUsername?: string | null;
  walletAddress: string;
  tier: string;
  xp: number;
  trustScore: number;
  stampsCount: number;
  createdAt: string;
}

const TIER_FILTERS = ["All", "Sovereign", "Validator", "Citizen", "Visitor"];

export default function LeaderboardPage() {
  const { language } = useLanguage();
  const { user } = useWallet();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Failed to load leaderboard");
        const json = await res.json();
        if (active && Array.isArray(json?.leaderboard)) {
          setUsers(json.leaderboard);
        }
      } catch (err) {
        logger.error("Failed to query leaderboard:", err);
        if (active) setError("Failed to load leaderboard");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const usernameMatch = u.piUsername?.toLowerCase().includes(q);
    const walletMatch = u.walletAddress.toLowerCase().includes(q);
    const tierMatch = tierFilter === "All" || u.tier === tierFilter;
    return (usernameMatch || walletMatch) && tierMatch;
  });

  const allDemoUsers = users.length > 0 && users.every((u) => u.xp === 0 && !u.piUsername);
  const topThree = users.slice(0, 3);
  const allTableUsers = filteredUsers.filter((u) => u.rank > 3 || search !== "");
  const tableUsers = allTableUsers.slice(0, visibleCount);
  const hasMore = visibleCount < allTableUsers.length;


  return (
    <main className="min-h-screen bg-grid relative pb-20">
      <div className="scanline" />

      <Header showBack />

      {/* Hero Banner */}
      <div className="max-w-4xl mx-auto px-4 mt-6 relative z-10 text-center">
        <span className="stitch-badge">GLOBAL STANDINGS</span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-3 flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          {language === "en" ? "Sovereign Leaderboard" : "لوحة الصدارة العامة"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl mx-auto leading-relaxed">
          Pioneers sorted by global Experience Points (XP) earned from social verifications, transaction validation activity, and oracle stamp binding.
        </p>
      </div>

      {/* Your Rank Sticky Bar */}
      {user && !loading && users.length > 0 && (() => {
        const myRank = users.find((u) => u.id === user.id);
        if (!myRank) return null;
        const nextUser = users.find((u) => u.rank === myRank.rank - 1);
        const xpToNext = nextUser ? nextUser.xp - myRank.xp : 0;
        return (
          <div className="max-w-4xl mx-auto px-4 mt-4 relative z-20">
            <div className="sticky top-16 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
                  #{myRank.rank}
                </span>
                <span className="text-xs font-mono text-emerald-300 font-semibold">
                  {language === "ar" ? "مرتبتك" : "Your Rank"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400/70">
                <span>{myRank.xp.toLocaleString()} XP</span>
                {xpToNext > 0 && (
                  <span className="text-emerald-500/50">• {xpToNext.toLocaleString()} XP {language === "ar" ? "للمرتبة التالية" : "to next rank"}</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {error && !loading && (
        <div className="max-w-4xl mx-auto px-4 mt-10 relative z-10">
          <div className="glass-card p-12 text-center">
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs font-mono text-electric-blue hover:underline focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:ring-offset-2 focus:ring-offset-[#0a0b0f] rounded transition-all">
              {language === "en" ? "Retry" : "إعادة المحاولة"}
            </button>
          </div>
        </div>
      )}

      {!error && loading ? (
        <div className="max-w-4xl mx-auto px-4 mt-10 space-y-6 animate-pulse">
          {/* Top three skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bento-card p-6 flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="h-3 w-24 bg-white/5 rounded" />
                <div className="h-2 w-16 bg-white/5 rounded" />
                <div className="h-4 w-20 bg-white/5 rounded" />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="bento-card overflow-hidden border border-white/5 bg-[#101217]/80">
            <div className="p-4 border-b border-white/5 bg-white/[0.01]">
              <div className="h-2 w-40 bg-white/5 rounded" />
            </div>
            <div className="divide-y divide-white/5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center py-3 px-4 gap-4">
                  <div className="w-8 h-2 bg-white/5 rounded" />
                  <div className="w-8 h-8 rounded-full bg-white/5" />
                  <div className="h-2 w-32 bg-white/5 rounded" />
                  <div className="h-2 w-16 bg-white/5 rounded ml-auto" />
                  <div className="h-2 w-12 bg-white/5 rounded" />
                  <div className="h-2 w-12 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? null : users.length === 0 ? (
        <div className="max-w-4xl mx-auto px-4 mt-10 relative z-10">
          <div className="glass-card p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{language === "en" ? "Be the First Sovereign" : "كن السيادي الأول"}</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {language === "en" 
                ? "The leaderboard is empty. Connect your wallet and start earning XP to claim the #1 spot and become the first Sovereign."
                : "لوحة الصدارة فارغة. اربط محفظتك وابدأ في كسب نقاط الخبرة لاحتلال المرتبة الأولى وتصبح السيادي الأول."}
            </p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all">
              {language === "en" ? "Launch App" : "ابدأ الآن"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 mt-8 relative z-10 space-y-8">

          {allDemoUsers && (
            <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-sm text-center">
              <p className="text-xs font-mono text-amber-300">
                {language === "en" ? "🚀 AxiomID is in beta — be the first pioneer to claim your passport." : "🚀 AxiomID في مرحلة البيتا — كن أول رائد يحصل على جواز سفره."}
              </p>
            </div>
          )}

          {/* Top Three Cards Podium (Only show if search is empty to maintain clean UI) */}
          {search === "" && topThree.length > 0 && (
            <TopThreeCards users={topThree} />
          )}

          {/* Search bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder={language === "en" ? "Search handle or address..." : "ابحث عن اسم مستخدم أو عنوان..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-card border border-white/[0.06] rounded-xl py-3 pl-10 pr-4 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-electric-blue/30 transition-colors"
            />
          </div>

          {/* Tier Filter Tabs */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {TIER_FILTERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                  tierFilter === tier
                    ? "bg-electric-blue/20 text-electric-blue border border-electric-blue/30"
                    : "text-zinc-500 border border-white/[0.04] hover:border-white/[0.08] hover:text-zinc-300"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Remaining Ranks Table */}
          <div className="bento-card overflow-hidden border border-white/5 bg-[#101217]/80">
            <div className="p-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <span>{language === "en" ? "PIONEER REGISTRY" : "سجل رواد البروتوكول"}</span>
              <span>{tableUsers.length} FOUND</span>
            </div>
            
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left font-mono text-xs select-none">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-zinc-500 bg-white/[0.005]">
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">PIONEER</th>
                    <th className="py-3 px-4 text-center">TIER</th>
                    <th className="py-3 px-4 text-center">STAMPS</th>
                    <th className="py-3 px-4 text-center">TRUST</th>
                    <th className="py-3 px-4 text-right">XP</th>
                    <th className="py-3 px-4 text-right sr-only">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tableUsers.map((user) => {
                    const tierColor = getTierColor(user.tier as Tier);
                    const borderColor = tierColor;
                    return (
                      <tr key={user.id} className="group relative hover:bg-white/[0.02] transition-all hover:scale-[1.005] hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]" style={{ borderLeft: `3px solid ${borderColor}` }}>
                        <td className="py-3 px-4 text-center font-bold text-zinc-400">
                          {user.rank}
                        </td>
                        <td className="py-3 px-4">
                          <Link 
                            href={`/passport/${user.piUsername || user.walletAddress}`} 
                            className="text-white hover:text-electric-blue transition-colors font-bold"
                          >
                            @{user.piUsername || `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}`}
                          </Link>
                          <span className="text-[9px] text-zinc-500 block truncate max-w-[200px] mt-0.5">
                            {user.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span 
                            className="px-2 py-0.5 rounded text-[9px] border font-bold uppercase"
                            style={{ color: tierColor, borderColor: `${tierColor}30`, background: `${tierColor}10` }}
                          >
                            {user.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-zinc-300">
                          {user.stampsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400">
                          {user.trustScore}%
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-neon-green">
                          {user.xp.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/passport/${user.piUsername || user.walletAddress}`}
                            className="text-[9px] font-mono text-electric-blue hover:text-electric-blue/80 transition-colors"
                          >
                            {language === "ar" ? "عرض الجواز" : "View Passport"} →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {tableUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-zinc-600 text-xs">
                        No pioneers matched query search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-white/5 flex justify-center">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono text-zinc-400 border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all"
                >
                  {language === "ar" ? "عرض 20 المزيد" : "Show 20 more"}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      )}
      <Footer />
    </main>
  );
}
