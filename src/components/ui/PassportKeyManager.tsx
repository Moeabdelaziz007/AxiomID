"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/app/context/language-context";

interface PassportKeyManagerProps {
  did: string;
  onSign?: (payload: string) => Promise<string>;
}

/**
 * Displays a DID with copy and optional signing capabilities.
 *
 * Provides a copy-to-clipboard action for the DID and, if an `onSign` handler is provided, allows signing arbitrary payloads with the DID key.
 *
 * @param did - The DID string to display.
 * @param onSign - Optional callback that accepts a payload string and returns a signature string.
 * @returns The rendered component.
 */
export default function PassportKeyManager({ did, onSign }: PassportKeyManagerProps) {
  const [payload, setPayload] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const truncatedDid = did.length > 30 ? `${did.slice(0, 15)}...${did.slice(-12)}` : did;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(did);
        setCopied(true);
        toast.success(t("DID copied to clipboard", "تم نسخ المعرف إلى الحافظة"));
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // clipboard unavailable (HTTP context, permissions denied)
    }
  };

  const handleSign = async () => {
    if (!onSign || !payload) return;
    setSigning(true);
    try {
      const sig = await onSign(payload);
      setSignature(sig);
    } catch {
      setSignature(t("Signing failed", "فشل التوقيع"));
    }
    setSigning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t border-white/10 pt-4 mt-4 space-y-4"
    >
      {/* Key Management */}
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
          {t("Key Management", "إدارة المفاتيح")}
        </h4>
        <div className="flex items-center gap-2">
          <code className="text-[11px] font-mono text-zinc-300 bg-white/5 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
            {truncatedDid}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-zinc-400"
          >
            {copied ? t("Copied!", "تم النسخ!") : t("Copy DID", "نسخ المعرف")}
          </button>
        </div>
      </div>

      {/* Sign */}
      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">
          {t("Sign with DID key", "التوقيع بمفتاح المعرف")}
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder={t("Payload to sign...", "الحمولة للتوقيع...")}
            aria-label={t("Payload to sign", "الحمولة للتوقيع")}
            className="flex-1 text-[11px] font-mono bg-white/5 border border-white/10 rounded px-2 py-1 text-zinc-300 placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={handleSign}
            disabled={signing || !payload}
            className="text-[10px] font-mono px-3 py-1 rounded bg-electric-blue/20 text-electric-blue hover:bg-electric-blue/30 transition-colors disabled:opacity-50"
          >
            {signing ? t("Signing...", "جاري التوقيع...") : t("Sign", "توقيع")}
          </button>
        </div>
        {signature && (
          <div className="mt-2 text-[10px] font-mono text-zinc-500 break-all">
            {t("Signature:", "التوقيع:")} {signature}
          </div>
        )}
      </div>
    </motion.div>
  );
}
