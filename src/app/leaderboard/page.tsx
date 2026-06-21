"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../context/language-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Trophy, Search, Loader2 } from "lucide-react";
import TopThreeCards from "@/components/ui/TopThreeCards";
import { getTierColor, Tier } from "@/lib/tiers";

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

export default function LeaderboardPage() {
  const { language } = useLanguage();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const active = true;
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Failed to load leaderboard");
        const json = await res.json();
        if (active && json.success) {
          setUsers(json.data.leaderboard);
        }
      } catch (err) {
        console.error("Failed to query leaderboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const usernameMatch = u.piUsername?.toLowerCase().includes(q);
    const walletMatch = u.walletAddress.toLowerCase().includes(q);
    return usernameMatch || walletMatch;
  });

  const topThree = users.slice(0, 3);
  const tableUsers = filteredUsers.filter((u) => u.rank > 3 || search !== "");

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

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] mt-10">
          <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
          <p className="text-xs text-zinc-500 font-mono mt-3">Fetching global standings...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="max-w-4xl mx-auto px-4 mt-10 relative z-10">
          <div className="bento-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Trophy className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Be the First Pioneer</h2>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              The leaderboard is empty. Connect your wallet and start earning XP to claim the #1 spot.
            </p>
            <Link href="/dashboard" className="btn-primary inline-block px-6 py-2 text-sm font-mono">
              ENTER DASHBOARD
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 mt-8 relative z-10 space-y-8">
          
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
              className="w-full bg-[#15171e]/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-electric-blue/30 transition-colors"
            />
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tableUsers.map((user) => {
                    const tierColor = getTierColor(user.tier as Tier);
                    return (
                      <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
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
                      </tr>
                    );
                  })}
                  {tableUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-600 text-xs">
                        No pioneers matched query search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
      <Footer />
    </main>
  );
}
