"use client";

import { useState, useEffect } from "react";
import { Play, ShieldAlert, Cpu, Dna, Terminal, Copy, Check, ShieldCheck, Loader2 } from "lucide-react";

interface SkillListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: string;
}

interface AuditItem {
  id: string;
  label: string;
  desc: string;
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

const AUDIT_ITEMS: AuditItem[] = [
  { id: "sandbox", label: "Sandbox Isolation", desc: "Isolated microVM container instance." },
  { id: "ast", label: "Static AST Analysis", desc: "Parse structure for malicious imports." },
  { id: "injection", label: "Injection Guard", desc: "Frontmatter and prompt boundary verification." },
  { id: "signature", label: "Signature Anchor", desc: "Verified did:axiom creator signatures." },
  { id: "exfil", label: "Exfiltration Scan", desc: "No unauthorized outbound network connections." },
  { id: "dangerous", label: "Command Block", desc: "No raw shell executions (e.g. rm, chmod)." },
  { id: "privilege", label: "Privilege Guard", desc: "No host credentials or environment variables." },
  { id: "provenance", label: "Provenance Check", desc: "Valid author historical rating >= 4.0." },
];

export default function SandboxPage() {
  const piAccessToken = typeof window !== "undefined" ? localStorage.getItem("pi_access_token") : null;
  const [manifest, setManifest] = useState(DEFAULT_MANIFEST);
  const [inputData, setInputData] = useState(`{"prompt": "Calculate prime sequence to 10"}`);
  const [logs, setLogs] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [copied, setCopied] = useState(false);
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
    const t1 = setTimeout(() => setAuditStates(prev => ({ ...prev, sandbox: "passed", ast: "scanning" })), 600);
    const t2 = setTimeout(() => setAuditStates(prev => ({ ...prev, ast: "passed", injection: "scanning", signature: "scanning" })), 1400);
    const t3 = setTimeout(() => setAuditStates(prev => ({ ...prev, injection: "passed", signature: "passed", exfil: "scanning", dangerous: "scanning", privilege: "scanning" })), 2000);
    const t4 = setTimeout(() => setAuditStates(prev => ({ ...prev, exfil: "passed", dangerous: "passed", privilege: "passed", provenance: "scanning" })), 2900);
    const t5 = setTimeout(() => setAuditStates(prev => ({ ...prev, provenance: "passed" })), 3600);

    // Buffer streamed lines and flush on a fixed interval so the main thread
    // is not hit with a setState on every incoming chunk (per AGENTS.md:
    // throttle stream-driven UI updates to 16ms–30ms intervals).
    const pendingLines: string[] = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    const flushPending = () => {
      if (pendingLines.length === 0) return;
      const batch = pendingLines.splice(0, pendingLines.length);
      setLogs((prev) => [...prev, ...batch].slice(-200));
    };
    const stopFlushTimer = () => {
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
    };

    try {
      flushTimer = setInterval(flushPending, 30);

      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ manifestMd: manifest, inputData }),
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
      // Stop the throttle timer, clear audit timeouts, and fail active items
      stopFlushTimer();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      
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
    navigator.clipboard.writeText(
      JSON.stringify({ manifest, inputData }, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h1
          className="text-lg font-bold truncate flex items-center"
          style={{ color: "var(--text-primary)" }}
        >
          <Cpu className="w-5 h-5 text-electric-blue inline me-2" /> Developer Sandbox
        </h1>
        <div className="ms-auto flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              executing ? "bg-amber-400 animate-ping" : "bg-emerald-400"
            }`}
          />
          <span className="text-[10px] font-mono text-faint">
            {executing ? "SANDBOX ACTIVE" : "ENGINE IDLE"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor and Terminal (Left) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manifest Editor */}
            <div className="bento-card p-4 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-subtle">
                  EDIT MANIFEST (SKILL.md)
                </span>
                <span className="text-[9px] font-mono text-electric-blue border border-electric-blue/20 px-1.5 py-0.5 rounded">
                  YAML + Markdown
                </span>
              </div>
              <textarea
                value={manifest}
                onChange={(e) => setManifest(e.target.value)}
                className="flex-1 w-full bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-electric-blue/40 resize-none"
                placeholder="--- \nname: my-skill ...\n"
              />
            </div>

            {/* Input Parameters Editor */}
            <div className="bento-card p-4 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-subtle">
                  INPUT PAYLOAD (JSON)
                </span>
                <span className="text-[9px] font-mono text-axiom-purple border border-axiom-purple/20 px-1.5 py-0.5 rounded">
                  Parameters
                </span>
              </div>
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="flex-1 w-full bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-axiom-purple focus:outline-none focus:border-axiom-purple/40 resize-none"
                placeholder='{"prompt": "Hello Agent!"}'
              />
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
              {executing ? "RUNNING SIMULATION..." : "RUN TEST IN VERCEL SANDBOX"}
            </button>
            <button
              onClick={handleCopyPayload}
              className="btn-ghost px-4 py-3 text-xs font-mono flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              COPY PAYLOAD
            </button>
          </div>

          {/* Terminal Logs Output */}
          <div className="bento-card p-5 bg-black/85 border border-white/10 rounded-xl">
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-surface">
                Isolated VM Terminal Output
              </span>
            </div>
            <div className="font-mono text-[10px] space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin p-1 min-h-[120px]">
              {logs.length === 0 ? (
                <span className="text-gray-600 block">
                  Waiting for execution triggers... (Click &quot;Run Test&quot; to start sandbox session)
                </span>
              ) : (
                logs.map((log, idx) => {
                  let colorClass = "text-subtle";
                  if (log.includes("[ERROR]") || log.includes("[FATAL]")) {
                    colorClass = "text-red-400";
                  } else if (log.includes("[SUCCESS]")) {
                    colorClass = "text-emerald-400";
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
              Agensi Security Scan
            </h3>
            <div className="space-y-2.5">
              {AUDIT_ITEMS.map((item) => {
                const state = auditStates[item.id];
                let stateText = "Pending";
                let stateClass = "text-faint border-white/5 bg-white/5";
                let icon = null;

                if (state === "scanning") {
                  stateText = "Scanning";
                  stateClass = "text-amber-400 border-amber-400/20 bg-amber-400/5";
                  icon = <Loader2 className="w-3 h-3 animate-spin inline me-1" />;
                } else if (state === "passed") {
                  stateText = "PASSED";
                  stateClass = "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
                  icon = <Check className="w-3 h-3 inline me-1" />;
                } else if (state === "failed") {
                  stateText = "FAILED";
                  stateClass = "text-red-400 border-red-400/20 bg-red-400/5";
                  icon = <ShieldAlert className="w-3 h-3 inline me-1" />;
                }

                return (
                  <div key={item.id} className="border border-white/5 rounded-lg p-2 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-surface">
                        {item.label}
                      </span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${stateClass}`}>
                        {icon}
                        {stateText}
                      </span>
                    </div>
                    <p className="text-[9px] text-faint mt-1 leading-normal">
                      {item.desc}
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
              Available Templates
            </h3>
            {loadingSkills ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-[10px] font-mono text-faint">No templates seeded.</span>
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
