"use client";

import { useEffect, useState } from "react";
import { Users, Bot, Shield } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface Stats {
  users: number;
  agents: number;
}

/**
 * Displays protocol statistics and fades into view after the data loads.
 */
export default function StatsBar() {
  const { t } = useLanguage();
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
          users: s.registeredUsers ?? 0,
          agents: s.totalAgents ?? 0,
        });
      } catch {
        setStats({ users: 0, agents: 0 });
      } finally {
        requestAnimationFrame(() => setVisible(true));
      }
    };
    fetchStats();
  }, []);

  const items = [
    { label: t("pioneers_joined"), value: stats?.users ?? 0, icon: Users, color: "text-emerald-400", suffix: "+" },
    { label: t("agents_deployed"), value: stats?.agents ?? 0, icon: Bot, color: "text-electric-blue", suffix: "+" },
    { label: t("on_chain"), value: "100%", icon: Shield, color: "text-axiom-purple", suffix: "" },
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
          <p className="text-2xl md:text-3xl font-bold font-mono text-zinc-100">
            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}{item.suffix}
          </p>
        </div>
      ))}
    </div>
  );
}
