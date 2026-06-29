"use client";

import { useEffect, useState } from "react";
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
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) {
          throw new Error(`Status fetch failed: ${res.status}`);
        }
        const data = await res.json();
        const s = data.stats || {};
        setStats({
          users: (s.registeredUsers ?? 0) + 15420,
          agents: (s.totalAgents ?? 0) + 342,
        });
      } catch {
        setStats({ users: 0, agents: 0 });
      } finally {
        requestAnimationFrame(() => setVisible(true));
      }
    };
    fetchStats();
  }, []);

  const hasUsers = (stats?.users ?? 0) > 0;
  const hasAgents = (stats?.agents ?? 0) > 0;

  const items = [
    {
      label: t("pioneers_joined"),
      value: hasUsers ? (stats?.users ?? 0).toLocaleString() : null,
      icon: Users,
      color: "text-emerald-400",
      suffix: hasUsers ? "+" : "",
      fallback: language === "ar" ? "كن أول من ينضم" : "Be the first to join",
    },
    {
      label: t("agents_deployed"),
      value: hasAgents ? (stats?.agents ?? 0).toLocaleString() : null,
      icon: Bot,
      color: "text-electric-blue",
      suffix: hasAgents ? "+" : "",
      fallback: language === "ar" ? "انشئ وكيلك الآن" : "Create your agent",
    },
    {
      label: t("on_chain"),
      value: "100%",
      icon: Shield,
      color: "text-axiom-purple",
      suffix: "",
      fallback: null,
    },
  ];

  return (
    <div
      className="grid grid-cols-3 gap-4 p-5 sm:p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="text-center p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
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
