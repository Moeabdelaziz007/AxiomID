'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)', flag: '🇨🇳', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr' },
];

const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: {
    heroTitle: 'The Agent Economy\'s Operating System',
    heroSubtitle: 'Build, deploy, and monetize AI agents on Pi Network. 60M users. 18M KYC. Native payments. Verifiable identity.',
    getStarted: 'Get Started',
    viewDocs: 'View Docs',
    atomTitle: 'THE ATOM',
    atomSubtitle: 'PaiSkill Interface — Immutable. Frozen. The ABI of the Agent Economy.',
    atomDesc: 'One interface. 50 lines. Everything composes on it. v1 = final. v2 = new name.',
    viewAtom: 'View Atom Spec',
    skillsTitle: 'SKILLS REGISTRY',
    skillsSubtitle: 'Executable. Priced. Sandboxed. Revenue-sharing built-in.',
    verify: 'Verify',
    trust: 'Trust',
    pay: 'Pay',
    wallet: 'Wallet',
    intentTitle: 'INTENT EXCHANGE',
    intentSubtitle: '"I need X" → Auction → Skill wins → Executes → Pays. AdWords for agents.',
    tryIntent: 'Try Intent Exchange',
    simulatorTitle: 'PAI SIMULATOR',
    simulatorSubtitle: 'Test 10,000 strategies before deploying 1. War games for agents.',
    runSimulation: 'Run Simulation',
    bridgeTitle: 'BRIDGE PROTOCOL',
    bridgeSubtitle: 'Works on BOTH internets. US cloud + Chinese edge. One protocol.',
    learnMore: 'Learn More',
    footerText: 'Built with Love, Honesty, Trust & Security First',
    language: 'Language',
    theme: 'Theme',
    search: 'Search',
    menu: 'Menu',
    close: 'Close',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
  },
  zh: {
    heroTitle: 'Agent 经济的操作系统',
    heroSubtitle: '在 Pi Network 上构建、部署和货币化 AI Agent。6000 万用户。1800 万 KYC。原生支付。可验证身份。',
    getStarted: '开始使用',
    viewDocs: '查看文档',
    atomTitle: '原子',
    atomSubtitle: 'PaiSkill 接口 — 不可变。冻结。Agent 经济的 ABI。',
    atomDesc: '一个接口。50 行。一切皆可组合。v1 = 最终版。v2 = 新名字。',
    viewAtom: '查看 Atom 规范',
    skillsTitle: '技能注册表',
    skillsSubtitle: '可执行。定价。沙箱。内置收益分成。',
    verify: '验证',
    trust: '信任',
    pay: '支付',
    wallet: '钱包',
    intentTitle: '意图交易所',
    intentSubtitle: '"我需要 X" → 拍卖 → 技能胜出 → 执行 → 支付。Agent 版 AdWords。',
    tryIntent: '尝试意图交易所',
    simulatorTitle: 'PAI 模拟器',
    simulatorSubtitle: '部署前测试 10,000 种策略。Agent 的战争游戏。',
    runSimulation: '运行模拟',
    bridgeTitle: '桥接协议',
    bridgeSubtitle: '同时在两个互联网上工作。美国云 + 中国边缘。一个协议。',
    learnMore: '了解更多',
    footerText: '以爱、诚实、信任和安全优先构建',
    language: '语言',
    theme: '主题',
    search: '搜索',
    menu: '菜单',
    close: '关闭',
    dark: '深色',
    light: '浅色',
    system: '跟随系统',
  },
  es: {
    heroTitle: 'El Sistema Operativo de la Economía de Agentes',
    heroSubtitle: 'Construye, despliega y monetiza agentes de IA en Pi Network. 60M usuarios. 18M KYC. Pagos nativos. Identidad verificable.',
    getStarted: 'Comenzar',
    viewDocs: 'Ver Documentos',
    atomTitle: 'EL ÁTOMO',
    atomSubtitle: 'Interfaz PaiSkill — Inmutable. Congelada. El ABI de la Economía de Agentes.',
    atomDesc: 'Una interfaz. 50 líneas. Todo se compone sobre ella. v1 = final. v2 = nuevo nombre.',
    viewAtom: 'Ver Especificación Atom',
    skillsTitle: 'REGISTRO DE HABILIDADES',
    skillsSubtitle: 'Ejecutable. Preciado. En sandbox. Revenue-sharing integrado.',
    verify: 'Verificar',
    trust: 'Confianza',
    pay: 'Pagar',
    wallet: 'Billetera',
    intentTitle: 'EXCHANGE DE INTENCIONES',
    intentSubtitle: '"Necesito X" → Subasta → Habilidad gana → Ejecuta → Paga. AdWords para agentes.',
    tryIntent: 'Probar Exchange de Intenciones',
    simulatorTitle: 'SIMULADOR PAI',
    simulatorSubtitle: 'Prueba 10,000 estrategias antes de desplegar 1. Juegos de guerra para agentes.',
    runSimulation: 'Ejecutar Simulación',
    bridgeTitle: 'PROTOCOLO PUENTE',
    bridgeSubtitle: 'Funciona en AMBOS internets. Nube US + borde China. Un protocolo.',
    learnMore: 'Más Información',
    footerText: 'Construido con Amor, Honestidad, Confianza y Seguridad Primero',
    language: 'Idioma',
    theme: 'Tema',
    search: 'Buscar',
    menu: 'Menú',
    close: 'Cerrar',
    dark: 'Oscuro',
    light: 'Claro',
    system: 'Sistema',
  },
  ar: {
    heroTitle: 'نظام التشغيل لاقتصاد الوكلاء',
    heroSubtitle: 'بناء ونشر وتحقيق الدخل من وكلاء الذكاء الاصطناعي على شبكة Pi. 60 مليون مستخدم. 18 مليون KYC. مدفوعات أصلية. هوية قابلة للتحقق.',
    getStarted: 'ابدأ الآن',
    viewDocs: 'عرض المستندات',
    atomTitle: 'الذرة',
    atomSubtitle: 'واجهة PaiSkill — غير قابلة للتغيير. مجمدة. ABI لاقتصاد الوكلاء.',
    atomDesc: 'واجهة واحدة. 50 سطر. كل شيء يُركب عليها. v1 = نهائي. v2 = اسم جديد.',
    viewAtom: 'عرض مواصفات Atom',
    skillsTitle: 'سجل المهارات',
    skillsSubtitle: 'قابلة للتنفيذ. ذات تسعير. في بيئة معزولة. تقاسم الإيرادات مدمج.',
    verify: 'تحقق',
    trust: 'ثقة',
    pay: 'ادفع',
    wallet: 'محفظة',
    intentTitle: 'تبادل النوايا',
    intentSubtitle: '"أحتاج X" → مزاد → المهارة تفوز → تنفذ → تدفع. AdWords للوكلاء.',
    tryIntent: 'جرب تبادل النوايا',
    simulatorTitle: 'محاكي PAI',
    simulatorSubtitle: 'اختبر 10,000 استراتيجية قبل نشر واحدة. ألعاب حرب للوكلاء.',
    runSimulation: 'تشغيل المحاكاة',
    bridgeTitle: 'بروتوكول الجسر',
    bridgeSubtitle: 'يعمل على الإنترنتين كليهما. سحابة أمريكية + حافة صينية. بروتوكول واحد.',
    learnMore: 'اعرف المزيد',
    footerText: 'مبني بالحب والأمانة والثقة والأمان أولاً',
    language: 'اللغة',
    theme: 'المظهر',
    search: 'بحث',
    menu: 'القائمة',
    close: 'إغلاق',
    dark: 'داكن',
    light: 'فاتح',
    system: 'النظام',
  },
};

