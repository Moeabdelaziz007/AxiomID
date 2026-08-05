"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/app/context/wallet-context";
import { IqraMesh } from "./IqraMesh";
import { TrustHistoryGraph } from "./TrustHistoryGraph";

/**
 * Memory tab — IQRA neural mesh (D3.js force graph),
 * trust history SVG chart, skill nodes list.
 */
export function MemoryTab() {
  const { user } = useWallet();
  const [skillNodes, setSkillNodes] = useState<Array<{ name: string; tier: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skills?limit=10", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { skills: [] }))
      .then((json) => {
        setSkillNodes(json?.skills ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-5">
      {/* IQRA Neural Mesh */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          IQRA Neural Mesh
        </h3>
        <IqraMesh width={560} height={360} />
      </div>

      {/* Trust History */}
      <TrustHistoryGraph username={user?.piUsername ?? undefined} />

      {/* Dynamic skill nodes */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-4">
          Skill Nodes
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-3 bg-glass rounded animate-pulse w-2/3" />
            ))}
          </div>
        ) : skillNodes.length === 0 ? (
          <p className="text-xs font-mono text-faint text-center py-2">No skills installed</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skillNodes.map((skill, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md text-[10px] font-mono border border-glass bg-white/[0.02] text-faint"
              >
                {skill.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
