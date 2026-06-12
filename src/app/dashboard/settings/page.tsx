"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWallet } from "../../context/wallet-context";
import { ErrorBanner } from "@/components/ErrorBanner";
import { getLevelProgress, getNextLevelXP, TIERS, Tier } from "@/lib/tiers";
import { useLanguage } from "../../context/language-context";
import LanguageToggle from "@/components/LanguageToggle";

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

/**
 * Render the AxiomID Settings page, presenting sovereign profile, progression, verifiable social bindings, and the local action ledger.
 *
 * Shows a centered wallet connect prompt when no user is present; when a user is connected, renders the DID/wallet/KYC section, XP/tier progression, social identifier connect/inspect controls (with VC inspector and copy), and the cryptographic action ledger. Also manages dialog lifecycle, fetching of status/ledger details, and clipboard actions for VC payloads.
 *
 * @returns The page's JSX element: either a centered connect prompt (when no wallet is connected) or the full settings UI with profile, progression, social binding controls, ledger, and modal dialogs for claiming connections and inspecting/copying Verifiable Credential payloads.
 */
export default function SettingsPage() {
  const { user, connectWallet, claimAction } = useWallet();
  const { t, language } = useLanguage();
  const [statusDetails, setStatusDetails] = useState<StatusDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  // Modal states
  const [activePlatform, setActivePlatform] = useState<"twitter" | "discord" | "google" | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [activeVc, setActiveVc] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  // Refs for dialogs (W3C standard dialog controls)
  const connectDialogRef = useRef<HTMLDialogElement>(null);
  const vcDialogRef = useRef<HTMLDialogElement>(null);

  // Fetch status details (XP Ledger logs)
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
    } catch (err) {
      console.error("Failed to fetch ledger logs:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        fetchStatusDetails();
      });
    } else {
      queueMicrotask(() => {
        setDetailsLoading(false);
      });
    }
  }, [user]);

  // Handle outside click backdrop dismiss for dialogs (Standard fallback for <dialog closedby>)
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

  const openConnectModal = (platform: "twitter" | "discord" | "google") => {
    setActivePlatform(platform);
    setHandleInput("");
    connectDialogRef.current?.showModal();
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim() || !activePlatform) return;

    setSubmittingClaim(true);
    const actionType = `connect_${activePlatform}`;
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
      // Stamp metadata stores the stringified W3C Verifiable Credential object
      const parsedVc = JSON.parse(stamp.metadata || "{}");
      setActiveVc(parsedVc);
      vcDialogRef.current?.showModal();
    } catch {
      setActiveVc({ error: "Failed to parse Verifiable Credential payload." });
      vcDialogRef.current?.showModal();
    }
  };

  const copyVcPayload = () => {
    if (!activeVc) return;
    navigator.clipboard.writeText(JSON.stringify(activeVc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPlatformConnected = (platform: "twitter" | "discord" | "google") => {
    return !!user?.stamps?.some((s) => s.type === `connect_${platform}`);
  };

  // XP Progress Calculation
  const xp = user?.xp || 0;
  const tier = user?.tier || "Visitor";
  const range = {
    min: TIERS[tier as Tier] ?? 0,
    max: getNextLevelXP(tier as Tier) ?? 2500,
  };
  const progressPercent = getLevelProgress(xp, tier as Tier);

  if (!user) {
    return (
      <main className="min-h-screen bg-grid flex items-center justify-center p-4">
        <div className="scanline" />
        <div className="bento-card max-w-md w-full p-8 text-center border border-white/10 backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-neon-green font-bold text-3xl">A</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sovereign Settings</h2>
          <p className="text-gray-400 mb-6 text-sm">Please connect your wallet to access profile details and link accounts.</p>
          <button onClick={connectWallet} className="btn-primary w-full py-3">
            CONNECT WALLET
          </button>
          <div className="mt-6 text-xs text-gray-500 font-mono">
            <Link href="/" className="hover:text-neon-green transition-colors">← Back to landing</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-grid">
      <div className="scanline" />
      <ErrorBanner />

      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green/20 to-electric-blue/20 flex items-center justify-center">
              <span className="text-neon-green font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{t("settings_title")}</h1>
              <p className="text-xs text-gray-400 font-mono">{t("settings_desc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/dashboard" className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
              {language === "ar" ? "← لوحة التحكم" : "← DASHBOARD"}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Section 1: Profile Details */}
        <section className="bento-card p-6 border border-white/10 bg-black/40 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-neon-green">👤</span> Sovereign Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div className="space-y-1">
              <span className="text-gray-500 text-xs">PI NETWORK ID</span>
              <p className="text-white text-base">{user.piUsername || "Authenticated Pioneer"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 text-xs">STELLAR WALLET</span>
              <p className="text-white text-xs truncate max-w-full text-ellipsis" title={user.walletAddress}>
                {user.walletAddress}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <span className="text-gray-500 text-xs">SOVEREIGN DID</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={user.did || `did:axiom:user-${user.id}`}
                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-neon-green flex-1 font-mono outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user.did || `did:axiom:user-${user.id}`);
                  }}
                  className="btn-ghost text-xs px-2 py-1"
                >
                  COPY
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 text-xs">IDENTITY STATUS (KYA)</span>
              <div>
                {user.kycStatus === "VERIFIED" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-neon-green/10 text-neon-green border border-neon-green/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> Verified Human
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Pending KYC Claim
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: XP & Tiers */}
        <section className="bento-card p-6 border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-electric-blue">⚡</span> Progression & Experience
            </h2>
            <span className="text-electric-blue font-mono text-sm">{xp} Total XP</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-gray-500 text-xs font-mono">CURRENT TIER</span>
                <p className="text-2xl font-black text-white tracking-wider">{tier.toUpperCase()}</p>
              </div>
              <div className="text-right text-xs text-gray-400 font-mono">
                {progressPercent.toFixed(0)}% to level {xp >= 1000 ? "Max" : "Up"}
              </div>
            </div>
            <div className="h-3 bg-white/15 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-neon-green to-electric-blue transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>{range.min} XP</span>
              <span>{range.max} XP</span>
            </div>
          </div>
        </section>

        {/* Section 3: Social Binding & Credentials */}
        <section className="bento-card p-6 border border-white/10 bg-black/40 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-axiom-purple">🔗</span> Verifiable Social Identifiers
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Bind your profiles to generate W3C compliance credentials signed cryptographically by the protocol authority.
          </p>

          <div className="space-y-4">
            {/* Twitter */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🐦</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Twitter / X</h4>
                  <p className="text-xs text-gray-400">XP Reward: +50 XP</p>
                </div>
              </div>
              <div>
                {isPlatformConnected("twitter") ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neon-green/10 text-neon-green border border-neon-green/20">
                      CONNECTED
                    </span>
                    <button onClick={() => openVcModal("connect_twitter")} className="btn-ghost text-xs px-2.5 py-1">
                      INSPECT VC
                    </button>
                  </div>
                ) : (
                  <button onClick={() => openConnectModal("twitter")} className="btn-primary text-xs px-4 py-1.5">
                    CONNECT
                  </button>
                )}
              </div>
            </div>

            {/* Discord */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Discord</h4>
                  <p className="text-xs text-gray-400">XP Reward: +50 XP</p>
                </div>
              </div>
              <div>
                {isPlatformConnected("discord") ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neon-green/10 text-neon-green border border-neon-green/20">
                      CONNECTED
                    </span>
                    <button onClick={() => openVcModal("connect_discord")} className="btn-ghost text-xs px-2.5 py-1">
                      INSPECT VC
                    </button>
                  </div>
                ) : (
                  <button onClick={() => openConnectModal("discord")} className="btn-primary text-xs px-4 py-1.5">
                    CONNECT
                  </button>
                )}
              </div>
            </div>

            {/* Google */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔑</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Google Accounts</h4>
                  <p className="text-xs text-gray-400">XP Reward: +50 XP</p>
                </div>
              </div>
              <div>
                {isPlatformConnected("google") ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-neon-green/10 text-neon-green border border-neon-green/20">
                      CONNECTED
                    </span>
                    <button onClick={() => openVcModal("connect_google")} className="btn-ghost text-xs px-2.5 py-1">
                      INSPECT VC
                    </button>
                  </div>
                ) : (
                  <button onClick={() => openConnectModal("google")} className="btn-primary text-xs px-4 py-1.5">
                    CONNECT
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: XP Ledger Logs */}
        <section className="bento-card p-6 border border-white/10 bg-black/40 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-500">📜</span> Cryptographic Action Ledger
          </h2>
          {detailsLoading ? (
            <div className="space-y-2 py-4">
              <div className="h-6 bg-white/5 rounded animate-pulse" />
              <div className="h-6 bg-white/5 rounded animate-pulse w-5/6" />
            </div>
          ) : !statusDetails || statusDetails.recentLedger.length === 0 ? (
            <p className="text-sm text-gray-500 font-mono py-4 text-center">No transactions recorded in the local cache.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-500 pb-2">
                    <th className="py-2">TX OBJECTIVE</th>
                    <th className="py-2 text-right">BALANCE SHIFT</th>
                    <th className="py-2 text-right">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {statusDetails.recentLedger.map((entry) => (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 text-white uppercase font-bold tracking-wider">{entry.reason.replaceAll("_", " ")}</td>
                      <td className={`py-3 text-right ${entry.amount >= 0 ? "text-neon-green" : "text-red-500"}`}>
                        {entry.amount >= 0 ? `+${entry.amount}` : entry.amount} XP
                      </td>
                      <td className="py-3 text-right text-gray-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal 1: Connect Modal Dialog */}
      <dialog
        ref={connectDialogRef}
        closedby="any"
        onClick={handleDialogBackdropClick}
        aria-labelledby="connect-dialog-title"
        className="bento-card max-w-md w-full p-6 bg-black/90 border border-white/15 backdrop-blur-xl text-white rounded-2xl p-0"
      >
        <div className="p-6">
          <h3 id="connect-dialog-title" className="text-lg font-bold mb-2 flex items-center gap-2">
            Link {activePlatform ? activePlatform.toUpperCase() : "Account"} Profile
          </h3>
          <p className="text-xs text-gray-400 font-mono mb-4">
            Type your username handle to build a verifiable social connection claim.
          </p>

          <form onSubmit={handleConnectSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="handle-input" className="text-xs text-gray-400 font-mono">
                {activePlatform === "google" ? "Email Address" : "Profile Handle"}
              </label>
              <input
                id="handle-input"
                type={activePlatform === "google" ? "email" : "text"}
                required
                placeholder={activePlatform === "google" ? "name@gmail.com" : "@cryptojoker"}
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-green outline-none font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => connectDialogRef.current?.close()}
                className="btn-ghost text-xs px-4 py-2"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submittingClaim || !handleInput.trim()}
                className="btn-primary text-xs px-4 py-2"
              >
                {submittingClaim ? "SIGNING..." : "CONFIRM CLAIM"}
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Modal 2: VC Inspector Modal Dialog */}
      <dialog
        ref={vcDialogRef}
        closedby="any"
        onClick={handleDialogBackdropClick}
        aria-labelledby="vc-dialog-title"
        className="bento-card max-w-xl w-full bg-black/95 border border-white/15 backdrop-blur-2xl text-white rounded-2xl p-0"
      >
        <div className="p-6">
          <h3 id="vc-dialog-title" className="text-lg font-bold mb-1 flex items-center gap-2">
            SocialIdentityCredential (W3C Standard)
          </h3>
          <p className="text-xs text-gray-400 font-mono mb-4">
            Signed by AxiomID issuer authority. Copy payload to verify portability.
          </p>

          <pre className="font-mono text-[10px] leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 overflow-auto max-h-80 text-neon-green whitespace-pre-wrap select-all">
            {JSON.stringify(activeVc, null, 2)}
          </pre>

          <div className="flex gap-2 justify-end pt-4 border-t border-white/10 mt-4">
            <button
              onClick={copyVcPayload}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              {copied ? "COPIED ✅" : "COPY PAYLOAD"}
            </button>
            <button
              onClick={() => vcDialogRef.current?.close()}
              className="btn-ghost text-xs px-4 py-2"
            >
              CLOSE
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
