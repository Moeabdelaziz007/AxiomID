import { motion } from "framer-motion";
import { Wallet, ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import type { User } from "@/app/context/wallet-context";

interface ConnectStepProps {
  t: (en: string, ar: string) => string;
  walletConnected: boolean;
  user: User | null;
  handleConnect: () => void;
  isConnecting: boolean;
  isPiBrowser: boolean;
  connectError: string | null;
  onDemoConnect?: () => void;
}

export function ConnectStep({
  t,
  walletConnected,
  user,
  handleConnect,
  isConnecting,
  isPiBrowser,
  connectError,
  onDemoConnect,
}: ConnectStepProps) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
        <Wallet className="w-10 h-10 text-electric-blue" />
      </div>
      <h2 className="text-2xl font-sans font-bold mb-2">
        {t("Connect Wallet", "اتصل بالمحفظة")}
      </h2>
      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
        {t(
          "Link your Pi Network wallet to begin your decentralized identity journey",
          "اربط محفظة شبكة Pi لبدء رحلة هويتك اللامركزية"
        )}
      </p>

      {walletConnected || user?.walletAddress ? (
        <div className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-neon-green" />
            <span className="font-mono text-sm text-neon-green">
              {t("Connected", "متصل")}
            </span>
          </div>
          <p className="text-white/40 font-mono text-xs mt-2 text-center">
            {user?.walletAddress
              ? `${user.walletAddress.slice(0, 12)}...${user.walletAddress.slice(-6)}`
              : "Connected"}
          </p>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
          whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue/80 to-blue-600/80 text-white font-sans font-semibold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-glass-hover flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t("CONNECTING...", "جاري الاتصال...")}
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              {t("CONNECT PI WALLET", "اتصل بمحفظة PI")}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      )}

      {!isPiBrowser && !walletConnected && !user?.walletAddress && onDemoConnect && (
        <div className="mt-4">
          <button
            onClick={onDemoConnect}
            className="w-full max-w-sm mx-auto py-3 px-4 rounded-xl bg-glass border border-glass-hover text-subtle font-mono text-sm hover:bg-glass-hover transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-green focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <span className="w-3 h-3 rounded-full bg-neon-green/60 animate-pulse" />
            {t("Try Demo Mode", "تجربة وضع العرض التوضيحي")}
          </button>
        </div>
      )}

      {!isPiBrowser && !walletConnected && !user?.walletAddress && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-yellow-500 font-mono text-xs font-bold mb-1">
            {t("Pi Browser Required", "يتطلب Pi Browser")}
          </p>
          <p className="text-white/40 font-mono text-[10px]">
            {t(
              "Open this app inside Pi Browser to connect your wallet and claim your identity.",
              "افتح هذا التطبيق داخل Pi Browser لربط محفظتك والحصول على هويتك."
            )}
          </p>
        </div>
      )}

      {connectError && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
          <p className="text-red-400 font-mono text-xs">{connectError}</p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-white/30">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-mono text-xs">
          {t(
            "Non-custodial · Your keys, your identity",
            "غير أصيل · مفاتيحك، هويتك"
          )}
        </span>
      </div>
    </div>
  );
}
