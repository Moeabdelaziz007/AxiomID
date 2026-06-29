"use client";

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface TimelineItem {
  phase: string;
  title: string;
  desc: string;
  status: "completed" | "active" | "future";
  items: string[];
}

export default function RoadmapTimeline() {
  const items: TimelineItem[] = [
    {
      phase: "PHASE 1",
      title: "Core Trust Protocol",
      desc: "Establish sovereign identities and cryptographically secure credentials.",
      status: "active",
      items: ["Stellar & Pi Wallet integration", "Sovereign DID method registry", "ZKP human-verifiable proofs"],
    },
    {
      phase: "PHASE 2",
      title: "Agent Passport System",
      desc: "Provision customizable autonomous agent cards that represent human delegators.",
      status: "active",
      items: ["Passport credential stamps board", "Dynamic identity progression & tiers", "Pi Browser compliance sandbox"],
    },
    {
      phase: "PHASE 3",
      title: "Marketplace & Tooling",
      desc: "Enable third-party developers to upload, secure, and monetize agent skills.",
      status: "active",
      items: ["Genomic skills repository", "E2E automated sandbox script validation", "Confined runtime playground"],
    },
    {
      phase: "PHASE 4",
      title: "Decentralized Governance",
      desc: "Delegate system adjustments and authority governance to sovereign token holders.",
      status: "future",
      items: ["Sovereign voting DAO consensus", "Trust circle validation delegation", "Inter-agent payment clearing"],
    },
  ];

  return (
    <div className="relative border-l border-white/5 ml-4 pl-6 space-y-8 my-10">
      {items.map((item, index) => {
        const isCompleted = item.status === "completed";
        const isActive = item.status === "active";
        
        return (
          <div key={index} className="relative group">
            {/* Timeline bullet indicator */}
            <div className="absolute -left-[35px] top-1 z-10 flex items-center justify-center bg-[#10131a]">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 filter drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" />
              ) : isActive ? (
                <div className="w-5 h-5 rounded-full border-2 border-electric-blue flex items-center justify-center animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-electric-blue" />
                </div>
              ) : (
                <Circle className="w-5 h-5 text-zinc-600" />
              )}
            </div>

            {/* Content card */}
            <div 
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                isCompleted 
                  ? "border-emerald-500/10 bg-emerald-500/[0.01] hover:border-emerald-500/20" 
                  : isActive 
                    ? "border-electric-blue/20 bg-electric-blue/[0.02] shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:border-electric-blue/30"
                    : "border-white/5 bg-white/[0.005] hover:border-white/10"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span 
                  className={`text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded ${
                    isCompleted 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : isActive 
                        ? "bg-electric-blue/15 text-electric-blue"
                        : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {item.phase}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {isCompleted ? "Completed" : isActive ? "Active Development" : "Future Goal"}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono mt-3">{item.title}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>

              {/* Sub items checklist */}
              <ul className="mt-4 space-y-2 border-t border-white/5 pt-4 text-[11px] font-mono text-zinc-500">
                {item.items.map((sub, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={isCompleted ? "text-emerald-400" : isActive ? "text-electric-blue" : "text-zinc-600"}>
                      {isCompleted ? "✓" : "•"}
                    </span>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
