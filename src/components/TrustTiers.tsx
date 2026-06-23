"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface TierInfo {
  name: string;
  xp: string;
  letter: string;
  color: string;
  desc: string;
  perks: string[];
}

const tiers: TierInfo[] = [
  {
    name: "Explorer",
    xp: "0",
    letter: "E",
    color: "#64748b",
    desc: "Connect your wallet to begin",
    perks: ["Basic DID Passport", "Community access", "Protocol explorer"],
  },
  {
    name: "Citizen",
    xp: "100",
    letter: "C",
    color: "#00ff41",
    desc: "Social verification + actions",
    perks: ["Marketplace access", "Agent deployment", "KYA verification", "XP rewards"],
  },
  {
    name: "Guardian",
    xp: "500",
    letter: "G",
    color: "#00d4ff",
    desc: "KYC verified identity",
    perks: ["Revenue share", "Governance voting", "Priority support", "Custom stamps"],
  },
  {
    name: "Sovereign",
    xp: "1000",
    letter: "S",
    color: "#a855f7",
    desc: "Full protocol control",
    perks: ["Full delegation", "Custom agents", "Protocol governance", "Maximum trust score"],
  },
];

/**
 * Interactive trust tier cards — click to expand and see perks.
 */
export default function TrustTiers() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiers.map((tier) => (
        <button
          key={tier.name}
          onClick={() => setExpanded(expanded === tier.name ? null : tier.name)}
          className="text-center group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer text-left"
          style={{
            borderColor: expanded === tier.name ? `${tier.color}30` : undefined,
            boxShadow: expanded === tier.name ? `0 0 20px ${tier.color}08` : undefined,
          }}
        >
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center border transition-all duration-300"
            style={{
              borderColor: `${tier.color}20`,
              background: `${tier.color}08`,
              color: tier.color,
            }}
          >
            <span className="font-bold text-lg font-mono">{tier.letter}</span>
          </div>

          <h4 className="text-sm font-bold text-white mb-1">{tier.name}</h4>
          <span className="text-[11px] font-mono block mb-2" style={{ color: tier.color }}>
            {tier.xp} XP
          </span>
          <p className="text-[11px] text-zinc-500 leading-relaxed">{tier.desc}</p>

          <div className="mt-3 flex justify-center">
            <ChevronDown
              className="w-4 h-4 text-zinc-600 transition-transform duration-300"
              style={{ transform: expanded === tier.name ? "rotate(180deg)" : undefined }}
            />
          </div>

          {expanded === tier.name && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
              {tier.perks.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: tier.color }} />
                  {perk}
                </div>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
