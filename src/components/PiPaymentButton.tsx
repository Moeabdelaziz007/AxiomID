"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { createPiPayment } from "@/lib/pi-sdk";

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

type PaymentState = "idle" | "creating" | "approving" | "completing" | "success" | "error";

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

  const handlePayment = useCallback(async () => {
    if (disabled || state !== "idle") return;

    setState("creating");
    setError(null);

    try {
      // Step 1: Create payment with Pi SDK (client-side)
      const txid = await createPiPayment(amount, memo, metadata);

      // Step 2: Approve payment on server
      setState("approving");
      const approveRes = await fetch("/api/pi/payment/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: txid }),
      });

      if (!approveRes.ok) {
        const errorData = await approveRes.json();
        throw new Error(errorData.message || "Payment approval failed");
      }

      // Step 3: Complete payment on server
      setState("completing");
      const completeRes = await fetch("/api/pi/payment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: txid, txid }),
      });

      if (!completeRes.ok) {
        const errorData = await completeRes.json();
        throw new Error(errorData.message || "Payment completion failed");
      }

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
        <span className="text-sm font-medium">Payment Complete!</span>
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
          Try again
        </button>
      </div>
    );
  }

  const isLoading = state !== "idle";
  const loadingTextMap: Record<string, string> = {
    creating: "Creating payment...",
    approving: "Approving...",
    completing: "Completing...",
  };
  const currentLoadingText = loadingTextMap[state] || "";

  return (
    <div className={className}>
      <motion.button
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        onClick={handlePayment}
        disabled={disabled || isLoading}
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
        {amount} Pi • Powered by Pi Network
      </p>
    </div>
  );
}
