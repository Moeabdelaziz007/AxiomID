"use client";

import { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/app/context/language-context";

/**
 * PassportQR — Vercel-style passport QR code with interactive actions.
 *
 * Design inspired by Vercel's passport.dev pattern:
 * - Centered QR with subtle gradient ring
 * - One-click copy DID
 * - Download QR as SVG
 * - Expand to show full DID
 * - Share native (Web Share API with fallback)
 *
 * Upgrades from the old AgentQR:
 * - Interactive: copy, download, share, expand
 * - Visual: gradient ring, glow, glassmorphism
 * - Accessible: aria-labels, keyboard focus, high contrast
 * - Responsive: scales from 140px (mobile) to 200px (desktop)
 */

interface PassportQRProps {
  did: string;
  username?: string;
  passportUrl?: string;
  size?: number;
}

type CopyState = "idle" | "copied";

export function PassportQR({
  did,
  username,
  passportUrl,
  size = 180,
}: PassportQRProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<CopyState>("idle");
  const [expanded, setExpanded] = useState(false);

  const shareUrl = passportUrl || (typeof window !== "undefined" ? window.location.href : `https://axiomid.app/passport/${username || did}`);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(did);
      setCopied("copied");
      setTimeout(() => setCopied("idle"), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = did;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied("copied");
        setTimeout(() => setCopied("idle"), 2000);
      } catch {
        // silent fail
      }
      document.body.removeChild(textarea);
    }
  }, [did]);

  const handleDownload = useCallback(() => {
    const svgEl = document.querySelector('[data-qr-svg]') as SVGElement | null;
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passport-${username || "agent"}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [username]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: t("share_title") || "AxiomID Passport",
      text: t("share_text") || `Verify ${username || "this agent"} on AxiomID`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — silent
      }
    } else {
      // Fallback: copy URL
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied("copied");
        setTimeout(() => setCopied("idle"), 2000);
      } catch {
        // silent
      }
    }
  }, [shareUrl, username, t]);

  const shortDid = did.length > 42
    ? `${did.slice(0, 21)}...${did.slice(-12)}`
    : did;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR with gradient ring */}
      <div className="relative group">
        {/* Gradient ring */}
        <div
          className="absolute -inset-1 rounded-2xl opacity-60 blur-sm transition-opacity group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #22c55e 100%)",
          }}
          aria-hidden="true"
        />
        {/* QR container */}
        <div
          className="relative bg-white p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-[1.02]"
          style={{ width: size + 32, height: size + 32 }}
        >
          <QRCodeSVG
            data-qr-svg
            value={shareUrl}
            aria-label={`QR code for ${username || "agent"} passport — ${did}`}
            size={size}
            bgColor="#ffffff"
            fgColor="#0a0a0a"
            level="M"
            includeMargin={false}
            imageSettings={{
              src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM4YjVjZjYiLz48dGV4dCB4PSIxMiIgeT0iMTYiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BPC90ZXh0Pjwvc3ZnPg==",
              height: 28,
              width: 28,
              excavate: true,
            }}
          />
        </div>
      </div>

      {/* DID label — expandable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] font-mono text-faint hover:text-subtle transition-colors max-w-[240px] text-center break-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-electric-blue/50 rounded px-2 py-1"
        aria-expanded={expanded}
        aria-label={expanded ? "Show shortened DID" : "Show full DID"}
      >
        {expanded ? did : shortDid}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 focus:outline-none focus:ring-1 focus:ring-electric-blue/50"
          style={{
            background: copied === "copied" ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.1)",
            color: copied === "copied" ? "#22c55e" : "#6366f1",
            border: `1px solid ${copied === "copied" ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.2)"}`,
          }}
          aria-label="Copy DID to clipboard"
        >
          {copied === "copied" ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{t("copied") || "Copied"}</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{t("copy_did") || "Copy DID"}</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 focus:outline-none focus:ring-1 focus:ring-electric-blue/50"
          style={{
            background: "rgba(139,92,246,0.1)",
            color: "#8b5cf6",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
          aria-label="Download QR code as SVG"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{t("download") || "SVG"}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 focus:outline-none focus:ring-1 focus:ring-electric-blue/50"
          style={{
            background: "rgba(34,197,94,0.1)",
            color: "#22c55e",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
          aria-label="Share passport"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.639-2.32m0 0a3 3 0 114.12 4.119l-4.64 2.32m0 0a3 3 0 11-4.119-4.12l4.64-2.32z" />
          </svg>
          <span>{t("share") || "Share"}</span>
        </button>
      </div>

      {/* Verification hint */}
      <p className="text-[8px] font-mono text-faint text-center max-w-[240px]">
        {t("qr_scan_hint") || "Scan to verify this identity on AxiomID"}
      </p>
    </div>
  );
}
