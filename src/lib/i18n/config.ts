// PAI Internationalization - 3 Languages: Arabic, English, Chinese
// src/lib/i18n/config.ts

export const LOCALES = {
  en: { name: 'English', native: 'English', dir: 'ltr', flag: '🇺🇸' },
  ar: { name: 'Arabic', native: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  zh: { name: 'Chinese', native: '中文', dir: 'ltr', flag: '🇨🇳' },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES_LIST: Locale[] = ['en', 'ar', 'zh'];

// Route mapping for localized URLs
export const ROUTE_TRANSLATIONS = {
  en: {
    home: '/',
    docs: '/docs',
    skills: '/skills',
    playground: '/playground',
    pricing: '/pricing',
    about: '/about',
    blog: '/blog',
  },
  ar: {
    home: '/',
    docs: '/المستندات',
    skills: '/المهارات',
    playground: '/ساحة-اللعب',
    pricing: '/التسعير',
    about: '/حول',
    blog: '/المدونة',
  },
  zh: {
    home: '/',
    docs: '/文档',
    skills: '/技能',
    playground: '/游乐场',
    pricing: '/定价',
    about: '/关于',
    blog: '/博客',
  },
};