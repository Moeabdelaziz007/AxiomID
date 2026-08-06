"use client";

import IntentCompiler from "@/components/landing/IntentCompiler";
import { CurrentMission } from "@/components/landing/CurrentMission";
import { WorkspaceGrid } from "@/components/landing/WorkspaceGrid";
import { RunningAgents } from "@/components/landing/RunningAgents";
import { LiveMemory } from "@/components/landing/LiveMemory";
import { EconomySection } from "@/components/landing/EconomySection";
import { ProofsSection } from "@/components/landing/ProofsSection";
import { SpecStream } from "@/components/landing/SpecStream";
import dynamic from "next/dynamic";

const InteractiveCommandDemo = dynamic(
  () => import("@/components/landing/InteractiveCommandDemo"),
  { ssr: false }
);

export function LazyControlCenter() {
  return (
    <div className="w-full">
      {/* Section spacing */}
      <div className="flex flex-col items-center gap-16 sm:gap-24 px-4 sm:px-6">
        {/* 1 Intent Compiler */}
        <IntentCompiler />

        {/* 2 Current Mission */}
        <CurrentMission />

        {/* 3 Workspace Grid */}
        <WorkspaceGrid />

        {/* 4 Running Agents */}
        <RunningAgents />

        {/* 5 Live Memory */}
        <LiveMemory />

        {/* 6 Execution Timeline (SpecStream) — may be expanded */}
        <SpecStream />

        {/* 7 Proofs */}
        <ProofsSection />

        {/* 8 Economy */}
        <EconomySection />

        {/* 9 Explorer — embedded TUI, reads live system (pai status / pai scry) */}
        <div className="w-full max-w-6xl px-4 sm:px-6 mb-24">
          <InteractiveCommandDemo />
        </div>
      </div>
    </div>
  );
}