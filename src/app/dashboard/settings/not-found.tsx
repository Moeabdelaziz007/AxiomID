"use client";

import Link from "next/link";
import { useLanguage } from "../../context/language-context";

export default function NotFound() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4">
      <div className="bento-card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h2 className="text-lg font-bold text-surface font-mono mb-2">{t("Page Not Found", "الصفحة غير موجودة")}</h2>
        <p className="text-sm text-subtle mb-6">{t("The page you are looking for does not exist or has been moved.", "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.")}</p>
        <Link href="/" className="btn-primary text-xs px-4 py-2">
          {t("GO HOME", "الرئيسية")}
        </Link>
      </div>
    </div>
  );
}
