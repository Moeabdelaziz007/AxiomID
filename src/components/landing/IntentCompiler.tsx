"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useLanguage } from "@/app/context/language-context";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Terminal, ArrowRight } from "lucide-react";
import { compileIntent } from "@/lib/intent-compiler";

interface PipelineState {
  parsed: string | null;
  matched: ReturnType<typeof compileIntent>;
}

const STAGES = [
  { key: "parse", en: "parse", ar: "تحليل" },
  { key: "plan", en: "plan", ar: "تخطيط" },
  { key: "match", en: "capability matching", ar: "مطابقة القدرات" },
  { key: "execute", en: "execution", ar: "تنفيذ" },
] as const;

type SpeechRecognitionConstructor = new () => {
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
};

export default function IntentCompiler() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const [input, setInput] = useState("");
  const [pipeline, setPipeline] = useState<PipelineState>({ parsed: null, matched: null });
  const [isListening, setIsListening] = useState(false);
  const [voiceUnsupported, setVoiceUnsupported] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const compile = (raw: string) => {
    const text = raw.trim();
    setPipeline({ parsed: text || null, matched: text ? compileIntent(text) : null });
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceUnsupported(true);
      return;
    }
    const rec = new SR();
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      compile(transcript);
    };
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  };

  const stageDone = (i: number) => {
    if (i === 0 || i === 1) return pipeline.parsed !== null;
    if (i === 2) return pipeline.matched !== null;
    return false; // execution: nothing runs on the landing until the human acts
  };

  const matchedRoute = (pipeline.matched?.route ?? "/claim") as string;
  const capLabel = pipeline.matched?.capability ?? null;
  const verb = pipeline.matched?.verb ?? null;

  return (
    <section
      id="intent"
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 z-10"
      aria-label={t("Intent Compiler", "مجمّع النية")}
    >
      <div className="text-center mb-8">
        <span className="text-[11px] font-mono text-electric-blue uppercase tracking-[0.25em]">
          {t("intent compiler — axiomid os", "مجمّع النية — نظام axiomid")}
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-2 font-sans tracking-tight text-white">
          {t("What do you intend to do?", "ماذا تنوي أن تفعل؟")}
        </h1>
        <p className="text-sm text-subtle font-sans mt-3 max-w-md mx-auto">
          {t(
            "State an intent. The compiler parses it into a capability chain — verify, claim, deploy, pay, explore. Nothing executes until you act.",
            "صرِّح بنيتك ليقوم المترجم بتحويلها إلى سلسلة قدرات — تحقق، طالب، انشر، ادفع، استكشف. لا يُنفَّذ شيء قبل أن تتصرف."
          )}
        </p>
      </div>

      {/* Input console */}
      <div className="rounded-2xl border border-glass bg-black/60 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glass bg-black/40">
          <Terminal className="w-3.5 h-3.5 text-electric-blue" />
          <span className="text-[10px] font-mono text-subtle ml-1">{t("intent://stdin", "intent://stdin")}</span>
          {isListening && (
            <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {t("LISTENING", "يستمع")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-3">
          <label htmlFor="intent-input" className="sr-only">
            {t("Type your intent", "اكتب نيتك")}
          </label>
          <input
            id="intent-input"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value.trim() === "") setPipeline({ parsed: null, matched: null });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                compile(input);
              }
            }}
            placeholder={t("book flight to Cairo…", "احجز رحلة إلى القاهرة…")}
            className="flex-1 bg-transparent font-mono text-sm text-white placeholder:text-faint focus:outline-none"
          />
          <button
            onClick={toggleVoice}
            aria-pressed={isListening}
            aria-label={isListening ? t("Stop listening", "إيقاف الاستماع") : t("Start voice input", "بدء الإدخال الصوتي")}
            title={voiceUnsupported ? t("Voice not supported in this browser", "الصوت غير مدعوم في هذا المتصفح") : undefined}
            className="p-2 rounded-lg text-subtle hover:text-electric-blue hover:bg-glass transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => compile(input)}
            className="px-4 py-2 rounded-lg bg-electric-blue/10 border border-electric-blue/30 text-electric-blue text-xs font-mono font-semibold hover:bg-electric-blue/20 transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
          >
            {t("COMPILE", "ترجم")}
          </button>
        </div>

        {/* Pipeline visualization */}
        <div className="px-4 pt-1 pb-4 flex items-center gap-1.5 overflow-x-auto" aria-hidden="true">
          {STAGES.map((stage, i) => {
            const done = stageDone(i);
            return (
              <div key={stage.key} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`px-2.5 py-1 rounded-md font-mono text-[10px] border whitespace-nowrap ${
                    done
                      ? "bg-neon-green/10 border-neon-green/30 text-neon-green"
                      : "bg-black/40 border-glass text-faint"
                  }`}
                >
                  {t(stage.en, stage.ar)}
                </div>
                {i < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-faint shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Result / output stream */}
      <div className="mt-4 min-h-[120px]" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {pipeline.parsed && !pipeline.matched && (
            <motion.div
              key="unmapped"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="p-3 rounded-xl bg-black/40 border border-glass"
            >
              <div className="font-mono text-xs break-words">
                <span className="text-[#f59e0b]">[intent:unmapped]</span>{" "}
                <span className="text-subtle">
                  {t(
                    `— "{}" has no declared capability yet, honestly. Try: claim, deploy, pay, explore, status, docs.`,
                    `— "{}" لا يملك قدرة معلنة بعد، وبصدق. جرّب: طالب، نشر، ادفع، استكشف، حالة، توثيق.`
                  )}
                </span>
              </div>
            </motion.div>
          )}

          {pipeline.parsed && pipeline.matched && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-4 bg-glass border border-glass"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-neon-green bg-neon-green/10 border border-neon-green/30">
                  {t("capability:", "القدرة:")} {capLabel}
                </span>
                <span className="px-2.5 py-1 rounded-lg font-mono text-[10px] text-subtle bg-black/40 border border-glass">
                  {t("verb", "فعل")}: {verb}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  href={matchedRoute as unknown as Route}
                  className="px-4 py-2 rounded-lg text-xs font-mono font-semibold border border-electric-blue/30 text-electric-blue bg-electric-blue/5 hover:bg-electric-blue/10 transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
                >
                  {t("enter capability →", "ادخل القدرة ←")} {matchedRoute}
                </Link>
                <span className="text-[10px] font-mono text-faint">
                  {t("execution chain: human approval required", "سلسلة التنفيذ: تتطلب موافقة إنسانية")}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
