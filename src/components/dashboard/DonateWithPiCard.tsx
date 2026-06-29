"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";
import { createPiPayment, PiSdkError } from "@/lib/pi-sdk";
import { toast } from "sonner";

const QUICK_AMOUNTS = [0.5, 1, 3.14, 5];

export function DonateWithPiCard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [amount, setAmount] = useState<number>(1);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDonate = useCallback(async () => {
    const pi = Number(custom || amount);
    if (!pi || pi <= 0) {
      toast.error(isAr ? "الرجاء إدخال مبلغ صالح" : "Please enter a valid amount");
      return;
    }
    setLoading(true);
    setDone(false);
    try {
      const memo = isAr ? "دعم AxiomID" : "Support AxiomID";
      await createPiPayment(pi, memo, { purpose: "donation" });
      setDone(true);
      toast.success(isAr ? `تم التبرع بـ ${pi} π!` : `Donated ${pi} π!`);
    } catch (err) {
      const msg = err instanceof PiSdkError ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [amount, custom, isAr]);

  const handleQuickAmount = (val: number) => {
    setAmount(val);
    setCustom("");
  };

  return (
    <div className="bento-card p-5 border border-rose-400/20 bg-rose-500/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-full blur-xl opacity-60 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-rose-200 flex items-center gap-1.5 font-mono">
              <Heart className="w-4 h-4 text-rose-400" />
              {isAr ? "ادعم AxiomID" : "Support AxiomID"}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              {isAr ? "تبرعك يساعد في نمو الشبكة. اختر أي مبلغ." : "Your donation keeps the network growing. Choose any amount."}
            </p>
          </div>
        </div>

        {!done ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => handleQuickAmount(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    !custom && amount === val
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-200"
                      : "border-white/10 text-zinc-400 hover:border-rose-400/30 hover:text-rose-300"
                  }`}
                >
                  {val} π
                </button>
              ))}
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder={isAr ? "مخصص" : "Custom"}
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setAmount(0); }}
                className="w-20 px-2 py-1.5 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-400/40 transition-colors"
              />
            </div>

            <button
              onClick={handleDonate}
              disabled={loading}
              className="btn-primary text-xs font-semibold py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-black border-rose-600 hover:border-rose-500 font-mono tracking-wider transition-all disabled:opacity-50 w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="animate-spin">⟳</span> {isAr ? "جاري المعالجة..." : "Processing..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  {isAr ? "تبرع باستخدام Pi" : "Donate with Pi"}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Heart className="w-8 h-8 text-rose-400 mx-auto mb-2 fill-rose-400/30" />
            <p className="text-sm text-rose-200 font-mono font-bold">
              {isAr ? "شكراً لك!" : "Thank You!"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {isAr ? "دعمك يجعل AxiomID ممكنًا." : "Your support makes AxiomID possible."}
            </p>
            <button
              onClick={() => setDone(false)}
              className="mt-3 text-[10px] font-mono text-rose-400 hover:text-rose-300 transition-colors"
            >
              {isAr ? "تبرع مرة أخرى" : "Donate again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
