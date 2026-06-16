"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Shield, ArrowRight } from "lucide-react";

interface KYAVerificationCardProps {
  kycStatus: string;
  did: string;
  piUsername: string | null;
  onVerify: (username: string) => Promise<void>;
}

export function KYAVerificationCard({ kycStatus, did, piUsername, onVerify }: KYAVerificationCardProps) {
  const [username, setUsername] = useState(piUsername || "");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!username.trim()) return;
    setLoading(true);
    await onVerify(username.trim());
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="bento-card p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-axiom-purple" />
          <div>
            <h3 className="text-sm font-semibold text-white">Identity Verification (KYA)</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Secure your DID document by verifying your credentials.</p>
          </div>
        </div>
        {kycStatus === "VERIFIED" ? (
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 flex items-center gap-1.5">
            VERIFIED <CheckCircle className="w-3 h-3" />
          </span>
        ) : kycStatus === "PENDING" ? (
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1.5">
            PENDING <Clock className="w-3 h-3" />
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-white/5 text-gray-500 border border-white/10">
            UNVERIFIED
          </span>
        )}
      </div>

      {kycStatus === "VERIFIED" ? (
        <div className="p-4 rounded-xl border border-neon-green/20 bg-neon-green/5 text-xs text-gray-300 font-mono space-y-2">
          <p className="text-neon-green font-bold">✓ AxiomID Verification Anchored</p>
          <p>Your identity has been verified and permanently anchored under DID: <span className="text-white">{did}</span></p>
        </div>
      ) : kycStatus === "PENDING" ? (
        <div className="p-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 text-xs text-gray-300 font-mono space-y-2">
          <p className="text-yellow-400 font-bold"><Clock className="w-3 h-3 inline mr-1" /> Verification Pending</p>
          <p>The oracle network is validating your credentials. Advanced tasks will unlock upon approval.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pi Username"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-green/40 font-mono transition-colors"
          />
          <button
            onClick={handleVerify}
            disabled={loading || !username.trim()}
            className="btn-primary text-sm px-5 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 group"
          >
            {loading ? "VERIFYING..." : "VERIFY IDENTITY"}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      )}
    </motion.div>
  );
}
