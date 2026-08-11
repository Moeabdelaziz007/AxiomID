"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Bot, Shield, Sparkles } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

interface Stats {
  users: number;
  agents: number;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  suffix: string;
}

const GATEWAY_HEALTH_URL = "https://skills.axiomid.app/llms.txt";

/**
 * Displays protocol statistics using design system tokens.
 * When values are 0, shows "Early Access" instead of discouraging zero counts.
 */
export default function StatsBar() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [gatewayOk, setGatewayOk] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    const controller = new AbortController();

    const probeGateway = async () => {
      try {
        const res = await fetch(GATEWAY_HEALTH_URL, { signal: controller.signal });
        if (!controller.signal.aborted) setGatewayOk(res.ok);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError" && !controller.signal.aborted) {
          setGatewayOk(false);
        }
      }
    };
    probeGateway();

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

  const items = useMemo((): StatItem[] => [
    {
      label: t("pioneers_joined"),
      value: hasUsers ? (stats?.users ?? 0).toLocaleString() : "Early Access",
      icon: Users,
      colorClass: "text-emerald-400",
      suffix: hasUsers ? "+" : "",
    },
    {
      label: t("agents_deployed"),
      value: hasAgents ? (stats?.agents ?? 0).toLocaleString() : "Early Access",
      icon: Bot,
      colorClass: "text-electric-blue",
      suffix: hasAgents ? "+" : "",
    },
    {
      label: t("gateway_status"),
      value: gatewayOk ? t("live") : t("degraded"),
      icon: Shield,
      colorClass: gatewayOk ? "text-emerald-400" : "text-amber-400",
      suffix: "",
    },
  ], [t, language, stats, hasUsers, hasAgents, gatewayOk]);

  return (
    <div
      className="grid grid-cols-3 gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-surface-deep/50 backdrop-blur-sm transition-all duration-500 elevation-2"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="text-center p-3 rounded-xl hover:bg-surface-hover transition-colors">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <item.icon className={`w-3.5 h-3.5 ${item.colorClass}`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-subtle">{item.label}</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold font-mono text-surface">
            {item.value}{item.suffix}
          </p>
        </div>
      ))}
    </div>
  );
}