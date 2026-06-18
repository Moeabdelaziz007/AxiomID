"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/language-context";

/**
 * Renders a 404 page for a missing passport with a call-to-action to create a new one.
 */
export default function PassportNotFound() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
            <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">{t('passport_not_found')}</h1>
          <p className="text-gray-400 mb-8">
            {t('passport_not_found_description')}
          </p>
          <Link href="/" className="btn-primary text-xs">
            {t('create_your_passport')}
          </Link>
        </div>
      </div>
    </main>
  );
}
