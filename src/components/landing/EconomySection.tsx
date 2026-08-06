"use client";

import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Shield, BarChart3 } from "lucide-react";

interface ExplorerResponse {
  stats: {
    totalPayments: number;
    totalXpEarned: number;
    registeredUsers: number;
    activeAgents: number;
    activeUsers: number;
  };
  tierDistribution?: { Visitor: number; Citizen: number; Validator: number; Sovereign: number };
}

export function EconomySection() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const { data, isError, isLoading } = useQuery<ExplorerResponse>({
    queryKey: ["explorer-economy"],
    queryFn: async () => {
      const res = await fetch("/api/explorer", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const stats = data?.stats ?? { totalPayments: 0, totalXpEarned: 0, registeredUsers: 0, activeAgents: 0, activeUsers: 0 };
  const tiers = data?.tierDistribution ?? { Visitor: 0, Citizen: 0, Validator: 0, Sovereign: 0 };

  return (
    <section id="economy" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Economy", "الاقتصاد")}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-neon-green" />
        <span className="text-[11px] font-mono text-neon-green uppercase tracking-[0.25em]">
          {t("economy — pi payments & xp", "الاقتصاد — مدفوعات باي & خبرة")}
        </span>
      </div>

      <div className="rounded-2xl border border-glass bg-black/40 backdrop-blur-sm overflow-hidden">
        <div className="p-5">
          {isLoading && (
            <div className="font-mono text-xs text-subtle animate-pulse">{t("fetching economy data…", "جلب بيانات الاقتصاد…")}</div>
          )}

          {isError && (
            <div className="rounded-xl p-3 bg-black/40 border border-glass font-mono text-xs text-red-400">
              {t("✗ /api/explorer unreachable — economy hidden, honestly.", "✗ /api/explorer لا تستجيب — الاقتصاد مخفي، بصدق.")}
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Payments */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-glass border border-glass p-4 text-center"
              >
                <TrendingUp className="w-6 h-6 text-neon-green mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.totalPayments?.toLocaleString() ?? "0"}</div>
                <div className="text-[10px] font-mono text-subtle">{t("payments processed", "تم معالجة المدفوعات")}</div>
              </motion.div>

              {/* Total XP */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl bg-glass border border-glass p-4 text-center"
              >
                <Zap className="w-6 h-6 text-electric-blue mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.totalXpEarned?.toLocaleString() ?? "0"}</div>
                <div className="text-[10px] font-mono text-subtle">{t("XP earned", "الخبرة المكتسبة")}</div>
              </motion.div>

              {/* Active Users */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl bg-glass border border-glass p-4 text-center"
              >
                <Shield className="w-6 h-6 text-subtle mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.activeUsers?.toLocaleString() ?? "0"}</div>
                <div className="text-[10px] font-mono text-subtle">{t("active now", "نشط الآن")}</div>
              </motion.div>

              {/* Network Value */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl bg-glass border border-glass p-4 text-center"
              >
                <BarChart3 className="w-6 h-6 text-electric-blue mx-auto mb-2 opacity-70" />
                <div className="text-2xl font-bold text-white">
                  {t("reading", "للقراءة")} {/* placeholder—needs real price */}
                </div>
                <div className="text-[10px] font-mono text-subtle">{t("network value", "قيمة الشبكة")}</div>
              </motion.div>
            </div>
          )}

          {/* Tier distribution as visual */}
          {!isLoading && !isError && tiers && (
            <div className="mt-6">
              <div className="text-[11px] font-mono text-subtle mb-2 uppercase tracking-[0.15em]">{t("tier distribution (live data)", "توزيع المستويات (بيانات حية)")}</div>
              <div className="flex gap-2">
                {(["Visitor", "Citizen", "Validator", "Sovereign"] as const).map((tier) => (
                  <div key={tier} className="flex-1">
                    <div className="text-[9px] font-mono text-subtle mb-0.5">{tier[0].toUpperCase() + tier.slice(1)}</div>
                    <div className="h-2 bg-glass/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neon-green"
                        style={{ width: `${(tiers[tier] / (tiers.Visitor + tiers.Citizen + tiers.Validator + tiers.Sovereign) || 0) * 100}%` }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-faint mt-0.5">{tiers[tier]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 font-mono text-[10px] text-faint">
        <span className="text-neon-green">✓</span>{" "}
        {t(
          "All numbers from /api/explorer — no simulation, no invention.",
          "جميع الأرقام من /api/explorer — بدون محاكاة، بدون اختراع."
        )}
      </div>
    </section>
  );
}