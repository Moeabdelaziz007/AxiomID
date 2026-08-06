import { motion } from "framer-motion";
import { Shield, Wallet, Globe, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { User } from "@/app/context/wallet-context";

interface VerifyStepProps {
  t: (en: string, ar: string, zh: string) => string;
  verified: boolean;
  verificationItems: {
    kyc: boolean;
    payment: boolean;
  };
  kycState: "pending" | "verified" | "failed";
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
  kycState,
}: VerifyStepProps) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
        <Shield className="w-10 h-10 text-electric-blue" />
      </div>
      <h2 className="text-2xl font-sans font-bold mb-2">
        {t("Know Your Agent", "اعرف وكيلك", "认识您的代理")}
      </h2>
      <p className="text-white/40 font-sans text-sm mb-8 max-w-sm mx-auto">
        {t(
          "Build your trust score through decentralized verification",
          "ابنِ نقاط ثقتك من خلال التحقق اللامركزي",
          "通过去中心化验证积累您的信任分数"
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
label: t("Pi KYC", "التحقق من هوية Pi", "Pi 身份验证"),
              },
              {
                key: "payment" as const,
                icon: Wallet,
                label: t("Payment Proof", "إثبات الدفع", "支付证明"),
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
                        ? t("VERIFIED", "موثق", "已验证")
                        : item.key === "kyc" && kycState === "failed"
                          ? t("NOT VERIFIED", "غير موثق", "未验证")
                          : t("PENDING", "قيد الانتظار", "等待中")}
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
                  "جارٍ التحقق...",
                  "验证中..."
                )}
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                {t(
                  "START VERIFICATION",
                  "بدء التحقق",
                  "开始验证"
                )}
              </>
            )}
          </motion.button>

          {kycState === "failed" && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm mx-auto px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-amber-400 font-mono text-xs font-bold">
                  {t("Identity not yet verified", "الهوية غير موثقة بعد", "身份尚未验证")}
                </p>
              </div>
              <p className="text-white/50 font-mono text-[10px]">
                {t(
                  "Complete KYC inside the Pi app to verify your identity, then retry. This is not a green state — KYC is still required.",
                  "أكمل التحقق من الهوية (KYC) داخل تطبيق Pi للتوثيق، ثم أعد المحاولة. لن يتم احتسابك موثقًا قبل اكتمال KYC.",
                  "请在 Pi 应用中完成 KYC 身份验证后重试。这并非通过状态——仍需完成 KYC。"
                )}
              </p>
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-amber-300 hover:text-amber-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("Re-check now", "إعادة التحقق الآن", "立即重新检查")}
              </button>
            </motion.div>
          )}
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
              "اكتمل التحقق",
              "验证完成"
            )}
          </p>
          <p className="font-mono text-xs text-white/40 mt-1">
            {t("Trust Score: ", "نقاط الثقة: ", "信任分数：")}
            <span className="text-neon-green font-bold">
              {verifiedTrustScore ?? user?.trustScore ?? 0}/100
            </span>
            <span className="text-white/30"> · {t("verified on a 0–100 scale", "موثوق على مقياس من 0 إلى 100", "按 0–100 量表验证")}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
