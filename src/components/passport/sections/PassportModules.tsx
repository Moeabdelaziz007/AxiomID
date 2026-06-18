import React from "react";
import { Eye, Zap } from "lucide-react";
import { MODULE_SLOTS, ModuleSlot } from "../constants";

interface PassportModulesProps {
  activeModules: ModuleSlot[];
}

export function PassportModules({ activeModules }: PassportModulesProps) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-wider font-mono text-neon-green"><Zap className="w-3 h-3 inline me-1" /> SYSTEM MODULES</span>
        <span className="text-[9px] font-mono text-gray-500">ACTIVE: {activeModules.length}/{MODULE_SLOTS.length}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center font-mono text-[9px]">
        {MODULE_SLOTS.map((slot) => {
          const isActive = activeModules.some((m) => m.key === slot.key);
          return isActive ? (
            <div key={slot.key} className="relative rounded-lg p-2 border border-neon-green/30 bg-neon-green/5 flex flex-col items-center justify-center gap-1">
              {slot.icon}
              <span className="text-[8px] text-white">{slot.label}</span>
              <span className="text-[7px] text-neon-green bg-neon-green/10 px-1 rounded">ON</span>
            </div>
          ) : (
            <div key={slot.key} className="relative rounded-lg p-2 border border-dashed border-gray-600 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-60">
              <span className="text-gray-500 text-xs"><Eye className="w-3 h-3" /></span>
              <span className="text-[8px] text-gray-400">{slot.label}</span>
              <span className="text-[7px] text-gray-500 bg-gray-800 px-1 rounded">SLOT</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
