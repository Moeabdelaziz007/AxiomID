"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Play, Rewind, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface SpecStep {
  name: string;
  endpoint: string;
  status: "pending" | "running" | "success" | "error";
  result?: string;
  error?: string;
}

const SPEC_STEPS: SpecStep[] = [
  { name: "fetch status", endpoint: "/api/status", status: "pending" },
  { name: "fetch explorer", endpoint: "/api/explorer", status: "pending" },
  { name: "resolve DID", endpoint: "/api/did-document", status: "pending" },
];

export function SpecStream() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const [steps, setSteps] = useState<SpecStep[]>(SPEC_STEPS);
  const [isRunning, setIsRunning] = useState(false);

  const runStep = async (step: SpecStep) => {
    if (step.status === "running") return;
    setSteps((prev) => prev.map((s) => (s.name === step.name ? { ...s, status: "running" } : s)));

    try {
      const res = await fetch(step.endpoint, { headers: { Accept: "application/json" } });
      const data = await res.json();

      setSteps((prev) =>
        prev.map((s) =>
          s.name === step.name
            ? {
                ...s,
                status: "success",
                result: `${Math.round(JSON.stringify(data).length / 100)}kB`, // size estimate
              }
            : s
        )
      );
    } catch (e: unknown) {
      setSteps((prev) =>
        prev.map((s) =>
          s.name === step.name
            ? {
                ...s,
                status: "error",
                error: e instanceof Error ? e.message : "unknown error",
              }
            : s
        )
      );
    }
  };

  const runSpec = async () => {
    setIsRunning(true);
    for (const step of steps) {
      await runStep(step);
      await new Promise((r) => setTimeout(r, 150)); // brief pause between
    }
    setIsRunning(false);
  };

  return (
    <section id="spec" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Spec", "مواصفة")}>
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-4 h-4 text-electric-blue" />
        <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
          {t("executable spec — run live checks", "مواصفة قابلة للتنفيذ — أنفي فحوصات حية")}
        </span>
      </div>

      <div className="rounded-2xl border border-glass bg-black/40 backdrop-blur-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={runSpec}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-electric-blue/10 border border-electric-blue/30 text-electric-blue text-xs font-mono font-semibold hover:bg-electric-blue/20 transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("running...", "يعمل...")}
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  {t("EXECUTE", "تنفيذ")}
                </>
              )}
            </button>

            <span className="text-[10px] font-mono text-faint">
              {t("each step makes a live HTTP request — results are real, not simulated.", "كل خطوة تجعل طلب HTTP حي — النتائج حقيقة، ليست محاكاة.")}
            </span>
          </div>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <motion.div
                key={step.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-glass border border-glass p-3 font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  {step.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-electric-blue" />}
                  {step.status === "success" && <CheckCircle2 className="w-3 h-3 text-neon-green" />}
                  {step.status === "error" && <AlertCircle className="w-3 h-3 text-red-400" />}
                  {step.status === "pending" && <div className="w-3 h-3 rounded-full bg-faint" />}

                  <span className="text-white">{step.name}</span>
                  <span className="text-[9px] text-subtle">({step.endpoint})</span>
                </div>

                {step.status === "error" && step.error && (
                  <div className="mt-1 text-[9px] text-red-400">✗ {step.error}</div>
                )}

                {step.status === "success" && step.result !== undefined && (
                  <div className="mt-1 text-[9px] text-neon-green">
                    ✓ {step.result} — {t("live response", "استجابة حية")}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Replay */}
      <div className="mt-3">
        <button
          onClick={() => setSteps(SPEC_STEPS.map((s) => ({ ...s, status: "pending", result: undefined, error: undefined })))}
          className="flex items-center gap-1.5 text-xs font-mono text-subtle hover:text-electric-blue focus-visible:ring-1 focus-visible:ring-electric-blue rounded px-2 py-0.5"
        >
          <Rewind className="w-3 h-3" />
          {t("reset & replay", "إعادة ضبط & إعادة العرض")}
        </button>
      </div>
    </section>
  );
}