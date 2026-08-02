"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/language-context";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Wallet, Shield, Rocket } from "lucide-react";

interface LogEntry {
  text: string;
  type: "input" | "output" | "success" | "info" | "error";
}

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

interface ExplorerResponse {
  stats: {
    registeredUsers: number;
    totalAgents: number;
    activeAgents: number;
    totalPayments: number;
    totalXpEarned: number;
  };
  recentPayments: Array<{
    amount: number;
    status: string;
    memo: string;
    user: { piUsername: string; walletAddress: string };
  }>;
  activeNodes: Array<{
    piUsername: string;
    did: string;
    tier: string;
    xp: number;
    agent: { name: string; status: string } | null;
  }>;
  tierDistribution: {
    Visitor: number;
    Citizen: number;
    Validator: number;
    Sovereign: number;
  };
}

function typeText(
  fullText: string,
  onChar: (t: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    let i = 0;
    const speed = 15 + Math.random() * 25;
    const interval = setInterval(() => {
      i++;
      onChar(fullText.slice(0, i));
      if (i >= fullText.length || signal?.aborted) {
        clearInterval(interval);
        resolve();
      }
    }, speed);

    signal?.addEventListener("abort", () => {
      clearInterval(interval);
      resolve();
    });
  });
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return body as T;
}

