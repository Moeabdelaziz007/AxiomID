"use client";

import { useState, useEffect } from "react";
import { SkillsCard } from "@/components/dashboard/SkillsCard";
import { PublishSkillForm } from "@/components/dashboard/PublishSkillForm";
import { SoulBadge } from "@/components/marketplace/SoulBadge";
import type { SoulPrincipleKey } from "@/lib/soul-principles";

interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tier: string;
  pricePi: number;
  version: string;
  installCount: number;
  avgRating: number;
  soulPrinciple: SoulPrincipleKey | null;
}

/**
 * Skills tab — composes existing SkillsCard, PublishSkillForm, SoulBadge.
 * Fetches marketplace skills from existing /api/skills endpoint.
 */
export function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skills?limit=20", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch skills");
        return res.json();
      })
      .then((json) => {
        setSkills(json?.skills ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-5">
      {/* Installed skills — reuse existing SkillsCard */}
      <SkillsCard skills={skills.slice(0, 6)} />

      {/* Marketplace browse — simple card grid */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-4">
          Marketplace
        </h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-glass bg-white/[0.02]">
                <div className="h-4 bg-glass rounded animate-pulse mb-2 w-2/3" />
                <div className="h-3 bg-glass rounded animate-pulse w-full" />
              </div>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <p className="text-xs text-faint text-center py-4">No skills available yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="p-3 rounded-xl border border-glass bg-white/[0.02] hover:border-axiom-purple/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-200 font-mono">{skill.name}</span>
                  <span className="text-[9px] font-mono text-axiom-purple bg-axiom-purple/10 px-1.5 py-0.5 rounded">
                    {skill.tier}
                  </span>
                </div>
                <p className="text-xs text-faint line-clamp-2">{skill.description}</p>
                {skill.soulPrinciple && <SoulBadge principle={skill.soulPrinciple} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publish — reuse existing PublishSkillForm */}
      <div className="bento-card p-5">
        <button
          onClick={() => setShowPublish(!showPublish)}
          className="text-xs font-mono text-axiom-purple hover:text-axiom-purple/80 transition-colors"
        >
          {showPublish ? "Close" : "Publish a Skill →"}
        </button>
        {showPublish && (
          <div className="mt-4">
            <PublishSkillForm onPublished={() => setShowPublish(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
