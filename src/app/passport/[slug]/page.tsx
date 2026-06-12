"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AgentPassport } from "@/components/AgentPassport";
import { AgentQR } from "@/components/AgentQR";
import Link from "next/link";

interface PassportData {
  username: string;
  walletAddress: string;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  issuedDate: string;
  agentName: string | null;
  agentStatus: string | null;
}

export default function PassportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/passport/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Passport not found");
        }
        return res.json();
      })
      .then((data) => {
        setPassport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load passport");
        setLoading(false);
      });
  }, [slug]);

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />

      <header className="w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-sm tracking-tighter text-white">
              AXIOM<span className="text-gray-600">ID</span>
            </span>
          </Link>
          <span className="text-[10px] font-mono text-gray-500">AGENT PASSPORT</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        {loading ? (
          <div className="w-full max-w-lg">
            <div className="passport-card p-6 animate-pulse">
              <div className="h-6 bg-white/5 rounded mb-4 w-1/3" />
              <div className="h-24 bg-white/5 rounded mb-4" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Passport Not Found</h2>
            <p className="text-gray-400 mb-8">{error}</p>
            <Link href="/" className="btn-primary text-xs">
              CREATE YOUR PASSPORT
            </Link>
          </div>
        ) : passport ? (
          <>
            <AgentPassport
              username={passport.username}
              walletAddress={passport.walletAddress}
              tier={passport.tier as "Visitor" | "Citizen" | "Validator" | "Sovereign"}
              trustScore={passport.trustScore}
              kyaStatus={passport.kyaStatus}
              kycStatus={passport.kycStatus}
              issuedDate={passport.issuedDate}
              did={passport.did}
              xp={passport.xp}
              agentName={passport.agentName || undefined}
              agentStatus={passport.agentStatus || undefined}
            />

            <div className="mt-8">
              <AgentQR did={passport.did} walletAddress={passport.walletAddress} />
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 mb-4">
                This passport is verified by AxiomID Protocol
              </p>
              <Link href="/" className="btn-primary text-xs">
                CREATE YOUR PASSPORT
              </Link>
            </div>
          </>
        ) : null}
      </div>

      <footer className="w-full border-t border-white/5 py-4 px-6 text-[9px] font-mono text-gray-600 text-center">
        &copy; 2026 AxiomID. Agent Identity Protocol.
      </footer>
    </main>
  );
}
