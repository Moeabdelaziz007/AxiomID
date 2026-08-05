"use client";

import { useLanguage } from "@/app/context/language-context";
import { Shield, Zap, CheckCircle, Link2, Star } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "claim" | "verify" | "deploy" | "link" | "stamp";
  description: string;
  timestamp: string;
}

const ICON_MAP = {
  claim: <Zap className="w-3.5 h-3.5 text-amber-400" />,
  verify: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
  deploy: <CheckCircle className="w-3.5 h-3.5 text-electric-blue" />,
  link: <Link2 className="w-3.5 h-3.5 text-purple-400" />,
  stamp: <Star className="w-3.5 h-3.5 text-amber-400" />,
};

function getRelativeTime(dateStr: string, lang: string): string {
  const parsed = new Date(dateStr).getTime();
  if (Number.isNaN(parsed)) return lang === "ar" ? "الآن" : "just now";
  const diff = Date.now() - parsed;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ar" ? "الآن" : "just now";

  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
    if (mins < 60) return rtf.format(-mins, "minute");
    const hours = Math.floor(mins / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    if (days < 30) return rtf.format(-days, "day");
    const months = Math.floor(days / 30);
    return rtf.format(-months, "month");
  } catch {
    if (mins < 60) return lang === "ar" ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return lang === "ar" ? `منذ ${hours} ساعة` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return lang === "ar" ? `منذ ${days} يوم` : `${days}d ago`;
    const months = Math.floor(days / 30);
    return lang === "ar" ? `منذ ${months} شهر` : `${months}mo ago`;
  }
}

function buildRecentActivity(user: {
  xp: number;
  trustScore: number;
  kycStatus?: string;
  tier: string;
  createdAt: string;
}): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const now = new Date().toISOString();

  if (user.kycStatus === "verified") {
    activities.push({ id: "kya", type: "verify", description: "KYA Identity Verified", timestamp: now });
  }
  if (user.xp >= 100) {
    activities.push({ id: "stamp-1", type: "stamp", description: "First Stamp Claimed", timestamp: now });
  }
  if (user.xp >= 500) {
    activities.push({ id: "stamp-500", type: "stamp", description: "Advanced Stamp Collected", timestamp: now });
  }
  if (user.tier !== "Visitor") {
    activities.push({ id: "tier-up", type: "deploy", description: `Promoted to ${user.tier}`, timestamp: now });
  }
  activities.push({ id: "passport", type: "claim", description: "Sovereign Passport Created", timestamp: user.createdAt });

  return activities.slice(0, 5);
}

export function RecentActivity({ user }: { user: { xp: number; trustScore: number; kycStatus?: string; tier: string; createdAt: string } }) {
  const { t, language } = useLanguage();
  const activities = buildRecentActivity(user);

  if (activities.length === 0) {
    return (
      <div className="bento-card p-5 text-center text-xs text-faint font-mono">
        {t("no_activity")}
      </div>
    );
  }

  return (
    <div className="bento-card p-5">
      <h3 className="text-xs font-bold font-mono text-faint uppercase tracking-widest mb-4">
        {t("recent_activity")}
      </h3>
      <div className="space-y-2">
        {activities.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-glass bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
            <div className="w-7 h-7 rounded-lg bg-glass border border-white/[0.06] flex items-center justify-center shrink-0">
              {ICON_MAP[a.type]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-surface font-mono block truncate">{a.description}</span>
            </div>
            <span className="text-[9px] text-faint font-mono shrink-0" suppressHydrationWarning>
              {getRelativeTime(a.timestamp, language)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
