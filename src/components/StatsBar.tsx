"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Bot, Shield, Sparkles } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface Stats {
  users: number;
  agents: number;
}


/**
 * Displays protocol statistics. When values are 0, shows motivational copy
 * instead of discouraging zero counts.
 */
export default function StatsBar() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/status", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Status fetch failed: ${res.status}`);
        }
        const data = await res.json();
        const s = data.stats || {};

        if (!controller.signal.aborted) {
          setStats({
            users: s.registeredUsers ?? 0,
            agents: s.totalAgents ?? 0,
          });
          requestAnimationFrame(() => {
            if (!controller.signal.aborted) setVisible(true);
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError' && !controller.signal.aborted) {
          setStats({ users: 0, agents: 0 });
          requestAnimationFrame(() => {
            if (!controller.signal.aborted) setVisible(true);
          });
        }
      }
    };
    fetchStats();

    return () => controller.abort();
  }, []);

  const hasUsers = (stats?.users ?? 0) > 0;
  const hasAgents = (stats?.agents ?? 0) > 0;

  const items = useMemo(() => [
    {
      label: t("pioneers_joined"),
      value: hasUsers ? (stats?.users ?? 0).toLocaleString() : "Early Access",
      icon: Users,
      color: "text-emerald-400",
      suffix: hasUsers ? "+" : "",
      fallback: null,
    },
    {
      label: t("agents_deployed"),
      value: hasAgents ? (stats?.agents ?? 0).toLocaleString() : "Early Access",
      icon: Bot,
      color: "electric-blue",
      suffix: hasAgents ? "+" : "",
      fallback: null,
    },
    {
      label: t("on_chain"),
      value: "100%",
      icon: Shield,
      color: "text-axiom-purple",
      suffix: "",
      fallback: null,
    },
  ], [t, language, stats, hasUsers, hasAgents]);

  return (
    <div
      className="grid grid-cols-3 gap-4 p-5 sm:p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="text-center p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <item.icon className={`w-3.5 h-3.5 ${item.color === 'electric-blue' ? 'text-electric-blue' : item.color}`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{item.label}</span>
          </div>
          {item.value !== null ? (
            <p className="text-2xl md:text-3xl font-bold font-mono text-zinc-100">
              {item.value}{item.suffix}
            </p>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-xs font-mono text-amber-400/80">
                {item.fallback}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
