"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { createPiPayment } from "@/lib/pi-sdk";
import { useLanguage } from "@/app/context/language-context";

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (txid: string) => void;
  onError?: (error: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

type PaymentState = "idle" | "creating" | "success" | "error";

/**
 * Renders a button that initiates a Pi Network payment with animated feedback for loading, success, and error states.
 *
 * The component calls `createPiPayment()` to process the payment using the provided amount, memo, and optional metadata.
 * On successful completion, invokes the `onSuccess` callback with the transaction ID.
 * On failure, invokes the `onError` callback with an error message.
 *
 * Displays a success confirmation with a check icon when payment completes,
 * an error panel with a "Try again" button when payment fails,
 * and a loading spinner during payment processing.
 */
export function PiPaymentButton({
  amount,
  memo,
  metadata,
  onSuccess,
  onError,
  children,
  className = "",
  disabled = false,
}: PiPaymentButtonProps) {
  const [state, setState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const handlePayment = useCallback(async () => {
    if (disabled || state !== "idle") return;

    setState("creating");
    setError(null);

    try {
      // createPiPayment() handles the full lifecycle internally:
      // 1. Pi SDK createPayment() → onReadyForServerApproval → approve
      // 2. onReadyForServerCompletion → complete → resolve(txid)
      const txid = await createPiPayment(amount, memo, metadata);

      setState("success");
      onSuccess?.(txid);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      setState("error");
      onError?.(message);
    }
  }, [amount, memo, metadata, disabled, state, onSuccess, onError]);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  if (state === "success") {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-2 text-neon-green ${className}`}
      >
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">{t("Payment Complete!", "تم الدفع!")}</span>
      </motion.div>
    );
  }

  if (state === "error") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-badge-red">
          <XCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={reset}
          className="text-xs text-electric-blue hover:underline"
        >
          {t("Try again", "حاول مرة أخرى")}
        </button>
      </div>
    );
  }

  const isLoading = state !== "idle";
  const loadingTextMap: Record<string, string> = {
    creating: t("Processing payment...", "جاري معالجة الدفع..."),
  };
  const currentLoadingText = loadingTextMap[state] || "";

  return (
    <div className={className}>
      <motion.button
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        onClick={handlePayment}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{currentLoadingText}</span>
          </>
        ) : (
          children
        )}
      </motion.button>
      <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
        {amount} Pi • {t("Powered by Pi Network", "مدعوم من شبكة Pi")}
      </p>
    </div>
  );
}
