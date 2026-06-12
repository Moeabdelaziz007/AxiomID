"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

export const translations = {
  en: {
    // Navigation / Header
    nav_dashboard: "Dashboard",
    dashboard_title: "AxiomID Dashboard",
    nav_settings: "Settings",
    nav_status: "Network Status",
    nav_privacy: "Privacy Policy",
    nav_terms: "Terms of Service",
    connect_wallet: "Connect Pi Wallet",
    disconnect_wallet: "Disconnect",
    // Landing
    hero_title: "AxiomID",
    hero_heading: "Agent Identity for the AI Era.",
    hero_desc: "Your DID-based Agent Passport. Verify once, prove everywhere. KYA + KYC compliant identity for humans and their AI agents.",
    hero_subtitle: "The Human Authorization Protocol. Decentralized identity verification for human-AI collaboration.",
    hero_badge: "SECURE IDENTITY LAYER",
    btn_launch: "Launch Dashboard",
    btn_explorer: "Explore Protocol",
    stat_agents: "Registered Agents",
    stat_tx: "Total Transactions",
    stat_trust: "Average Trust Score",
    stat_users: "Active Users",
    // Dashboard
    welcome: "Welcome back",
    welcome_back: "Welcome back",
    your_passport: "Agent Passport",
    xp_balance: "XP Balance",
    trust_score: "Trust Score",
    tier: "Identity Tier",
    stamps_board: "Identity Stamps",
    claim_stamp: "Claim Stamp",
    stamps_desc: "Verify your credentials and links to claim cryptographic identity stamps.",
    connected: "Connected",
    not_connected: "Not Connected",
    agent_stats: "Agent Stats",
    skills: "Skills",
    quick_links: "Quick Links",
    identity_verification_kya: "Identity Verification (KYA)",
    skills_marketplace: "Skills Marketplace",
    create_your_agent: "Create Your Agent",
    agent_quick_actions: "Agent Quick Actions",
    replay_onboarding: "REPLAY ONBOARDING",
    demo_mode: "Demo Mode",
    demo_mode_desc: "Connect your wallet to claim actions and manage your agent.",
    // Settings
    settings_title: "Protocol Settings",
    settings_desc: "Manage your cryptographic credentials, linked accounts, and passport details.",
    linked_accounts: "Linked Platforms",
    credential_vc: "Verifiable Credential (VC)",
    view_vc: "View VC Payload",
    close: "Close",
    wallet_address: "Wallet Address",
    did: "Decentralized Identifier (DID)",
    system_appearance: "System Appearance",
    // Status
    status_title: "Network & Agent Status",
    status_desc: "Real-time protocol status and agent verification metrics.",
    operational: "Operational",
    system_all_good: "All systems are operating normally.",
    averages: "Averages & Rates",
    total_xp: "Total XP Earned",
    verification_rate: "Verification Success Rate",
    // Onboarding
    onboarding_title_1: "AxiomID Sovereign Protocol",
    onboarding_title_2: "AxiomID: The Soul Protocol",
    onboarding_title_3: "Your Passport is Ready!",
    onboarding_desc_1: "Establish your sovereign cryptographic proof of humanity. Link your credentials to gain trust points and earn stamps.",
    onboarding_desc_2: "Authorize autonomous agents to perform transactions on your behalf with safe-guards.",
    onboarding_desc_3: "Your Decentralized Identity (DID) and Agent Passport are active. Welcome to the root of trust.",
    onboarding_step_1: "Wallet Connection",
    onboarding_step_2: "Agent Creation",
    onboarding_step_3: "Ready",
    next: "Next",
    back: "Back",
    finish: "Get Started",
    // General
    loading: "Loading cryptographic context...",
    visitor: "Visitor",
    citizen: "Citizen",
    validator: "Validator",
    sovereign: "Sovereign",
    view_demo: "VIEW DEMO",
    enter_dashboard: "ENTER DASHBOARD",
    logout: "LOGOUT",
    connecting: "CONNECTING...",
    connect: "CONNECT",
  },
  ar: {
    // Navigation / Header
    nav_dashboard: "لوحة التحكم",
    dashboard_title: "لوحة تحكم AxiomID",
    nav_settings: "الإعدادات",
    nav_status: "حالة الشبكة",
    nav_privacy: "سياسة الخصوصية",
    nav_terms: "شروط الخدمة",
    connect_wallet: "ربط محفظة Pi",
    disconnect_wallet: "قطع الاتصال",
    // Landing
    hero_title: "AxiomID",
    hero_heading: "هوية العملاء لعصر الذكاء الاصطناعي.",
    hero_desc: "جواز العميل اللامركزي القائم على المعرفات اللامركزية DIDs. تحقق مرة واحدة، وأثبت هويتك في كل مكان. هوية متوافقة مع معايير KYA و KYC للبشر وعملائهم الآليين.",
    hero_subtitle: "بروتوكول تفويض الهوية البشرية. توثيق الهوية اللامركزية للتعاون المشترك بين البشر والذكاء الاصطناعي.",
    hero_badge: "طبقة الهوية المؤمنة",
    btn_launch: "تشغيل لوحة التحكم",
    btn_explorer: "استكشاف البروتوكول",
    stat_agents: "العملاء المسجلون",
    stat_tx: "إجمالي العمليات",
    stat_trust: "معدل نقاط الثقة",
    stat_users: "المستخدمون النشطون",
    // Dashboard
    welcome: "مرحباً بك مجدداً",
    welcome_back: "مرحباً بك مجدداً",
    your_passport: "جواز العميل",
    xp_balance: "رصيد نقاط XP",
    trust_score: "نقاط الثقة",
    tier: "فئة الهوية",
    stamps_board: "طوابع الهوية",
    claim_stamp: "المطالبة بالطابع",
    stamps_desc: "قم بتوثيق حساباتك وروابطك للمطالبة بطوابع الهوية التشفيرية.",
    connected: "متصل",
    not_connected: "غير متصل",
    agent_stats: "إحصائيات العميل",
    skills: "المهارات",
    quick_links: "روابط سريعة",
    identity_verification_kya: "توثيق الهوية (KYA)",
    skills_marketplace: "سوق المهارات",
    create_your_agent: "أنشئ عميلك الآلي",
    agent_quick_actions: "إجراءات العميل السريعة",
    replay_onboarding: "إعادة عرض الترحيب",
    demo_mode: "وضع العرض التجريبي",
    demo_mode_desc: "قم بربط محفظتك للمطالبة بالعمليات وإدارة عميلك الآلي.",
    // Settings
    settings_title: "إعدادات البروتوكول",
    settings_desc: "إدارة المؤهلات التشفيرية، الحسابات المرتبطة، وتفاصيل الجواز الخاص بك.",
    linked_accounts: "المنصات المرتبطة",
    credential_vc: "الوثيقة القابلة للتحقق (VC)",
    view_vc: "عرض تفاصيل الوثيقة (VC)",
    close: "إغلاق",
    wallet_address: "عنوان المحفظة",
    did: "المعرف اللامركزي (DID)",
    system_appearance: "مظهر النظام",
    // Status
    status_title: "حالة الشبكة والعميل",
    status_desc: "مؤشرات حالة البروتوكول المباشرة ومقاييس توثيق العملاء.",
    operational: "يعمل بشكل طبيعي",
    system_all_good: "جميع الأنظمة تعمل بشكل طبيعي وآمن.",
    averages: "المعدلات والنسب",
    total_xp: "إجمالي نقاط XP المكتسبة",
    verification_rate: "نسبة توثيق الهوية الناجحة",
    // Onboarding
    onboarding_title_1: "بروتوكول AxiomID السيادي",
    onboarding_title_2: "AxiomID: بروتوكول الروح",
    onboarding_title_3: "جواز سفرك أصبح جاهزاً!",
    onboarding_desc_1: "أنشئ دليلك التشفيري السيادي على بشريتك. اربط حساباتك للحصول على نقاط ثقة وطوابع تشفيرية.",
    onboarding_desc_2: "قم بتفويض عملاء مستقلين لإجراء المعاملات نيابة عنك بحماية أمنية كاملة.",
    onboarding_desc_3: "المعرف اللامركزي (DID) وجواز العميل الخاص بك نشط الآن. أهلاً بك في جذر الثقة.",
    onboarding_step_1: "ربط المحفظة",
    onboarding_step_2: "إنشاء العميل",
    onboarding_step_3: "جاهز",
    next: "التالي",
    back: "السابق",
    finish: "ابدأ الآن",
    // General
    loading: "جاري تحميل الهوية التشفيرية...",
    visitor: "زائر",
    citizen: "مواطن",
    validator: "مدقق",
    sovereign: "سيادي",
    view_demo: "عرض العرض التجريبي",
    enter_dashboard: "دخول لوحة التحكم",
    logout: "تسجيل الخروج",
    connecting: "جاري الاتصال...",
    connect: "اتصال",
  }
};

type TranslationsKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationsKey | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("aix_language") as Language;
    if (saved === "en" || saved === "ar") {
      setLanguageState(saved);
    } else {
      // Default to english
      setLanguageState("en");
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("aix_language", lang);
  };

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, mounted]);

  const t = (key: string): string => {
    const dict = translations[language] || translations.en;
    return (dict as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
