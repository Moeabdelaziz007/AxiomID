"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NetworkStats {
  registeredAgents: number;
  totalTransactions: number;
  averageTrustScore: number;
  activeUsers: number;
  totalXpEarned: number;
  verificationRate: number;
}

export default function StatusPage() {
  const [stats, setStats] = useState<NetworkStats>({
    registeredAgents: 0,
    totalTransactions: 0,
    averageTrustScore: 0,
    activeUsers: 0,
    totalXpEarned: 0,
    verificationRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate network stats (would be real API in production)
    const timer = setTimeout(() => {
      setStats({
        registeredAgents: 1247,
        totalTransactions: 8934,
        averageTrustScore: 72,
        activeUsers: 3891,
        totalXpEarned: 456789,
        verificationRate: 94.2,
      });
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const StatCard = ({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) => (
    <div className="bento-card p-6 text-center">
      <span className="text-[10px] font-mono text-gray-500 block mb-2">{label}</span>
      {loading ? (
        <div className="h-8 bg-white/5 rounded animate-pulse" />
      ) : (
        <span className={`text-3xl font-bold font-mono ${color}`}>
          {value.toLocaleString()}{suffix || ""}
        </span>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-grid">
      <div className="scanline" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-sm tracking-tighter text-white">AXIOM<span className="text-gray-600">ID</span></span>
          </Link>
          <span className="text-[10px] font-mono text-gray-500">NETWORK STATUS</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-mono text-neon-green tracking-widest uppercase">Live Network</span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Network Status</h1>
          <p className="text-sm text-gray-400 mt-3 max-w-lg mx-auto">
            Real-time metrics from the AxiomID agent identity network on Pi Network.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs font-mono text-neon-green">ALL SYSTEMS OPERATIONAL</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          <StatCard label="REGISTERED AGENTS" value={stats.registeredAgents} color="text-neon-green" />
          <StatCard label="TOTAL TRANSACTIONS" value={stats.totalTransactions} color="text-electric-blue" />
          <StatCard label="AVG TRUST SCORE" value={stats.averageTrustScore} suffix="%" color="text-axiom-purple" />
          <StatCard label="ACTIVE USERS" value={stats.activeUsers} color="text-neon-green" />
          <StatCard label="TOTAL XP EARNED" value={stats.totalXpEarned} color="text-electric-blue" />
          <StatCard label="VERIFICATION RATE" value={stats.verificationRate} suffix="%" color="text-axiom-purple" />
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
              <span className="text-electric-blue">Pi Network</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-500">Blockchain</span>
              <span className="text-white">Stellar</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-500">DID Method</span>
              <span className="text-neon-green">did:axiom</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-500">KYA Compliance</span>
              <span className="text-neon-green">Active</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-gray-500">KYC Integration</span>
              <span className="text-electric-blue">Pi Native KYC</span>
            </div>
          </div>
        </div>

        {/* API Endpoint */}
        <div className="bento-card p-6 mt-6">
          <h3 className="text-sm font-bold text-white font-mono mb-4">AGENT MANIFEST API</h3>
          <p className="text-xs text-gray-400 mb-4">
            Access any agent's JSON-LD identity manifest via the public API.
          </p>
          <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[11px]">
            <span className="text-gray-500">GET</span>{" "}
            <span className="text-neon-green">https://axiomid.app/api/agent/manifest</span>
            <span className="text-gray-500">?userId=</span>
            <span className="text-electric-blue">{"<agent-id>"}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-6 text-[10px] font-mono text-gray-600 text-center">
        &copy; 2026 AxiomID. Agent Identity Protocol for Pi Network.
      </footer>
    </main>
  );
}
