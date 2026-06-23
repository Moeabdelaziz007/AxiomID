"use client";

import { useEffect, useState } from "react";
import { Users, Bot, Database, Shield } from "lucide-react";

interface Stats {
  users: number;
  agents: number;
  chapters: number;
  vectors: number;
}

/**
 * Displays protocol statistics and fades into view after the data loads.
 */
export default function StatsBar() {
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
          chapters: 114,
          vectors: 6236,
        });
      } catch {
        setStats({ users: 0, agents: 0, chapters: 114, vectors: 6236 });
      } finally {
        requestAnimationFrame(() => setVisible(true));
      }
    };
    fetchStats();
  }, []);

  const items = [
    { label: "Chapters Indexed", value: stats?.chapters ?? 114, icon: Database, color: "text-electric-blue" },
    { label: "Vectors Embedded", value: stats?.vectors ?? 6236, icon: Shield, color: "text-emerald-400" },
    { label: "Active Agents", value: stats?.agents ?? 0, icon: Bot, color: "text-axiom-purple" },
    { label: "Pioneers", value: stats?.users ?? 0, icon: Users, color: "text-amber-400" },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 sm:p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="text-center md:text-left p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{item.label}</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold font-mono text-zinc-100">
            {item.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
