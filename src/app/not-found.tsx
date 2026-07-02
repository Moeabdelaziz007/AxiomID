"use client";

import Link from "next/link";
import { useLanguage } from "./context/language-context";

export default function NotFound() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center justify-center p-6">
      <div className="scanline" />
      
      <div className="flex flex-col items-center gap-6 text-center z-10">
        <div className="relative">
          <span className="text-8xl md:text-9xl font-mono font-bold text-neon-green/10">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold text-neon-green">?</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-surface">{t("Page Not Found", "الصفحة غير موجودة")}</h1>
          <p className="text-sm text-subtle max-w-md">
            {t("This route does not exist in the AxiomID namespace. The identity layer you're looking for has not been provisioned.", "هذا المسار غير موجود في نطاق AxiomID. طبقة الهوية التي تبحث عنها لم يتم توفيرها.")}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-mono text-[10px] text-faint">
          <span className="text-neon-green">ERROR</span>: did:axiom:not-found:404
        </div>

        <div className="flex gap-3 mt-2">
          <Link href="/" className="btn-primary">
            {t("RETURN HOME", "العودة إلى الرئيسية")}
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            {t("DASHBOARD", "لوحة التحكم")}
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-[9px] font-mono text-faint">
        &copy; 2026 AxiomID
      </footer>
    </main>
  );
}
