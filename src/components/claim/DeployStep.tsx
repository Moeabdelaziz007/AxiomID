import { motion } from "framer-motion";
import { Rocket, CheckCircle2, ChevronRight, Sparkles, Globe } from "lucide-react";
import Link from "next/link";
import type { User } from "@/app/context/wallet-context";

interface DeployStepProps {
  t: (en: string, ar: string) => string;
  deployed: boolean;
  handleDeploy: (name: string) => void;
  isDeploying: boolean;
  verifiedTrustScore: number | null;
  user: User | null;
  agentName: string;
  setAgentName: (name: string) => void;
}

export function DeployStep({
  t,
  deployed,
  handleDeploy,
  isDeploying,
  verifiedTrustScore,
  user,
  agentName,
  setAgentName,
}: DeployStepProps) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
        <Rocket className="w-10 h-10 text-electric-blue" />
      </div>
      <h2 className="text-2xl font-sans font-bold mb-2">
        {t("Activate Your Agent", "تفعيل وكيلك")}
      </h2>
      <p className="text-white/40 font-sans text-sm mb-6 max-w-sm mx-auto">
        {t(
          "Deploy your sovereign agent passport on-chain. Your agent will be able to transact, verify, and build trust across the network.",
          "نشر جواز سفر الوكيل السيادي على السلسلة. سيكون وكيلك قادراً على المعاملات والتحقق وبناء الثقة عبر الشبكة."
        )}
      </p>

      {!deployed ? (
        <div className="space-y-6">
          {/* Agent Name Input */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-mono text-faint uppercase block">
              {t("Agent Name", "اسم الوكيل")}
            </label>
            <input
              type="text"
              placeholder={t("My Agent", "وكيل جديد")}
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-glass border border-glass-hover rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-electric-blue/30"
            />
          </div>

          {/* Passport Preview */}
          <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.1] rounded-2xl backdrop-blur-xl p-6 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-electric-blue/20 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-electric-blue" />
                </div>
                <span className="font-mono text-xs text-white/50">
                  AXIOM AGENT PASSPORT
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-glass pb-2">
                  <span className="font-mono text-xs text-white/40">
                    {t("Agent Name", "اسم الوكيل")}
                  </span>
                  <span className="font-mono text-xs text-white">
                    {agentName || t("My Agent", "وكيل جديد")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-glass pb-2">
                  <span className="font-mono text-xs text-white/40">
                    {t("Status", "الحالة")}
                  </span>
                  <span className="font-mono text-xs text-neon-green">
                    {t("READY", "جاهز")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-glass pb-2">
                  <span className="font-mono text-xs text-white/40">
                    {t("Trust", "الثقة")}
                  </span>
                  <span className="font-mono text-xs text-electric-blue">
                    {verifiedTrustScore ?? user?.trustScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-white/40">
                    {t("Network", "الشبكة")}
                  </span>
                  <span className="font-mono text-xs text-white/60">
                    Pi Testnet
                  </span>
                </div>
              </div>
            </div>
          </div>

           <motion.button
             whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
             whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
             onClick={() => handleDeploy(agentName)}
             disabled={isDeploying || !agentName.trim()}
             className="w-full max-w-sm mx-auto bg-gradient-to-r from-neon-green/90 to-green-500 text-black font-sans font-bold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-neon-green/10 border border-glass-hover flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-neon-green/20 transition-shadow disabled:opacity-50"
           >
             <Rocket className="w-5 h-5" />
             {t("ACTIVATE AGENT", "تفعيل الوكيل")}
           </motion.button>
          <p className="text-white/30 font-mono text-[10px] mt-2">
            {t(
              "This will create your DID document and mint your passport NFT.",
              "سيؤدي هذا إلى إنشاء مستند DID وإصدار جواز NFT الخاص بك."
            )}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-neon-green/10 border border-neon-green/20 rounded-2xl p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 10,
              }}
            >
              <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-4" />
            </motion.div>
            <h3 className="font-mono text-lg font-bold text-neon-green mb-2">
              {t("AGENT ACTIVATED", "تم تفعيل الوكيل")}
            </h3>
            <p className="font-mono text-sm text-white/50">
              {t(
                "Your sovereign identity is now on-chain",
                "هويتك السيادية الآن على السلسلة"
              )}
            </p>
          </div>

          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
              whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
              className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-bold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-glass-hover flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow"
            >
              {t("ENTER DASHBOARD", "الدخول إلى لوحة التحكم")}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </Link>

          {/* What happens next? */}
          <div className="mt-6 text-left">
            <p className="text-white/40 font-mono text-xs uppercase tracking-wider mb-3">
              {t("What happens next?", "ماذا يحدث بعد ذلك؟")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  icon: Sparkles,
                  title: t("Earn your first XP", "اكسب أول نقاط XP"),
                  desc: t("Complete KYA verification and connect accounts", "أكمل التحقق من KYA واربط الحسابات"),
                },
                {
                  icon: Globe,
                  title: t("Explore the network", "استكشف الشبكة"),
                  desc: t("See other agents and their trust scores", "شاهد العملاء الآخرين ونقاط ثقتهم"),
                },
                {
                  icon: Rocket,
                  title: t("Deploy your first skill", "نشر أول مهارة"),
                  desc: t("Give your agent new capabilities from the marketplace", "امنح وكيلك قدرات جديدة من السوق"),
                },
              ].map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center shrink-0">
                      <ItemIcon className="w-4 h-4 text-electric-blue" />
                    </div>
                    <div>
                      <p className="text-white/80 font-sans text-xs font-medium">{item.title}</p>
                      <p className="text-white/40 font-sans text-[10px]">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
