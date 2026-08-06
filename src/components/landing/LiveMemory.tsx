"use client";

import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Database, Hash } from "lucide-react";

interface ExplorerPayment {
  id: string;
  amount: number;
  status: string;
  memo: string | null;
  createdAt: string;
  user: { piUsername: string | null };
}

interface ExplorerResponse {
  recentPayments: ExplorerPayment[];
}

export function LiveMemory() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const { data, isError, isLoading } = useQuery<ExplorerResponse>({
    queryKey: ["explorer-memory"],
    queryFn: async () => {
      const res = await fetch("/api/explorer", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const payments = data?.recentPayments ?? [];

  return (
    <section id="memory" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Live Memory", "الذاكرة الحية")}>
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-electric-blue" />
        <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
          {t("live memory — append-only log", "الذاكرة الحية — سجل تراكمي")}
        </span>
      </div>
      <p className="text-sm text-subtle font-sans mb-4">
        {t(
          "Memory is derived from the event log — reads are queries, not state. Entries below are real recent actions from the network ledger.",
          "الذاكرة مشتقة من سجل الأحداث — القراءات استعلامات وليست حالة. الإدخالات أدناه إجراءات حقيقية من دفتر الشبكة."
        )}
      </p>

      {isLoading && <div className="font-mono text-xs text-subtle animate-pulse">{t("reading ledger…", "قراءة الدفتر…")}</div>}
      {isError && (
        <div className="rounded-xl p-3 bg-black/40 border border-glass font-mono text-xs text-red-400">
          {t("✗ ledger unreachable — no entries, honestly.", "✗ الدفتر لا يستجيب — لا إدخالات، بصدق.")}
        </div>
      )}

      {!isLoading && !isError && payments.length === 0 && (
        <div className="rounded-xl p-3 bg-black/40 border border-glass font-mono text-xs text-subtle">
          {t("ledger is empty — first action writes entry #1.", "الدفتر فارغ — أول إجراء يكتب الإدخال الأول.")}
        </div>
      )}

      {payments.length > 0 && (
        <div className="rounded-xl bg-black/40 border border-glass backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glass bg-black/40">
            <Hash className="w-3.5 h-3.5 text-neon-green" />
            <span className="text-[10px] font-mono text-subtle">{t("memory://ledger.tail", "memory://ledger.tail")}</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5 max-h-[220px] overflow-y-auto">
            {payments.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-2"
              >
                <span className="text-neon-green shrink-0 select-none">●</span>
                <span className="text-subtle break-all">
                  [{new Date(p.createdAt).toISOString()}]{" "}
                  <span className="text-white">{p.amount} Pi</span> — {p.memo ?? p.status}{" "}
                  <span className="text-faint">({p.user.piUsername ?? "anon"})</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}