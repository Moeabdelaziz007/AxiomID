"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AgentPassport } from "@/components/AgentPassport";
import { AgentQR } from "@/components/AgentQR";
import Link from "next/link";
import { useLanguage } from "../../context/language-context";

interface PassportData {
  username: string;
  walletAddress: string | null;
  stellarAddress?: string | null;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  issuedDate: string;
  agentName: string | null;
  agentStatus: string | null;
}

/**
 * Render the passport detail view for the current route `slug`, including loading state, error UI, and sharing.
 *
 * Fetches passport data for the `slug` when mounted or when `slug` changes, localizes UI strings based on `language`, and provides a share action that uses the Web Share API when available or copies the page URL to the clipboard.
 *
 * @returns A React element that displays a loading skeleton, an error panel with a CTA, the rendered passport with QR and share button, or `null` when no UI should be shown.
 */
export function PassportView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: t('share_title'),
        text: t('share_text'),
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (!slug) return;

    const abortController = new AbortController();

    fetch(`/api/passport/${encodeURIComponent(slug)}`, { signal: abortController.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || t('passport_not_found'));
        }
        return res.json();
      })
      .then((data) => {
        setPassport(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : t('passport_load_error'));
        setLoading(false);
      });

    return () => abortController.abort();
  }, [slug, t]);

  return (
    <>
      {loading ? (
        <div className="w-full max-w-lg">
          <div className="passport-card p-6 animate-pulse">
            <div className="h-6 bg-white/5 rounded mb-4 w-1/3" />
            <div className="h-24 bg-white/5 rounded mb-4" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      ) : error ? (
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{t('passport_not_found')}</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <Link href="/" className="btn-primary text-xs">
            {t('create_your_passport')}
          </Link>
        </div>
      ) : passport ? (
        <>
          <AgentPassport
            username={passport.username}
            walletAddress={passport.walletAddress || undefined}
            stellarAddress={passport.stellarAddress || undefined}
            tier={passport.tier as "Visitor" | "Citizen" | "Validator" | "Sovereign"}
            trustScore={passport.trustScore}
            kyaStatus={passport.kyaStatus}
            kycStatus={passport.kycStatus}
            issuedDate={passport.issuedDate}
            did={passport.did}
            xp={passport.xp}
            agentName={passport.agentName || undefined}
            agentStatus={passport.agentStatus || undefined}
          />

          <div className="mt-8 flex flex-col items-center gap-3">
            <AgentQR did={passport.did} />
            <button
              onClick={handleShare}
              className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.639-2.32m0 0a3 3 0 114.12 4.119l-4.64 2.32m0 0a3 3 0 11-4.119-4.12l4.64-2.32z" />
              </svg>
              {shareCopied ? t('link_copied') : t('share_passport')}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-4">
              {t('passport_verified_by')}
            </p>
            <Link href="/" className="btn-primary text-xs">
              {t('create_your_passport')}
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}