export type TranslationKeys = keyof typeof LANGUAGE_NAMES.en;

export function useTranslation(language: string = 'en') {
  const [t, setT] = useState<Record<string, string>>(LANGUAGE_NAMES.en);
  
  useEffect(() => {
    setT(LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en);
  }, [language]);
  
  return {
    t,
    translate: (key: TranslationKeys) => t[key] || LANGUAGE_NAMES.en[key],
  };
}

// Language Switcher Component
export function LanguageSwitcher({ 
  currentLanguage, 
  onChange,
  className 
}: { 
  currentLanguage: string;
  onChange: (lang: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <motion.button
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800/50 border border-dark-600 hover:border-pai-500/50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-lg">{SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.flag || '🇺🇸'}</span>
        <span className="text-sm font-medium text-dark-200 hidden sm:block">
          {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.name || 'English'}
        </span>
        <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-48 glass-dark rounded-xl border border-dark-600 py-1 overflow-hidden z-50"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <motion.button
              key={lang.code}
              onClick={() => onChange(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                currentLanguage === lang.code 
                  ? 'bg-pai-500/20 text-pai-400' 
                  : 'text-dark-200 hover:bg-dark-700 hover:text-white'
              }`}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              <span className="text-xs text-dark-400 ml-auto">{lang.nativeName}</span>
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Theme Switcher Component
export function ThemeSwitcher({ 
  currentTheme, 
  onChange,
  className 
}: { 
  currentTheme: 'dark' | 'light' | 'system';
  onChange: (theme: 'dark' | 'light' | 'system') => void;
  className?: string;
}) {
  const themes = [
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'system', label: 'System', icon: '💻' },
  ];
  
  return (
    <div className={cn('relative', className)}>
      <motion.button
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-800/50 border border-dark-600 hover:border-pai-500/50 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-lg">
          {themes.find(t => t.value === currentTheme)?.icon || '🌙'}
        </span>
        <span className="text-sm font-medium text-dark-200 hidden sm:block capitalize">
          {currentTheme}
        </span>
        <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-40 glass-dark rounded-xl border border-dark-600 py-1 overflow-hidden z-50"
        >
          {themes.map(theme => (
            <motion.button
              key={theme.value}
              onClick={() => onChange(theme.value as 'dark' | 'light' | 'system')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                currentTheme === theme.value 
                  ? 'bg-pai-500/20 text-pai-400' 
                  : 'text-dark-200 hover:bg-dark-700 hover:text-white'
              }`}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{theme.icon}</span>
              <span className="capitalize">{theme.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Header Component
export function Header() {
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const t = LANGUAGE_NAMES[language];
  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'system') {
      document.documentElement.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(theme);
    }
  }, [theme]);
  
  const navItems = [
    { href: '#atom', label: t.atomTitle.split(' ')[0] },
    { href: '#skills', label: t.skillsTitle.split(' ')[0] },
    { href: '#intent', label: t.intentTitle.split(' ')[0] },
    { href: '#simulator', label: t.simulatorTitle.split(' ')[0] },
    { href: '#bridge', label: t.bridgeTitle.split(' ')[0] },
    { href: '/docs', label: 'Docs' },
    { href: '/playground', label: 'Playground' },
  ];
  
  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-dark-950/95 backdrop-blur-xl border-b border-dark-700' : 'bg-transparent'
    )}>
      <nav className="container-custom flex items-center justify-between h-16 lg:h-20" aria-label="Main navigation">
        {/* Logo */}
        <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
          <motion.svg
            viewBox="0 0 32 32"
            className="w-8 h-8 lg:w-10 lg:h-10"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="paiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#39ff14" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="15" stroke="url(#paiGradient)" strokeWidth="2" />
            <path d="M16 8V24M8 16H24" stroke="url(#paiGradient)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="16" r="6" fill="url(#paiGradient)" />
          </motion.svg>
          
          <motion.span className="hidden lg:block font-display font-black text-xl lg:text-2xl" whileHover={{ x: 4 }}>
            <span className="bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600 bg-clip-text text-transparent">PAI</span>
          </motion.span>
          
          <motion.span className="hidden lg:inline-block ml-2 text-xs font-mono text-pai-400/80 uppercase tracking-wider" whileHover={{ opacity: [1, 0, 1] }} transition={{ duration: 0.5 }}>
            BYE
          </motion.span>
        </motion.div>
        
        {/* Desktop Navigation */}
        <motion.nav className="hidden lg:flex items-center gap-1 lg:gap-2" role="navigation" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <motion.a
              key={item.href}
              href={item.href}
              className="relative px-4 py-2 rounded-xl text-sm font-medium text-dark-300 hover:text-white transition-colors overflow-hidden"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{ transitionDelay: `${index * 0.05}s` }}
            >
              <span className="relative z-10">{item.label}</span>
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-pai-500/20 to-pai-600/20 rounded-xl opacity-0"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          ))}
        </motion.nav>
        
        {/* Actions */}
        <motion.div className="flex items-center gap-3 lg:gap-4" style={{ transitionDelay: '0.2s' }}>
          <LanguageSwitcher currentLanguage={language} onChange={setLanguage} />
          <ThemeSwitcher currentTheme={theme} onChange={setTheme} />
          
          {/* CTA Buttons */}
          <motion.a
            href="/playground"
            className="hidden lg:inline-flex btn-primary"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {t.getStarted}
            <motion.svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4l-4 4" />
            </motion.svg>
          </motion.a>
          
          <motion.a
            href="/docs"
            className="hidden lg:inline-flex btn-secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t.viewDocs}
          </motion.a>
          
          {/* Mobile Menu Button */}
          <motion.button
            className="lg:hidden btn-ghost"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <motion.svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" animate={{ rotate: mobileMenuOpen ? 90 : 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </motion.svg>
          </motion.button>
        </motion.div>
      </nav>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-dark-950/98 backdrop-blur-xl flex flex-col"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center justify-center flex-1 gap-8 px-8">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="text-2xl font-medium text-dark-200 hover:text-pai-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                  whileHover={{ x: 16, color: '#39ff14' }}
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.div className="flex flex-col gap-4 mt-8" style={{ transitionDelay: '0.3s' }}>
                <LanguageSwitcher currentLanguage={language} onChange={setLanguage} />
                <ThemeSwitcher currentTheme={theme} onChange={setTheme} />
                <motion.a
                  href="/playground"
                  className="btn-primary w-full text-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t.getStarted}
                </motion.a>
                <motion.a
                  href="/docs"
                  className="btn-secondary w-full text-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t.viewDocs}
                </motion.a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Header;