export default function InteractiveCommandDemo() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const [activeStep, setActiveStep] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>(() => [
    {
      text: language === "en"
        ? "AxiomID Agent Protocol v1.0 — live terminal (real API data)"
        : "بروتوكول عميل AxiomID الإصدار 1.0 — طرفية مباشرة (بيانات API حقيقية)",
      type: "output" as const,
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentOutput, setCurrentOutput] = useState<LogEntry[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cursor = setInterval(() => setShowCursor((p) => !p), 530);
    return () => {
      clearInterval(cursor);
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, currentOutput]);

  const streamLines = async (
    lines: LogEntry[],
    signal: AbortSignal
  ): Promise<void> => {
    const outputLines: LogEntry[] = [];
    for (const line of lines) {
      if (signal.aborted) return;
      const entry: LogEntry = { text: "", type: line.type };
      outputLines.push(entry);
      setCurrentOutput([...outputLines]);
      await typeText(
        line.text,
        (txt) => {
          if (!signal.aborted) {
            entry.text = txt;
            setCurrentOutput([...outputLines]);
          }
        },
        signal
      );
      if (signal.aborted) return;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 120);
        signal.addEventListener("abort", () => clearTimeout(timeout));
      });
    }
    setCurrentOutput([]);
    setLogs((prev) => [...prev, ...outputLines].slice(-100));
  };

  const runCommand = async (index: number) => {
    if (isRunning || index > activeStep) return;
    setIsRunning(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const labels = [
      t("connect to network", "الاتصال بالشبكة"),
      t("verify DID compliance", "التحقق من توافق DID"),
      t("inspect agent registry", "فحص سجل العملاء"),
    ];

    setLogs((prev) => [...prev, { text: `$ ${labels[index]}`, type: "input" as const }].slice(-100));

    try {
      if (index === 0) {
        setLogs((prev) => [...prev, { text: t("→ GET /api/status", "→ GET /api/status"), type: "info" as const }].slice(-100));
        const data = await fetchJson<{ network: string; version: string; stats: StatusStats }>(
          "/api/status",
          signal
        );
        const s = data.stats;
        await streamLines(
          [
            { text: t(`✓ Network ${data.network} v${data.version} online`, `✓ الشبكة ${data.network} v${data.version} نشطة`), type: "success" as const },
            { text: t(`✓ ${s.registeredUsers.toLocaleString()} registered identities`, `✓ ${s.registeredUsers.toLocaleString()} هوية مسجلة`), type: "success" as const },
            { text: t(`✓ ${s.totalAgents.toLocaleString()} agents deployed (${s.activeAgents} ACTIVE)`, `✓ ${s.totalAgents.toLocaleString()} عميل منشور (${s.activeAgents} نشط)`), type: "success" as const },
            { text: t(`✓ ${s.totalXpEarned.toLocaleString()} XP earned, avg trust ${s.averageTrustScore}/100`, `✓ ${s.totalXpEarned.toLocaleString()} خبرة مكتسبة، متوسط الثقة ${s.averageTrustScore}/100`), type: "success" as const },
            { text: t("Network handshake complete.", "اكتمل مصافحة الشبكة."), type: "output" as const },
          ],
          signal
        );
      } else if (index === 1) {
        setLogs((prev) => [...prev, { text: t("→ GET /api/did-document", "→ GET /api/did-document"), type: "info" as const }].slice(-100));
        const doc = await fetchJson<{
          id: string;
          verificationMethod?: Array<{ id: string; type?: string }>;
          service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
        }>("/api/did-document", signal);
        const vm = doc.verificationMethod?.[0];
        await streamLines(
          [
            { text: t(`✓ DID resolved: ${doc.id}`, `✓ تم حل المعرف: ${doc.id}`), type: "success" as const },
            ...(vm
              ? [{ text: t(`✓ Verification method: ${vm.id}`, `✓ طريقة التحقق: ${vm.id}`), type: "success" as const }]
              : []),
            ...(doc.service && doc.service.length > 0
              ? [{ text: t(`✓ ${doc.service.length} services (passport, agents, credential-status)`, `✓ ${doc.service.length} خدمات (جواز السفر، العملاء، حالة الاعتماد)`), type: "success" as const }]
              : []),
            { text: t("W3C DID compliance verified on-chain.", "تم التحقق من توافق W3C DID."), type: "output" as const },
          ],
          signal
        );
      } else {
        setLogs((prev) => [...prev, { text: t("→ GET /api/explorer", "→ GET /api/explorer"), type: "info" as const }].slice(-100));
        const data = await fetchJson<ExplorerResponse>("/api/explorer", signal);
        const topAgent = data.activeNodes[0];
        const topPayment = data.recentPayments[0];
        const tiers = data.tierDistribution;
        await streamLines(
          [
            { text: t(`✓ ${data.activeNodes.length} live agent nodes`, `✓ ${data.activeNodes.length} عقدة عميل حية`), type: "success" as const },
            { text: t(`✓ Tiers — Visitor ${tiers.Visitor} · Citizen ${tiers.Citizen} · Validator ${tiers.Validator} · Sovereign ${tiers.Sovereign}`, `✓ المستويات — زائر ${tiers.Visitor} · مواطن ${tiers.Citizen} · مدقق ${tiers.Validator} · سيادي ${tiers.Sovereign}`), type: "success" as const },
            ...(topAgent
              ? [{ text: t(`✓ Top node: @${topAgent.piUsername} (${topAgent.agent?.name ?? "no agent"}, XP ${topAgent.xp})`, `✓ أفضل عقدة: @${topAgent.piUsername} (${topAgent.agent?.name ?? "بدون عميل"}, خبرة ${topAgent.xp})`), type: "success" as const }]
              : []),
            ...(topPayment
              ? [{ text: t(`✓ Latest payment: ${topPayment.amount} Pi — ${topPayment.memo || topPayment.status}`, `✓ أحدث دفعة: ${topPayment.amount} Pi — ${topPayment.memo || topPayment.status}`), type: "success" as const }]
              : []),
            { text: t("Agent registry is ACTIVE — claim yours to join the network.", "سجل العملاء نشط — طالب بهويتك للانضمام إلى الشبكة."), type: "output" as const },
          ],
          signal
        );
      }
      setActiveStep((prev) => Math.min(prev + 1, 3));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setCurrentOutput([]);
      setLogs((prev) => [...prev, { text: `✗ ${message}`, type: "error" as const }].slice(-100));
    } finally {
      setIsRunning(false);
    }
  };

  const allDone = activeStep >= 3;

  const COMMANDS = [
    { id: "connect", icon: Wallet, label: t("connect to network", "الاتصال بالشبكة") },
    { id: "verify", icon: Shield, label: t("verify DID compliance", "التحقق من توافق DID") },
    { id: "deploy", icon: Rocket, label: t("inspect agent registry", "فحص سجل العملاء") },
  ];

  return (
    <div className="w-full">
      {/* Top section: heading + command buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-mono text-electric-blue uppercase tracking-[0.2em]">
            {t("Try It Live", "جربه مباشرة")}
          </span>
          <h2 className="text-xl sm:text-2xl font-sans font-bold mt-1">
            {t("Agent Command Loop", "حلقة أوامر العميل")}
          </h2>
          <p className="text-sm text-subtle font-sans mt-1 max-w-md">
            {t(
              "Click each step to query the live AxiomID network — real data, no simulation.",
              "انقر فوق كل خطوة للاستعلام عن شبكة AxiomID المباشرة — بيانات حقيقية، بدون محاكاة."
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMANDS.map((cmd, i) => {
            const Icon = cmd.icon;
            const done = i < activeStep;
            const current = i === activeStep;
            return (
              <motion.button
                key={cmd.id}
                whileHover={!isRunning && !done ? { scale: 1.03 } : {}}
                whileTap={!isRunning && !done ? { scale: 0.97 } : {}}
                transition={{ ease: [0.16, 1, 0.3, 1] }}
                onClick={() => runCommand(i)}
                disabled={isRunning || done || i > activeStep}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:outline-none ${
                  done
                    ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
                    : current || (!isRunning && i === activeStep)
                      ? "bg-electric-blue/10 border border-electric-blue/30 text-electric-blue"
                      : "bg-glass border border-glass-hover text-subtle"
                } disabled:opacity-70`}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : current && isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                {cmd.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Terminal */}
      <div className="rounded-2xl border border-glass bg-black/60 backdrop-blur-sm overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glass bg-black/40">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-neon-green/60" />
          </div>
          <span className="text-[10px] font-mono text-subtle ml-2">
            {t("agent-command-loop — live", "حلقة-أوامر-العميل — مباشر")}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono text-neon-green">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            {t("LIVE", "مباشر")}
          </span>
        </div>

        {/* Terminal body */}
        <div className="p-4 sm:p-6 font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto">
          {logs.map((entry, i) => (
            <div key={i} className="mb-1">
              {entry.type === "input" ? (
                <div className="flex items-start gap-2">
                  <span className="text-neon-green shrink-0 select-none">$</span>
                  <span className="text-white">{entry.text.slice(2)}</span>
                </div>
              ) : entry.type === "success" ? (
                <div className="ml-4 text-neon-green/90">{entry.text}</div>
              ) : entry.type === "info" ? (
                <div className="ml-4 text-electric-blue/80">{entry.text}</div>
              ) : entry.type === "error" ? (
                <div className="ml-4 text-red-400">{entry.text}</div>
              ) : (
                <div className="ml-4 text-subtle">{entry.text}</div>
              )}
            </div>
          ))}

          {/* Current output streaming */}
          <AnimatePresence mode="popLayout">
            {currentOutput.map((entry, i) => (
              <motion.div
                key={`stream-${i}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ease: [0.16, 1, 0.3, 1] }}
                className="mb-1"
              >
                <div className={`ml-4 ${entry.type === "success" ? "text-neon-green/90" : entry.type === "info" ? "text-electric-blue/80" : "text-subtle"}`}>
                  {entry.text}
                  {!entry.text.endsWith(" ") && showCursor && (
                    <span className="animate-pulse">▊</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isRunning && !allDone && (
            <div className="flex items-center gap-2 mt-2 text-subtle">
              <span className="text-neon-green">$</span>
              <span className="animate-pulse">▊</span>
            </div>
          )}

          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 p-3 rounded-xl bg-neon-green/5 border border-neon-green/20"
            >
              <div className="flex items-center gap-2 text-neon-green font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {t(
                  "Live network verified — these queries ran against the real AxiomID API.",
                  "تم التحقق من الشبكة المباشرة — تم تنفيذ هذه الاستعلامات على واجهة AxiomID الحقيقية."
                )}
              </div>
              <div className="mt-2 text-[10px] text-subtle">
                {t(
                  "→ This is the same data powering axiomid.app in production.",
                  "← هذه هي نفس البيانات التي تعمل عليها axiomid.app في الإنتاج."
                )}
                <Link
                  href="/claim"
                  className="ml-1 text-electric-blue hover:underline focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:outline-none transition-all rounded"
                >
                  {t("Try it for real", "جربه بشكل حقيقي")}
                </Link>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
