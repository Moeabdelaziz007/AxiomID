"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Bot, Cpu } from "lucide-react";

interface ExplorerAgent {
  id: string;
  piUsername: string | null;
  did: string | null;
  tier: string;
  xp: number;
  agent: { name: string; status: string } | null;
}

interface ExplorerResponse {
  activeNodes: ExplorerAgent[];
  tierDistribution?: { Visitor: number; Citizen: number; Validator: number; Sovereign: number };
}

export function RunningAgents() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const { data, isError, isLoading } = useQuery<ExplorerResponse>({
    queryKey: ["explorer-nodes"],
    queryFn: async () => {
      const res = await fetch("/api/explorer", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const nodes = data?.activeNodes ?? [];

  return (
    <section id="agents" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Running Agents", "العملاء النشطون")}>
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="w-4 h-4 text-electric-blue" />
        <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
          {t("running agents — pasome live nodes", "العملاء النشطون — عقد حية")}
        </span>
      </div>

      {isLoading && (
        <div className="font-mono text-xs text-subtle animate-pulse">{t("querying active nodes…", "جلب العقد النشطة…")}</div>
      )}
      {isError && (
        <div className="rounded-xl p-3 bg-black/40 border border-glass font-mono text-xs text-red-400">
          {t("✗ /api/explorer unreachable — no nodes shown, honestly.", "✗ /api/explorer لا تستجيب — لا نعرض عقدًا، بصدق.")}
        </div>
      )}

      {!isLoading && !isError && nodes.length === 0 && (
        <div className="rounded-xl p-3 bg-black/40 border border-glass font-mono text-xs text-subtle">
          {t("0 active nodes. Claim an identity and deploy an agent to become node #1.", "0 عقد نشطة. طالب بهويتك وانشر عميلًا لتصبح العقدة الأولى.")}
        </div>
      )}

      {nodes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nodes.slice(0, 6).map((node, i) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl bg-glass border border-glass p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-neon-green" />
                <span className="font-mono text-sm font-semibold text-white truncate">
                  @{node.piUsername ?? "anonymous"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-lg font-mono text-[9px] text-electric-blue bg-electric-blue/10 border border-electric-blue/30">
                  {node.tier}
                </span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[9px] text-subtle bg-black/40 border border-glass">
                  {node.xp} {t("XP", "خبرة")}
                </span>
                <span className="px-2 py-0.5 rounded-lg font-mono text-[9px] text-faint bg-black/40 border border-glass">
                  {node.agent?.status?.toUpperCase() ?? "IDLE"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-faint break-all">
                {node.agent?.name ?? t("no agent manifest — citizen", "لا بيان عميل — مواطن")}
              </div>
              {node.piUsername && (
                <Link
                  href={`/agent/${node.piUsername}`}
                  className="mt-3 inline-block text-[10px] font-mono text-electric-blue hover:underline focus-visible:ring-2 focus-visible:ring-electric-blue rounded"
                >
                  {t("view AOR →", "عرض السجل ←")}
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}