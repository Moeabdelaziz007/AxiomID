import { motion } from "framer-motion";
import { Rocket, CheckCircle2, ChevronRight, Sparkles, Globe } from "lucide-react";
import Link from "next/link";
import { determineSandboxMode } from "@/lib/pi-sdk";
import type { User } from "@/app/context/wallet-context";

interface DeployStepProps {
  t: (en: string, ar: string, zh: string) => string;
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
        {t("Activate Your Agent", "تفعيل وكيلك", "激活您的代理")}
      </h2>
      <p className="text-white/40 font-sans text-sm mb-6 max-w-sm mx-auto">
        {t(
          "Deploy your sovereign agent passport on-chain. Your agent will be able to transact, verify, and build trust across the network.",
          "نشر جواز سفر الوكيل السيادي على السلسلة. سيكون وكيلك قادراً على المعاملات والتحقق وبناء الثقة عبر الشبكة.",
          "在链上部署您的主权代理护照。您的代理将能够在网络中进行交易、验证和建立信任。"
        )}
      </p>

      {!deployed ? (
        <div className="space-y-6">
          {/* Agent Name Input */}
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-mono text-faint uppercase block">
              {t("Agent Name", "اسم الوكيل", "代理名称")}
            </label>
            <input
              type="text"
              placeholder={t("My Agent", "وكيل جديد", "我的代理")}
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
                    {t("Agent Name", "اسم الوكيل", "代理名称")}
                  </span>
                  <span className="font-mono text-xs text-white">
                    {agentName || t("My Agent", "وكيل جديد", "新代理")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-glass pb-2">
                  <span className="font-mono text-xs text-white/40">
                    {t("Status", "الحالة", "状态")}
                  </span>
                  <span className="font-mono text-xs text-neon-green">
                    {t("READY", "جاهز", "就绪")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-glass pb-2">
                  <span className="font-mono text-xs text-white/40">
                    {t("Trust", "الثقة", "信任")}
                  </span>
                  <span className="font-mono text-xs text-electric-blue">
                    {verifiedTrustScore ?? user?.trustScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-white/40">
                    {t("Network", "الشبكة", "网络")}
                  </span>
                  <span className="font-mono text-xs text-white/60">
                    {determineSandboxMode() || typeof window === "undefined"
                      ? "Pi Testnet"
                      : "Pi Mainnet"}
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
             {t("ACTIVATE AGENT", "تفعيل الوكيل", "激活代理")}
             <span className="ml-1 rounded-md bg-black/30 px-2 py-0.5 text-[10px] font-bold">
               1 π
             </span>
           </motion.button>
          <p className="text-white/30 font-mono text-[10px] mt-2">
            {t(
              "Pay 1 π once — your DID document is created and linked to your verified Pi identity.",
              "ادفع 1 π مرة واحدة — يتم إنشاء مستند DID المرتبط بهويتك الموثقة في Pi.",
              "支付 1 π 一次 — 将创建您的 DID 文档并关联到已认证的 Pi 身份。"
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
              {t("AGENT ACTIVATED", "تم تفعيل الوكيل", "代理已激活")}
            </h3>
            <p className="font-mono text-sm text-white/50">
              {t(
                "Your sovereign identity is now on-chain",
                "هويتك السيادية الآن على السلسلة",
                "您的主权身份现已上链"
              )}
            </p>

            {/* Trust artifact — proof, not promises */}
            <div className="mt-4 p-3 rounded-xl bg-black/40 border border-glass text-left space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono text-[10px] text-white/40">
                  {t("DID", "المعرّف", "DID")}
                </span>
                <span className="font-mono text-[10px] text-white/80 truncate select-all">
                  {user?.did || user?.agent?.id || "did:axiom:…"}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono text-[10px] text-white/40">
                  {t("Director · Runtime", "المصدر · التشغيل", "目录 · 运行时")}
                </span>
                <span className="font-mono text-[10px] text-electric-blue truncate">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/.well-known/runtime`
                    : "/.well-known/runtime"}
                </span>
              </div>
            </div>
          </div>

          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.03, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
              whileTap={{ scale: 0.97, transition: { ease: [0.16, 1, 0.3, 1] as const } }}
              className="w-full max-w-sm mx-auto bg-gradient-to-r from-electric-blue to-blue-600 text-white font-sans font-bold py-4 px-8 rounded-xl backdrop-blur-md shadow-lg shadow-electric-blue/10 border border-glass-hover flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-electric-blue/20 transition-shadow"
            >
              {t("ENTER DASHBOARD", "الدخول إلى لوحة التحكم", "进入仪表盘")}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </Link>

          {/* What happens next? */}
          <div className="mt-6 text-left">
            <p className="text-white/40 font-mono text-xs uppercase tracking-wider mb-3">
              {t("What happens next?", "ماذا يحدث بعد ذلك؟", "接下来会发生什么？")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  icon: Sparkles,
                  title: t("Earn your first XP", "اكسب أول نقاط XP", "赚取您的第一笔 XP"),
                  desc: t("Complete KYA verification and connect accounts", "أكمل التحقق من KYA واربط الحسابات", "完成 KYA 验证并关联账户"),
                },
                {
                  icon: Globe,
                  title: t("Explore the network", "استكشف الشبكة", "探索网络"),
                  desc: t("See other agents and their trust scores", "شاهد العملاء الآخرين ونقاط ثقتهم", "查看其他代理及其信任分数"),
                },
                {
                  icon: Rocket,
                  title: t("Deploy your first skill", "نشر أول مهارة", "部署您的第一个技能"),
                  desc: t("Give your agent new capabilities from the marketplace", "امنح وكيلك قدرات جديدة من السوق", "从市场为您的代理赋予新能力"),
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
