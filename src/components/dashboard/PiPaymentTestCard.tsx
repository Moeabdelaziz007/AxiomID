"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, Coins, Copy } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";
import { createPiPayment, PiSdkError } from "@/lib/pi-sdk";
import { toast } from "sonner";

export function PiPaymentTestCard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const handlePayment = useCallback(async () => {
    setLoading(true);
    setReceipt(null);
    try {
      // 1 Pi test payment for App Studio Step 10
      const memo = "App Studio Step 10 Test Payment";
      const txid = await createPiPayment(1, memo, { purpose: "test_payment" });
      setReceipt(txid);
      toast.success(t("payment_test_success"));
    } catch (err) {
      const msg = err instanceof PiSdkError ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const copyTxid = () => {
    if (receipt) {
      navigator.clipboard.writeText(receipt);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="bento-card p-5 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-xl opacity-60 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-1.5 font-mono">
              <Coins className="w-4 h-4 text-indigo-400" />
              {t("payment_test_title")}
            </h3>
            <p className="text-xs text-faint mt-1">
              {t("payment_test_desc")}
            </p>
          </div>
        </div>

        {!receipt ? (
          <button
            onClick={handlePayment}
            disabled={loading}
            className="btn-primary text-xs font-semibold py-2.5 px-4 bg-indigo-500 hover:bg-indigo-400 text-black border-indigo-600 hover:border-indigo-500 font-mono tracking-wider transition-all disabled:opacity-50 w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="animate-spin">⟳</span> {t("payment_test_processing")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                {t("payment_test_button")}
              </span>
            )}
          </button>
        ) : (
          <div className="text-center py-4 bg-black/20 rounded-lg border border-white/5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-300 font-mono font-bold mb-1">
              {t("payment_test_success")}
            </p>
            <p className="text-xs text-emerald-500/80 mb-3">
              {t("payment_test_released")}
            </p>
            
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="text-[10px] text-faint uppercase">{t("payment_test_txid")}</span>
              <div 
                onClick={copyTxid}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded font-mono text-[10px] text-indigo-300 cursor-pointer transition-colors border border-indigo-500/20 hover:border-indigo-500/40"
              >
                {receipt.slice(0, 16)}...{receipt.slice(-8)}
                <Copy className="w-3 h-3 text-indigo-400/70" />
              </div>
            </div>

            <button
              onClick={() => setReceipt(null)}
              className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {t("payment_test_again")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}