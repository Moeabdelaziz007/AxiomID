"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useWallet } from "../../context/wallet-context";
import { useLanguage } from "../../context/language-context";
import { getLevelProgress, getNextLevelXP, TIERS, Tier } from "@/lib/tiers";
import { createUserDid } from "@/lib/did";
import { Shield, User, Zap, CheckCircle, AtSign, MessageCircle, Key, Download, AlertTriangle, ArrowLeft } from "lucide-react";

interface LedgerEntry {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface StatusDetails {
  recentLedger: LedgerEntry[];
  stats: {
    totalActions: number;
    totalXP: number;
  };
}

type SidebarTab = "profile" | "accounts" | "ledger" | "settings";

const SIDEBAR_TABS: { id: SidebarTab; icon: typeof User; labelKey: string }[] = [
  { id: "profile", icon: User, labelKey: "settings_sidebar_profile" },
  { id: "accounts", icon: AtSign, labelKey: "settings_sidebar_accounts" },
  { id: "ledger", icon: Zap, labelKey: "settings_sidebar_ledger" },
  { id: "settings", icon: Shield, labelKey: "settings_sidebar_settings" },
];

export default function SettingsPage() {
  const { user, connectWallet, claimAction, refreshUser } = useWallet();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");
  const [statusDetails, setStatusDetails] = useState<StatusDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!(localStorage.getItem("axiomid_wallet") || localStorage.getItem("pi_access_token"));
  });

  // Modal states
  const [activePlatform, setActivePlatform] = useState<"connect_wallet" | "security_circle" | "complete_kyc" | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [activeVc, setActiveVc] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  // Disconnect confirmation
  const [disconnectPlatform, setDisconnectPlatform] = useState<"connect_wallet" | "security_circle" | "complete_kyc" | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const disconnectDialogRef = useRef<HTMLDialogElement>(null);

  // Refs for dialogs
  const connectDialogRef = useRef<HTMLDialogElement>(null);
  const vcDialogRef = useRef<HTMLDialogElement>(null);

  const fetchStatusDetails = async () => {
    try {
      const storedToken = localStorage.getItem("pi_access_token");
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }
      const res = await fetch("/api/user/status", { headers });
      if (res.ok) {
        const data = await res.json();
        setStatusDetails({
          recentLedger: data.recentLedger || [],
          stats: data.stats || { totalActions: 0, totalXP: 0 },
        });
      }
    } catch {
      // silent
    } finally {
      setDetailsLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) fetchStatusDetails();
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDialogBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = e.currentTarget;
    const rect = dialog.getBoundingClientRect();
    const isInContent =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!isInContent) {
      dialog.close();
    }
  };

  const openConnectModal = (platform: "connect_wallet" | "security_circle" | "complete_kyc") => {
    setActivePlatform(platform);
    setHandleInput("");
    connectDialogRef.current?.showModal();
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim() || !activePlatform) return;

    setSubmittingClaim(true);
    const actionType = activePlatform;
    const success = await claimAction(actionType, { handle: handleInput.trim() });
    setSubmittingClaim(false);

    if (success) {
      connectDialogRef.current?.close();
      await fetchStatusDetails();
    }
  };

  const openVcModal = (actionType: string) => {
    const stamp = user?.stamps?.find((s) => s.type === actionType);
    if (!stamp) return;
    try {
      const raw = stamp.metadata;
      if (!raw || typeof raw !== "string" || raw.trim() === "" || raw.trim() === "{}") {
        setActiveVc({ error: t("vc_no_data") });
        vcDialogRef.current?.showModal();
        return;
      }
      const parsedVc = JSON.parse(raw);
      if (!parsedVc || typeof parsedVc !== "object" || Object.keys(parsedVc).length === 0) {
        setActiveVc({ error: t("vc_empty_metadata") });
      } else {
        setActiveVc(parsedVc);
      }
    } catch {
      setActiveVc({ error: t("vc_parse_error") });
    }
    vcDialogRef.current?.showModal();
  };

  const copyVcPayload = () => {
    if (!activeVc) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(activeVc, null, 2));
    }
    setCopied(true);
    toast.success(t('settings_vc_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const isPlatformConnected = (platform: "connect_wallet" | "security_circle" | "complete_kyc") => {
    return !!user?.stamps?.some((s) => s.type === platform);
  };

  const openDisconnectModal = (platform: "connect_wallet" | "security_circle" | "complete_kyc") => {
    setDisconnectPlatform(platform);
    disconnectDialogRef.current?.showModal();
  };

  const handleDisconnect = async () => {
    if (!disconnectPlatform) return;
    setDisconnecting(true);
    try {
      const storedToken = localStorage.getItem("pi_access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }
      const res = await fetch("/api/social/disconnect", {
        method: "POST",
        headers,
        body: JSON.stringify({ platform: disconnectPlatform }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || t('settings_disconnect_failed'));
        return;
      }

      disconnectDialogRef.current?.close();
      setDisconnectPlatform(null);
      await Promise.all([fetchStatusDetails(), refreshUser()]);
    } catch {
      toast.error(t('settings_disconnect_failed'));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleExportData = () => {
    if (!user) return;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      protocol: "AxiomID",
      passport: {
        piUsername: user.piUsername,
        walletAddress: user.walletAddress,
        did: user.did || createUserDid(user.id),
        tier: user.tier,
        xp: user.xp,
        trustScore: user.trustScore,
        kycStatus: user.kycStatus,
        agentId: user.agent?.id,
        createdAt: user.createdAt,
      },
      stamps: user.stamps || [],
      xpLedger: statusDetails?.recentLedger || [],
      stats: statusDetails?.stats || { totalActions: 0, totalXP: 0 },
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axiomid-passport-${user.piUsername || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Passport data exported");
  };

  const PLATFORMS: { id: "connect_wallet" | "security_circle" | "complete_kyc"; icon: React.ReactNode; label: string; xp: number }[] = [
    { id: "connect_wallet", icon: <AtSign className="w-4 h-4" />, label: "Wallet Connection", xp: 100 },
    { id: "security_circle", icon: <MessageCircle className="w-4 h-4" />, label: "Security Circle", xp: 150 },
    { id: "complete_kyc", icon: <Key className="w-4 h-4" />, label: "KYC Verification", xp: 200 },
  ];

  // XP Progress Calculation
  const xp = user?.xp || 0;
  const tier = user?.tier || "Visitor";
  const range = {
    min: TIERS[tier as Tier] ?? 0,
    max: getNextLevelXP(tier as Tier) ?? 2500,
  };
  const progressPercent = getLevelProgress(xp, tier as Tier);

  // User initials for avatar
  const userInitials = user?.piUsername
    ? user.piUsername.slice(0, 2).toUpperCase()
    : user?.did
      ? user.did.slice(-2).toUpperCase()
      : "??";

  if (!user) {
    return (
      <div className="bento-card max-w-md w-full mx-auto p-8 text-center backdrop-blur-md" style={{ border: '1px solid var(--card-border)' }}>
        <div className="text-4xl mb-4"><Shield className="w-8 h-8 text-emerald-400" /></div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings_sovereign_title')}</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('settings_wallet_prompt')}</p>
        <button onClick={connectWallet} className="btn-primary w-full py-3">
          {t('connect_wallet')}
        </button>
        <div className="mt-6 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:text-neon-green transition-colors">{t('settings_back_landing')}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white/70 transition-colors mb-6">
          <ArrowLeft className="w-3 h-3" />
          {t('settings_dashboard_link')}
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {/* Avatar */}
              <div className="hidden lg:flex flex-col items-center mb-4 pb-4 border-b border-white/5 w-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-electric-blue to-neon-green flex items-center justify-center text-black font-mono font-bold text-lg mb-3">
                  {userInitials}
                </div>
                <p className="font-mono text-xs text-white/60 text-center truncate max-w-full">{user.piUsername || "Pioneer"}</p>
                <p className="font-mono text-[10px] text-white/30 mt-0.5">{tier.toUpperCase()} TIER</p>
              </div>

              {SIDEBAR_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-mono text-xs whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-white/[0.08] text-white border border-white/10"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 ${isActive ? "text-neon-green" : ""}`} />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <section className="bento-card p-6 backdrop-blur-md" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-neon-green"><User className="w-5 h-5" /></span> {t('settings_profile_title')}
                </h2>
                <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>{t('settings_profile_helper')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                  <div className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings_pi_network_id')}</span>
                    <p className="text-base" style={{ color: 'var(--text-primary)' }}>{user.piUsername || t('authenticated_pioneer')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings_stellar_wallet')}</span>
                    <p className="text-xs truncate max-w-full text-ellipsis" style={{ color: 'var(--text-primary)' }} title={user.walletAddress}>
                      {user.walletAddress}
                    </p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings_sovereign_did')}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={user.did || createUserDid(user.id)}
                        className="rounded px-2 py-1 text-xs text-neon-green flex-1 font-mono outline-none"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--card-border)' }}
                      />
                      <button
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(user.did || createUserDid(user.id));
                          }
                        }}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        {t('settings_copy')}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('settings_identity_status')}</span>
                    <div>
                      {user.kycStatus === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-neon-green/10 text-neon-green border border-neon-green/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> {t('settings_verified_human')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> {t('settings_pending_kyc')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* XP & Tiers + Progress (always visible under Profile) */}
            {activeTab === "profile" && (
              <section className="bento-card p-6 backdrop-blur-md mt-6" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="text-electric-blue"><Zap className="w-5 h-5" /></span> {t('settings_progression_title')}
                  </h2>
                  <span className="text-electric-blue font-mono text-sm">{xp} {t('total_xp')}</span>
                </div>
                <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>{t('settings_progression_helper')}</p>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="none" />
                      <circle
                        cx="50" cy="50" r="40"
                        stroke="url(#progress-grad-settings)"
                        strokeWidth="8" fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                      <defs>
                        <linearGradient id="progress-grad-settings" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00ff41" />
                          <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-bold font-mono text-white">{progressPercent.toFixed(0)}%</span>
                      <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{t('settings_progress_label')}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">{t('current_tier')}</span>
                        <p className="text-xl font-black tracking-wider text-white">{tier.toUpperCase()}</p>
                      </div>
                      <div className="text-end text-[10px] font-mono text-zinc-400">
                        {xp >= 1000 ? t('settings_max_level') : `${(range.max - xp).toLocaleString()} ${t('settings_xp_needed')}`}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-600 border-t border-white/5 pt-2">
                      <span>{range.min.toLocaleString()} XP</span>
                      <span>{range.max.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Linked Accounts Tab */}
            {activeTab === "accounts" && (
              <section className="bento-card p-6 backdrop-blur-md" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-axiom-purple">🔗</span> {t('settings_social_title')}
                </h2>
                <p className="text-xs mb-6 font-mono" style={{ color: 'var(--text-muted)' }}>
                  {t('settings_social_helper')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLATFORMS.map(({ id, icon, label, xp: platformXp }) => {
                    const connected = isPlatformConnected(id);
                    const hoverStyle =
                      id === "connect_wallet"
                        ? "hover:border-sky-500/30 hover:bg-sky-500/[0.01]"
                        : id === "security_circle"
                          ? "hover:border-indigo-500/30 hover:bg-indigo-500/[0.01]"
                          : "hover:border-red-500/30 hover:bg-red-500/[0.01]";
                    return (
                      <div
                        key={id}
                        className={`flex flex-col justify-between p-4 rounded-2xl border border-white/5 bg-[#14161d] transition-all duration-300 ${hoverStyle} min-h-[140px]`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-zinc-300">
                            {icon}
                          </div>
                          {connected ? (
                            <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                              {t('connected')}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-500">+{platformXp} XP</span>
                          )}
                        </div>
                        <div className="mt-4">
                          <h4 className="text-xs font-bold text-white font-mono">{label}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{t('settings_xp_reward')} +{platformXp} XP</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          {connected ? (
                            <>
                              <button onClick={() => openDisconnectModal(id)} className="btn-ghost text-[10px] font-mono text-red-400 hover:text-red-300 px-2 py-1">
                                {t('settings_disconnect_btn')}
                              </button>
                              <button onClick={() => openVcModal(id)} className="btn-ghost text-[10px] font-mono py-1">
                                {t('inspect_vc')}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => openConnectModal(id)} className="btn-primary text-[10px] font-mono w-full text-center py-1">
                              {t('settings_connect_btn')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* XP Ledger Tab */}
            {activeTab === "ledger" && (
              <section className="bento-card p-6 backdrop-blur-md" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-yellow-500">📜</span> {t('settings_ledger_title')}
                </h2>
                <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>{t('settings_ledger_helper')}</p>
                {detailsLoading ? (
                  <div className="space-y-2 py-4">
                    <div className="h-6 rounded animate-pulse" style={{ background: 'var(--bg-card)' }} />
                    <div className="h-6 rounded animate-pulse w-5/6" style={{ background: 'var(--bg-card)' }} />
                  </div>
                ) : !statusDetails || statusDetails.recentLedger.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{t('settings_no_tx')}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{t('settings_ledger_empty_helper')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start font-mono text-xs">
                      <thead>
                        <tr className="border-b pb-2" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
                          <th className="py-2">{t('settings_tx_objective')}</th>
                          <th className="py-2 text-end">{t('settings_balance_shift')}</th>
                          <th className="py-2 text-end">{t('settings_timestamp')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusDetails.recentLedger.map((entry) => (
                          <tr key={entry.id} className="border-b transition-colors" style={{ borderColor: 'var(--card-border)' }}>
                            <td className="py-3 uppercase font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{entry.reason.replaceAll("_", " ")}</td>
                            <td className={`py-3 text-end ${entry.amount >= 0 ? "text-neon-green" : "text-red-500"}`}>
                              {entry.amount >= 0 ? `+${entry.amount}` : entry.amount} XP
                            </td>
                            <td className="py-3 text-end" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Settings Tab: Export + Danger Zone */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Export Data */}
                <section className="bento-card p-6 backdrop-blur-md" style={{ border: '1px solid var(--card-border)', background: 'var(--bg-card)' }}>
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="text-electric-blue"><Download className="w-5 h-5" /></span> {t('settings_export_data')}
                  </h2>
                  <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>{t('settings_export_desc')}</p>
                  <button
                    onClick={handleExportData}
                    className="btn-primary text-xs font-mono px-6 py-2.5 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('settings_export_btn')}
                  </button>
                </section>

                {/* Danger Zone */}
                <section className="bento-card p-6 backdrop-blur-md border-red-500/20" style={{ background: 'var(--bg-card)' }}>
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" /> {t('settings_danger_zone')}
                  </h2>
                  <p className="text-xs mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>{t('settings_danger_desc')}</p>
                  <div className="space-y-3">
                    {PLATFORMS.filter(({ id }) => isPlatformConnected(id)).map(({ id, label }) => (
                      <div key={id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-white/5 bg-white/[0.02]">
                        <span className="font-mono text-xs text-white/60">{label}</span>
                        <button
                          onClick={() => openDisconnectModal(id)}
                          className="text-[10px] font-mono text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
                        >
                          {t('settings_disconnect_btn')}
                        </button>
                      </div>
                    ))}
                    {PLATFORMS.every(({ id }) => !isPlatformConnected(id)) && (
                      <p className="text-xs font-mono text-white/30 py-4 text-center">{t('settings_ledger_empty_helper')}</p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal 1: Connect Modal Dialog */}
      <dialog
        ref={connectDialogRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="connect-dialog-title"
        className="bento-card max-w-md w-full bg-black/90 border border-white/15 backdrop-blur-xl text-surface rounded-2xl p-0"
      >
        <div className="p-6">
          <h3 id="connect-dialog-title" className="text-lg font-bold mb-2 flex items-center gap-2">
            {t('settings_link_profile').replace('{platform}', (activePlatform || "Account").toUpperCase())}
          </h3>
          <p className="text-xs text-subtle font-mono mb-4">
            {t('settings_link_desc')}
          </p>
          <form onSubmit={handleConnectSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="handle-input" className="text-xs text-subtle font-mono">
                {activePlatform === "complete_kyc" ? t('settings_link_email_label') : t('settings_link_handle_label')}
              </label>
              <input
                id="handle-input"
                type={activePlatform === "complete_kyc" ? "email" : "text"}
                required
                placeholder={activePlatform === "complete_kyc" ? t('settings_link_email_placeholder') : t('settings_link_placeholder')}
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-surface focus:border-neon-green outline-none font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => connectDialogRef.current?.close()} className="btn-ghost text-xs px-4 py-2">
                {t('cancel')}
              </button>
              <button type="submit" disabled={submittingClaim || !handleInput.trim()} className="btn-primary text-xs px-4 py-2">
                {submittingClaim ? t('settings_signing') : t('settings_confirm_claim')}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Modal 2: VC Inspector Modal Dialog */}
      <dialog
        ref={vcDialogRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="vc-dialog-title"
        className="bento-card max-w-xl w-full bg-black/95 border border-white/15 backdrop-blur-2xl text-surface rounded-2xl p-0"
      >
        <div className="p-6">
          <h3 id="vc-dialog-title" className="text-lg font-bold mb-1 flex items-center gap-2">
            {t('settings_vc_title')}
          </h3>
          <p className="text-xs text-subtle font-mono mb-4">
            {t('settings_vc_desc')}
          </p>
          <pre className="font-mono text-[10px] leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 overflow-auto max-h-80 text-neon-green whitespace-pre-wrap select-all">
            {JSON.stringify(activeVc, null, 2)}
          </pre>
          <div className="flex gap-2 justify-end pt-4 border-t border-white/10 mt-4">
            <button onClick={copyVcPayload} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
              {copied ? <span className="flex items-center gap-1.5">{t('copied')} <CheckCircle className="w-4 h-4 text-emerald-400" /></span> : t('copy_payload')}
            </button>
            <button onClick={() => vcDialogRef.current?.close()} className="btn-ghost text-xs px-4 py-2">
              {t('close')}
            </button>
          </div>
        </div>
      </dialog>

      {/* Modal 3: Disconnect Confirmation Dialog */}
      <dialog
        ref={disconnectDialogRef}
        onClick={handleDialogBackdropClick}
        aria-labelledby="disconnect-dialog-title"
        className="bento-card max-w-sm w-full bg-black/90 border border-white/15 backdrop-blur-xl text-surface rounded-2xl p-0"
      >
        <div className="p-6">
          <h3 id="disconnect-dialog-title" className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('settings_confirm_title')}
          </h3>
          <p className="text-sm font-mono mb-6" style={{ color: 'var(--text-secondary)' }}>
            {t('settings_confirm_disconnect').replace('{platform}', (disconnectPlatform || "").toUpperCase())}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { disconnectDialogRef.current?.close(); setDisconnectPlatform(null); }}
              disabled={disconnecting}
              className="btn-ghost text-xs px-4 py-2"
            >
              {t('settings_confirm_cancel')}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs px-4 py-2 rounded-lg font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {disconnecting ? t('settings_disconnecting') : t('settings_confirm_action')}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
