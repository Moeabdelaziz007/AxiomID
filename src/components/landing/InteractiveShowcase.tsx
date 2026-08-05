"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Brain, Zap, Shield, Globe, TerminalSquare, Search, Lock, Code2 } from "lucide-react";
import { useLanguage } from "@/app/context/language-context";

type TabId = 'roadmap' | 'architecture' | 'capsule';

export default function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>('roadmap');
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const tabs = [
    { id: 'roadmap' as TabId, label: t('Protocol Roadmap', 'خارطة طريق البروتوكول'), icon: <Globe className="w-4 h-4" /> },
    { id: 'architecture' as TabId, label: t('Identity Core', 'نواة الهوية'), icon: <Brain className="w-4 h-4" /> },
    { id: 'capsule' as TabId, label: t('Identity Capsule', 'كبسولة الهوية'), icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full flex flex-col gap-8 mb-16">
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-mono transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-electric-blue text-black font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="relative min-h-[400px] w-full rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-md p-6 sm:p-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-electric-blue/5 via-transparent to-axiom-purple/5 pointer-events-none" />
        
        <AnimatePresence mode="wait">
          
          {activeTab === 'roadmap' && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="w-full h-full flex flex-col gap-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold font-mono text-white mb-2">{t('Evolution of the Protocol', 'تطور البروتوكول')}</h3>
                <p className="text-sm text-zinc-400 font-mono">{t('From MVP to a Global Autonomous Identity Network.', 'من النموذج الأولي إلى شبكة هوية ذاتية الحكم عالمية.')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Connector line — offset to compensate for middle card translate */}
                <div className="hidden md:block absolute top-[calc(50%-2px)] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-electric-blue/20 via-axiom-purple/20 to-emerald-400/20 z-0" />
                
                <div className="bg-[#101217] border border-white/10 rounded-2xl p-6 relative z-10 hover:border-electric-blue/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-electric-blue/20 text-electric-blue flex items-center justify-center font-bold font-mono text-sm mb-4 border border-electric-blue/50">Q3</div>
                  <h4 className="font-bold text-white mb-2 font-mono">{t('Identity-First AI', 'الذكاء الاصطناعي بهوية أولاً')}</h4>
                  <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                    <li className="flex items-center gap-2"><Check /> {t('Single-click Agent Creation', 'إنشاء العميل بنقرة واحدة')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('Sovereign Subdomains', 'نطاقات فرعية سيادية')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('DDD Orchestration Engine', 'محرك تنسيق DDD')}</li>
                  </ul>
                </div>

                <div className="bg-[#101217] border border-white/10 rounded-2xl p-6 relative z-10 hover:border-axiom-purple/50 transition-colors transform md:-translate-y-4 shadow-xl">
                  <div className="w-8 h-8 rounded-full bg-axiom-purple/20 text-axiom-purple flex items-center justify-center font-bold font-mono text-sm mb-4 border border-axiom-purple/50">Q4</div>
                  <h4 className="font-bold text-white mb-2 font-mono">{t('Portable Trust', 'الثقة المحمولة')}</h4>
                  <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                    <li className="flex items-center gap-2"><Check /> {t('Identity Capsule Export', 'تصدير كبسولة الهوية')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('Federated Trust Graphs', 'رسوم ثقة فيدرالية')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('Cross-chain DID Anchoring', 'تثبيت DID عبر السلاسل')}</li>
                  </ul>
                </div>

                <div className="bg-[#101217] border border-white/10 rounded-2xl p-6 relative z-10 hover:border-emerald-400/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-bold font-mono text-sm mb-4 border border-emerald-400/50">Q1</div>
                  <h4 className="font-bold text-white mb-2 font-mono">{t('Autonomous Network', 'شبكة ذاتية الحكم')}</h4>
                  <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                    <li className="flex items-center gap-2"><Check /> {t('Cloudflare Workflows Gen', 'توليد تدفقات Cloudflare')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('Multi-Agent Delegation', 'تفويض متعدد العملاء')}</li>
                    <li className="flex items-center gap-2"><Check /> {t('Staking & Slashing Core', 'نواة التخزين والخصم')}</li>
                  </ul>
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="w-full h-full flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-bold font-mono text-white">{t('Event-Driven Job Orchestration', 'تنسيق المهام الموجهة بالأحداث')}</h3>
                <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                  {t(
                    'AxiomID utilizes Domain-Driven Design (DDD) to abstract complex infrastructure. Agent creation is handled by an',
                    'يستخدم AxiomID تصميم المجال (DDD) لتجريد البنية التحتية المعقدة. يتم معالجة إنشاء العميل بواسطة'
                  )} <span className="text-electric-blue">{t('Execution Engine', 'محرك التنفيذ')}</span> {t(
                    'resolving Capability Packs into discrete Provider Adapters (Cloudflare, Pi SDK, Ghost.build).',
                    'الذي يحول حزم القدرات إلى محولات مزود منفصلة (Cloudflare، Pi SDK، Ghost.build).'
                  )}
                </p>
                <div className="bg-[#101217] rounded-xl p-4 border border-white/10 font-mono text-[10px] sm:text-xs text-zinc-300 overflow-x-auto shadow-inner">
                  <pre className="text-emerald-400">await</pre> <span className="text-blue-400">engine</span>.<span className="text-yellow-200">execute</span>(jobId);<br/><br/>
                  <span className="text-zinc-500">{"// Event Sourced Transition Pipeline"}</span><br/>
                  <span className="text-white">IdentityCreated</span> <span className="text-zinc-600">→</span> <span className="text-white">DomainReserved</span> <span className="text-zinc-600">→</span> <br/>
                  <span className="text-white">PassportIssued</span> <span className="text-zinc-600">→</span> <span className="text-white">MarketplacePublished</span> <span className="text-zinc-600">→</span> <br/>
                  <span className="text-white">RuntimeProvisioned</span> <span className="text-zinc-600">→</span> <span className="text-emerald-400">Completed</span>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative w-64 h-64">
                   <div className="absolute inset-0 bg-gradient-to-r from-electric-blue/20 to-axiom-purple/20 rounded-full blur-3xl animate-pulse" />
                   <div className="absolute inset-4 border border-white/10 rounded-full flex items-center justify-center bg-[#101217]/50 backdrop-blur-md">
                     <TerminalSquare className="w-12 h-12 text-zinc-500" />
                   </div>
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#101217] border border-electric-blue rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                     <Fingerprint className="w-5 h-5 text-electric-blue" />
                   </div>
                   <div className="absolute bottom-4 right-4 w-12 h-12 bg-[#101217] border border-emerald-400 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                     <Zap className="w-5 h-5 text-emerald-400" />
                   </div>
                   <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#101217] border border-axiom-purple rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                     <Search className="w-5 h-5 text-axiom-purple" />
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'capsule' && (
            <motion.div
              key="capsule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="w-full h-full flex flex-col md:flex-row items-center gap-8"
            >
              <div className="flex-1 flex justify-center">
                 <div className="relative w-full max-w-xs aspect-square border border-white/10 rounded-3xl bg-gradient-to-br from-white/[0.05] to-transparent p-6 flex flex-col justify-between group hover:border-axiom-purple/50 transition-colors">
                    <div className="flex justify-between items-start">
                       <Shield className="w-8 h-8 text-axiom-purple" />
                       <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono font-bold text-white border border-white/20">.IDENTITY</div>
                    </div>
                    <div>
                       <div className="w-3/4 h-2 bg-white/10 rounded mb-2" />
                       <div className="w-1/2 h-2 bg-white/10 rounded mb-6" />
                       <div className="flex gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="w-2 h-2 rounded-full bg-electric-blue" />
                          <span className="w-2 h-2 rounded-full bg-axiom-purple" />
                       </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
                 </div>
              </div>
              <div className="flex-1 space-y-4 text-center md:text-start">
                <h3 className="text-2xl font-bold font-mono text-white">{t('The Identity Capsule', 'كبسولة الهوية')}</h3>
                <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                  {t('AxiomID goes beyond a profile page by introducing the portable', 'يتجاوز AxiomID صفحة الملف الشخصي من خلال تقديم')} <span className="text-white">passport.jsonld</span> {t('format.', 'التنسيق المحمول.')}
                </p>
                <ul className="text-xs text-zinc-300 font-mono space-y-3 mt-4 text-start inline-block">
                  <li className="flex items-center gap-3"><Code2 className="w-4 h-4 text-electric-blue" /> {t('Verifiable DID Credentials', 'بيانات DID قابلة للتحقق')}</li>
                  <li className="flex items-center gap-3"><Code2 className="w-4 h-4 text-emerald-400" /> {t('Trust Score History', 'سجل درجة الثقة')}</li>
                  <li className="flex items-center gap-3"><Code2 className="w-4 h-4 text-axiom-purple" /> {t('Installed Capability Packs', 'حزم القدرات المثبتة')}</li>
                  <li className="flex items-center gap-3"><Code2 className="w-4 h-4 text-zinc-400" /> {t('Embedded Base Genome', 'الجينوم الأساسي المضمّن')}</li>
                </ul>
                <p className="text-xs text-zinc-500 font-mono italic mt-4">
                  {t('* Any compliant agent runtime can import this capsule to instantly inherit the sovereign identity and privileges.', '* أي وقت تشغيل عميل متوافق يمكنه استيراد هذه الكبسولة لوراثة الهوية السيادية والامتيازات فوراً.')}
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function Check() {
  return <span className="text-emerald-400 text-lg leading-none">✓</span>;
}
