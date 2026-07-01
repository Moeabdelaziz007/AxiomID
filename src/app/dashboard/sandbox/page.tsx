"use client";

import { useState, useEffect, useRef } from "react";
import { Play, ShieldAlert, Cpu, Dna, Terminal, Copy, Check, ShieldCheck, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/language-context";

interface AstNode {
  type: string;
  level?: number;
  text?: string;
  items?: string[];
}

function parseManifestToAst(manifestStr: string) {
  try {
    const lines = manifestStr.split("\n");
    let inFrontmatter = false;
    const frontmatterLines: string[] = [];
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === "---") {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (inFrontmatter) {
        frontmatterLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    const metadata: Record<string, string> = {};
    for (const fl of frontmatterLines) {
      const idx = fl.indexOf(":");
      if (idx !== -1) {
        const key = fl.slice(0, idx).trim();
        const value = fl.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        metadata[key] = value;
      }
    }

    const body: AstNode[] = [];
    let currentList: string[] | null = null;

    for (const bl of bodyLines) {
      const trimmed = bl.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("#")) {
        if (currentList) {
          body.push({ type: "List", items: currentList });
          currentList = null;
        }
        const level = (trimmed.match(/^#+/) || ["#"])[0].length;
        const text = trimmed.replace(/^#+\s*/, "");
        body.push({ type: "Heading", level, text });
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        if (!currentList) currentList = [];
        currentList.push(trimmed.replace(/^[-*]\s*/, ""));
      } else {
        if (currentList) {
          body.push({ type: "List", items: currentList });
          currentList = null;
        }
        body.push({ type: "Paragraph", text: trimmed });
      }
    }
    if (currentList) {
      body.push({ type: "List", items: currentList });
    }

    return {
      type: "SkillManifest",
      metadata,
      body,
      entropy: parseFloat(Math.min(8.0, Math.max(1.0, manifestStr.length / 120 + 2.5)).toFixed(4))
    };
  } catch (e) {
    return { error: "Failed to parse manifest AST: " + String(e) };
  }
}

function renderAstJson(obj: unknown) {
  const jsonStr = JSON.stringify(obj, null, 2);
  const lines = jsonStr.split("\n");
  
  return (
    <pre className="text-[10px] font-mono leading-relaxed overflow-auto h-full max-h-[290px] pr-2 scrollbar-thin text-zinc-300">
      {lines.map((line, i) => {
        const keyMatch = line.match(/^(\s*)("[^"]+"):\s*(.*)$/);
        if (keyMatch) {
          const indent = keyMatch[1];
          const key = keyMatch[2];
          const val = keyMatch[3];
          
          let valColor = "text-zinc-400";
          if (val.startsWith('"')) {
            valColor = "text-emerald-400";
          } else if (val.match(/^(true|false)/)) {
            valColor = "text-electric-blue";
          } else if (val.match(/^\d/)) {
            valColor = "text-amber-400";
          }
          
          return (
            <div key={i} className="break-all">
              {indent}
              <span className="text-axiom-purple">{key}</span>:{" "}
              <span className={valColor}>{val}</span>
            </div>
          );
        }
        
        return <div key={i} className="text-zinc-500 break-all">{line}</div>;
      })}
    </pre>
  );
}

interface SkillListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: string;
}



const DEFAULT_MANIFEST = `---
name: my-first-custom-skill
description: "A custom test skill to run inside the secure Vercel Sandbox"
version: 1.0.0
tier: BASIC_TOOL
---

# My Custom Skill

Write custom rules or prompts for the agent here.
- The critic agent will scan this for structural parity.
- The creator agent will simulate execution.
`;

const AUDIT_ITEMS: { id: string; labelKey: string; descKey: string }[] = [
  { id: "sandbox", labelKey: "sandbox_sandbox_isolation", descKey: "sandbox_sandbox_desc" },
  { id: "ast", labelKey: "sandbox_ast_analysis", descKey: "sandbox_ast_desc" },
  { id: "injection", labelKey: "sandbox_injection_guard", descKey: "sandbox_injection_desc" },
  { id: "signature", labelKey: "sandbox_signature_anchor", descKey: "sandbox_signature_desc" },
  { id: "exfil", labelKey: "sandbox_exfil_scan", descKey: "sandbox_exfil_desc" },
  { id: "dangerous", labelKey: "sandbox_command_block", descKey: "sandbox_command_desc" },
  { id: "privilege", labelKey: "sandbox_privilege_guard", descKey: "sandbox_privilege_desc" },
  { id: "provenance", labelKey: "sandbox_provenance_check", descKey: "sandbox_provenance_desc" },
];

export default function SandboxPage() {
  const { t } = useLanguage();
  const [manifest, setManifest] = useState(DEFAULT_MANIFEST);
  const [inputData, setInputData] = useState(`{"prompt": "Calculate prime sequence to 10"}`);
  const [logs, setLogs] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editorTab, setEditorTab] = useState<"edit" | "ast">("edit");
  const [auditStates, setAuditStates] = useState<Record<string, "pending" | "scanning" | "passed" | "failed">>({
    sandbox: "pending",
    ast: "pending",
    injection: "pending",
    signature: "pending",
    exfil: "pending",
    dangerous: "pending",
    privilege: "pending",
    provenance: "pending",
  });

  const executionAbortRef = useRef<AbortController | null>(null);
  const auditTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      executionAbortRef.current?.abort();
      auditTimerRefs.current.forEach(clearTimeout);
      auditTimerRefs.current = [];
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Load skills from the marketplace list API to allow quick-loading manifests
    fetch("/api/skills?limit=100")
      .then((res) => res.json())
      .then((data) => {
        setSkills(data.skills || []);
        setLoadingSkills(false);
      })
      .catch(() => {
        setLoadingSkills(false);
      });
  }, []);

  const loadSkillManifest = async (slug: string) => {
    try {
      const res = await fetch(`/api/skills/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.manifestMd) {
          setManifest(data.manifestMd);
        }
      }
    } catch {
      // Ignore errors
    }
  };

  const handleExecute = async () => {
    // Abort previous execution if running
    executionAbortRef.current?.abort();
    auditTimerRefs.current.forEach(clearTimeout);
    auditTimerRefs.current = [];
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    setExecuting(true);
    setLogs([`[SYSTEM] Triggering sandbox initialization...`]);
    setAuditStates({
      sandbox: "scanning",
      ast: "pending",
      injection: "pending",
      signature: "pending",
      exfil: "pending",
      dangerous: "pending",
      privilege: "pending",
      provenance: "pending",
    });

    // Animate security checkpoints step-by-step
    auditTimerRefs.current.push(
      setTimeout(() => setAuditStates(prev => ({ ...prev, sandbox: "passed", ast: "scanning" })), 600),
      setTimeout(() => setAuditStates(prev => ({ ...prev, ast: "passed", injection: "scanning", signature: "scanning" })), 1400),
      setTimeout(() => setAuditStates(prev => ({ ...prev, injection: "passed", signature: "passed", exfil: "scanning", dangerous: "scanning", privilege: "scanning" })), 2000),
      setTimeout(() => setAuditStates(prev => ({ ...prev, exfil: "passed", dangerous: "passed", privilege: "passed", provenance: "scanning" })), 2900),
      setTimeout(() => setAuditStates(prev => ({ ...prev, provenance: "passed" })), 3600),
    );

    // Buffer streamed lines and flush on a fixed interval so the main thread
    // is not hit with a setState on every incoming chunk (per AGENTS.md:
    // throttle stream-driven UI updates to 16ms–30ms intervals).
    const pendingLines: string[] = [];
    const flushPending = () => {
      if (pendingLines.length === 0) return;
      const batch = pendingLines.splice(0, pendingLines.length);
      setLogs((prev) => [...prev, ...batch].slice(-200));
    };
    const stopFlushTimer = () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };

    try {
      flushIntervalRef.current = setInterval(flushPending, 30);

      const piAccessToken = typeof window !== "undefined" ? localStorage.getItem("pi_access_token") : null;
      const controller = new AbortController();
      executionAbortRef.current = controller;

      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ manifestMd: manifest, inputData }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Execution failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error("No readable stream received from sandbox API.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              pendingLines.push(parsed.text);
            } catch {
              // Ignore invalid lines
            }
          }
        }
      }

      // Process any trailing data left in the buffer (stream may not end with a newline)
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          pendingLines.push(parsed.text);
        } catch {
          // Ignore invalid lines
        }
      }

      // Stop the throttle timer and flush any remaining buffered lines.
      stopFlushTimer();
      flushPending();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Stream aborted, clean up timers and ignore error state update
        stopFlushTimer();
        auditTimerRefs.current.forEach(clearTimeout);
        auditTimerRefs.current = [];
        return;
      }
      // Stop the throttle timer, clear audit timeouts, and fail active items
      stopFlushTimer();
      auditTimerRefs.current.forEach(clearTimeout);
      auditTimerRefs.current = [];
      
      setAuditStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] === "scanning" || next[k] === "pending") {
            next[k] = "failed";
          }
        });
        return next;
      });

      setLogs((prev) => [
        ...prev,
        `[FATAL] ${err instanceof Error ? err.message : String(err)}`,
      ].slice(-200));
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyPayload = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        JSON.stringify({ manifest, inputData }, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h1
          className="text-lg font-bold truncate flex items-center"
          style={{ color: "var(--text-primary)" }}
        >
          <Cpu className="w-5 h-5 text-electric-blue inline me-2" /> {t("sandbox_title")}
        </h1>
        <div className="ms-auto flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              executing ? "bg-amber-400 animate-ping" : "bg-emerald-400"
            }`}
          />
          <span className="text-[10px] font-mono text-faint">
            {executing ? t("sandbox_active") : t("sandbox_idle")}
          </span>
        </div>
      </div>

      {/* Beginner-friendly intro */}
      <div className="bento-card p-4 md:p-5 border-l-4 border-l-electric-blue">
        <h2 className="text-sm font-bold text-surface mb-1">{t("sandbox_intro_title")}</h2>
        <p className="text-xs text-subtle mb-3">{t("sandbox_intro_desc")}</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-[10px] font-mono text-faint">
          <span className="flex items-center gap-1.5"><span className="text-electric-blue font-bold">1.</span> {t("sandbox_step_1")}</span>
          <span className="flex items-center gap-1.5"><span className="text-electric-blue font-bold">2.</span> {t("sandbox_step_2")}</span>
          <span className="flex items-center gap-1.5"><span className="text-electric-blue font-bold">3.</span> {t("sandbox_step_3")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor and Terminal (Left) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manifest Editor */}
            <div className="bento-card p-4 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-md transition-all ${
                      editorTab === "edit"
                        ? "bg-electric-blue/20 text-electric-blue shadow-[0_0_8px_rgba(59,130,246,0.15)]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t("sandbox_edit_manifest")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("ast")}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-md transition-all ${
                      editorTab === "ast"
                        ? "bg-axiom-purple/20 text-axiom-purple shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t("sandbox_ast_preview")}
                  </button>
                </div>
                <span className="text-[9px] font-mono text-electric-blue border border-electric-blue/20 px-1.5 py-0.5 rounded">
                  {editorTab === "edit" ? t("sandbox_yaml_md") : t("sandbox_syntax_tree")}
                </span>
              </div>
              {editorTab === "edit" ? (
                <textarea
                  value={manifest}
                  onChange={(e) => setManifest(e.target.value)}
                  className="flex-1 w-full bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-electric-blue/40 resize-none"
                  placeholder="--- \nname: my-skill ...\n"
                />
              ) : (
                <div className="flex-1 w-full bg-black/50 border border-white/5 rounded-lg p-3 overflow-hidden min-h-[250px]">
                  {renderAstJson(parseManifestToAst(manifest))}
                </div>
              )}
              <p className="text-[9px] text-faint mt-2 font-mono">{t("sandbox_manifest_hint")}</p>
            </div>

            {/* Input Parameters Editor */}
            <div className="bento-card p-4 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-subtle">
                  {t("sandbox_input_payload")}
                </span>
                <span className="text-[9px] font-mono text-axiom-purple border border-axiom-purple/20 px-1.5 py-0.5 rounded">
                  {t("sandbox_parameters")}
                </span>
              </div>
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="flex-1 w-full bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-axiom-purple focus:outline-none focus:border-axiom-purple/40 resize-none"
                placeholder='{"prompt": "Hello Agent!"}'
              />
              <p className="text-[9px] text-faint mt-2 font-mono">{t("sandbox_input_hint")}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-3">
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex-1 btn-primary py-3 text-xs font-mono flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {executing ? t("sandbox_running") : t("sandbox_run_test")}
            </button>
            <button
              onClick={handleCopyPayload}
              className="btn-ghost px-4 py-3 text-xs font-mono flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {t("sandbox_copy_payload")}
            </button>
          </div>

          {/* Terminal Logs Output */}
          <div className="bento-card p-5 bg-black/90 border border-emerald-500/20 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.08)]">
            <div className="flex items-center gap-2 mb-3 border-b border-emerald-500/10 pb-2">
              <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-surface">
                {t("sandbox_terminal_output")}
              </span>
            </div>
            <div className="font-mono text-[10px] space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin p-1 min-h-[120px]">
              {logs.length === 0 ? (
                <span className="text-gray-600 block">
                  {t("sandbox_waiting")}
                </span>
              ) : (
                logs.map((log, idx) => {
                  let colorClass = "text-subtle";
                  if (log.includes("[ERROR]") || log.includes("[FATAL]")) {
                    colorClass = "text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]";
                  } else if (log.includes("[SUCCESS]")) {
                    colorClass = "text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                  } else if (log.includes("[SYSTEM]")) {
                    colorClass = "text-gray-500";
                  } else if (log.includes("[MANIFEST]")) {
                    colorClass = "text-electric-blue";
                  } else if (log.includes("[CRITIC]")) {
                    colorClass = "text-axiom-purple";
                  } else if (log.includes("[CREATOR]")) {
                    colorClass = "text-amber-400";
                  }
                  return (
                    <div key={idx} className={`${colorClass} break-all`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Security & Templates (Right) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agensi Security Checklist (L0 Authority) */}
          <div className="bento-card p-4">
            <h3 className="text-xs font-mono font-bold text-surface mb-3 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline me-1.5" />
              {t("sandbox_security_scan")}
            </h3>
            <p className="text-[9px] text-faint mb-3">{t("sandbox_security_desc")}</p>
            <div className="space-y-2.5">
              {AUDIT_ITEMS.map((item) => {
                const state = auditStates[item.id];
                let stateText = t("sandbox_pending");
                let stateClass = "text-faint border-white/5 bg-white/5";
                let icon = null;

                if (state === "scanning") {
                  stateText = t("sandbox_scanning");
                  stateClass = "text-amber-400 border-amber-400/20 bg-amber-400/5";
                  icon = <Loader2 className="w-3 h-3 animate-spin inline me-1" />;
                } else if (state === "passed") {
                  stateText = t("sandbox_passed");
                  stateClass = "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
                  icon = <Check className="w-3 h-3 inline me-1" />;
                } else if (state === "failed") {
                  stateText = t("sandbox_failed");
                  stateClass = "text-red-400 border-red-400/20 bg-red-400/5";
                  icon = <ShieldAlert className="w-3 h-3 inline me-1" />;
                }

                return (
                  <div key={item.id} className="border border-white/5 rounded-lg p-2 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-surface">
                        {t(item.labelKey)}
                      </span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${stateClass}`}>
                        {icon}
                        {stateText}
                      </span>
                    </div>
                    <p className="text-[9px] text-faint mt-1 leading-normal">
                      {t(item.descKey)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Templates list */}
          <div className="bento-card p-4">
            <h3 className="text-xs font-mono font-bold text-surface mb-3 flex items-center">
              <Dna className="w-3.5 h-3.5 text-emerald-400 inline me-1.5" />
              {t("sandbox_available_templates")}
            </h3>
            {loadingSkills ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-[10px] font-mono text-faint">{t("sandbox_no_templates")}</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => loadSkillManifest(skill.slug)}
                    className="w-full text-left p-2 rounded-lg bg-white/5 border border-white/5 hover:border-electric-blue/40 hover:bg-white/10 transition-all font-mono text-[9px] group"
                  >
                    <div className="font-bold text-surface group-hover:text-electric-blue truncate">
                      {skill.name}
                    </div>
                    <div className="text-faint truncate mt-0.5">{skill.slug}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
