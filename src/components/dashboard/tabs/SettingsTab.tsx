"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/app/context/wallet-context";
import { Shield, User, Zap, AtSign, Globe, Copy, Check, Share2 } from "lucide-react";
import { sharePassport } from "@/lib/pi-native-features";

/**
 * Settings tab — thin wrapper linking to existing /dashboard/settings page.
 * Shows user info, vanity URL, and quick links.
 */
export function SettingsTab() {
  const { user } = useWallet();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const vanityUrl = user?.piUsername
    ? `https://${user.piUsername}.axiomid.app`
    : null;

  const handleCopy = async () => {
    if (!vanityUrl) return;
    if (!navigator.clipboard) {
      try {
        await navigator.share({ url: vanityUrl });
      } catch {
        // share cancelled or unavailable
      }
      return;
    }
    await navigator.clipboard.writeText(vanityUrl);
    setCopied(true);
  };

  const handleShare = async () => {
    if (!vanityUrl) return;
    await sharePassport({
      title: "AxiomID Vanity URL",
      text: `Check out my AxiomID profile at ${vanityUrl}`,
      url: vanityUrl,
    });
  };

  return (
    <div className="space-y-5">
      {/* Vanity URL */}
      {vanityUrl && (
        <div className="bento-card p-5">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
            Your Vanity URL
          </h3>
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <a
              href={vanityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-emerald-400 hover:underline truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 rounded px-1"
            >
              {vanityUrl}
            </a>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleShare}
                className="p-1.5 rounded hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                aria-label="Share vanity URL"
              >
                <Share2 className="w-3.5 h-3.5 text-faint" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                aria-label={copied ? "Copied" : "Copy URL"}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-faint" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-faint mt-2">
            Share this URL to show your passport and trust score.
          </p>
        </div>
      )}

      {/* User info summary */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          Account
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-faint" />
            <span className="text-sm font-mono text-subtle">{user?.piUsername || "Not set"}</span>
          </div>
          <div className="flex items-center gap-3">
            <AtSign className="w-4 h-4 text-faint" />
            <span className="text-[10px] font-mono text-faint">
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick links to full settings */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          Settings
        </h3>
        <div className="space-y-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
          >
            <Shield className="w-4 h-4 text-faint" />
            <span className="text-xs font-mono text-subtle">Full Settings →</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue"
          >
            <Zap className="w-4 h-4 text-faint" />
            <span className="text-xs font-mono text-subtle">XP Ledger →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
