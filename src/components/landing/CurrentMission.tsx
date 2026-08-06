"use client";

import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Activity, Users, Bot, Zap } from "lucide-react";

interface StatusStats {
  registeredUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalPayments: number;
  totalXpEarned: number;
  activeUsers: number;
  averageTrustScore: number;
  verificationRate: number;
}

interface StatusResponse {
  network: string;
  version: string;
  timestamp: string;
  stats: StatusStats;
}

export function CurrentMission() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const { data, isError, isLoading } = useQuery<StatusResponse>({
    queryKey: ["status"],
    queryFn: async () => {
      const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const cards = data
    ? [
        { icon: Users, label: t("identities", "هويات"), value: data.stats.registeredUsers },
        { icon: Bot, label: t("agents (active)", "عملاء (نشط)"), value: data.stats.activeAgents },
        { icon: Activity, label: t("active now", "نشط الآن"), value: data.stats.activeUsers },
        { icon: Zap, label: t("XP earned", "خبرة مكتسبة"), value: data.stats.totalXpEarned },
      ]
    : [];

  return (
    <section id="mission" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Current Mission", "المهمة الحالية")}>
      <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
        {t("current mission — live state", "المهمة الحالية — حالة مباشرة")}
      </span>

      <div className="mt-4 rounded-2xl border border-glass bg-black/40 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glass bg-black/40">
          <Activity className="w-3.5 h-3.5 text-neon-green" />
          <span className="text-[10px] font-mono text-subtle ml-1">
            {t("mission://axiomid-network", "mission://axiomid-network")}
          </span>
          {isError && (
            <span className="ml-auto text-[9px] font-mono text-red-400">
              {t("OFFLINE — API unreachable", "غير متصل — الواجهة لا تستجيب")}
            </span>
          )}
        </div>

        <div className="p-5">
          {isLoading && (
            <div className="font-mono text-xs text-subtle">
              <span className="animate-pulse">{t("fetching live state…", "جلب الحالة الحية…")}</span>
            </div>
          )}

          {isError && (
            <div className="font-mono text-xs text-red-400">
              {t("✗ failed to reach /api/status. Honest: no numbers to show.", "✗ فشل الوصول إلى /api/status. بصدق: لا توجد أرقام لنعرضها.")}
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-neon-green bg-neon-green/10 border border-neon-green/30">
                  ✓ {t("network", "الشبكة")} {data.network} v{data.version}
                </span>
                <span className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-subtle bg-black/40 border border-glass">
                  {t("timestamp", "الطابع الزمني")}: {new Date(data.timestamp).toISOString()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cards.map(({ icon: Icon, label, value }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-xl bg-glass border border-glass p-4"
                  >
                    <Icon className="w-4 h-4 text-electric-blue mb-2" />
                    <div className="font-mono text-2xl font-bold text-white">{value.toLocaleString()}</div>
                    <div className="text-[10px] font-mono text-subtle mt-1">{label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 font-mono text-[10px] text-faint">
                {t(
                  "mission: prove human intent behind AI actions. Network is live — data above is real /api/status output.",
                  "المهمة: إثبات النية الإنسانية خلف إجراءات الذكاء الاصطناعي. الشبكة حية — البيانات أعلاه مخرجات حقيقية من /api/status."
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
