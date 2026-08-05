import { motion } from "framer-motion";
import { Shield, Wallet, Globe, CheckCircle2 } from "lucide-react";
import type { User } from "@/app/context/wallet-context";

interface VerifyStepProps {
  t: (en: string, ar: string) => string;
  verified: boolean;
  verificationItems: {
    kyc: boolean;
    payment: boolean;
  };
  handleVerify: () => void;
  isVerifying: boolean;
  verifiedTrustScore: number | null;
  user: User | null;
}

export function VerifyStep({
  t,
  verified,
  verificationItems,
  handleVerify,
  isVerifying,
  verifiedTrustScore,
  user,
}: VerifyStepProps) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
        <Shield className="w-10 h-10 text-electric-blue" />
      </div>
      <h2 className="text-2xl font-sans font-bold mb-2">
        {t("Know Your Agent", "اعرف وكيلك")}
      </h2>
      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
        {t(
          "Build your trust score through decentralized verification",
          "ابنِ نقاط ثقتك من خلال التحقق اللامركزي"
        )}
      </p>

      {!verified ? (
        <div className="space-y-4">
          {/* Verification Items */}
          <div className="space-y-3">
            {[
              {
                key: "kyc" as const,
                icon: Shield,
                label: t("Pi KYC", "التحقق من هوية Pi"),
                status: verificationItems.kyc,
              },
              {
                key: "payment" as const,
                icon: Wallet,
                label: t("Payment Proof", "إثبات الدفع"),
                status: verificationItems.payment,
              },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                 <div
                   key={item.key}
                   className={`flex items-center justify-between bg-white/[0.03] border transition-all duration-500 rounded-lg px-4 py-3 ${
                     item.status
                       ? "border-neon-green/30 bg-neon-green/[0.05]"
                       : "border-white/[0.06]"
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     {item.status ? (
                       <motion.div
                         initial={{ scale: 0 }}
                         animate={{ scale: 1 }}
                         transition={{ type: "spring", stiffness: 300, damping: 20 }}
                       >
                         <CheckCircle2 className="w-4 h-4 text-neon-green" />
                       </motion.div>
                     ) : (
                       <div className="w-4 h-4 rounded-full border border-white/20" />
                     )}
                     <ItemIcon className={`w-4 h-4 transition-colors duration-500 ${item.status ? "text-neon-green" : "text-white/40"}`} />
                     <span className={`font-mono text-sm transition-colors duration-500 ${item.status ? "text-white" : "text-white/70"}`}>
                       {item.label}
                     </span>
                   </div>
                   <span
                     className={`font-mono text-xs transition-colors duration-500 ${
                       item.status
                         ? "text-neon-green font-bold"
                         : "text-white/30"
                     }`}
                   >
                     {item.status
                       ? t("VERIFIED", "موثق")
                       : t("PENDING", "قيد الانتظار")}
                   </span>
                 </div>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
            whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-semibold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-glass-hover flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Shield className="w-5 h-5" />
                </motion.div>
                {t(
                  "VERIFYING...",
                  "جارٍ التحقق..."
                )}
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                {t(
                  "START VERIFICATION",
                  "بدء التحقق"
                )}
              </>
            )}
          </motion.button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neon-green/10 border border-neon-green/20 rounded-xl p-6"
        >
          <CheckCircle2 className="w-12 h-12 text-neon-green mx-auto mb-3" />
          <p className="font-mono text-sm text-neon-green font-bold">
            {t(
              "VERIFICATION COMPLETE",
              "اكتمل التحقق"
            )}
          </p>
          <p className="font-mono text-xs text-white/40 mt-1">
            {t("Trust Score: ", "نقاط الثقة: ")}{verifiedTrustScore ?? user?.trustScore ?? 0}
          </p>
        </motion.div>
      )}
    </div>
  );
}
