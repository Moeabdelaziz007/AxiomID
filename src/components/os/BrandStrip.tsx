"use client";

import Image from "next/image";
import { useLanguage } from "@/app/context/language-context";

const PARTNERS = [
  { name: "Vercel", href: "https://vercel.com", src: "https://assets.vercel.com/image/upload/v1580105858/repositories/vercel/logo.png", alt: "Vercel" },
  { name: "Cloudflare", href: "https://www.cloudflare.com", src: "https://www.cloudflare.com/favicon.ico", alt: "Cloudflare" },
  { name: "Google Gemini", href: "https://gemini.google.com", src: "https://www.google.com/favicon.ico", alt: "Google Gemini" },
  { name: "Pi Network", href: "https://minepi.com", src: "https://minepi.com/favicon.ico", alt: "Pi Network" },
];

export function BrandStrip() {
  const { t, language } = useLanguage();
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 px-4 py-2 pointer-events-none"
      dir={dir}
      role="contentinfo"
      aria-label={t("technology_partners")}
    >
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
          {t("built_on")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
          {PARTNERS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-6 w-6 items-center justify-center rounded transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label={p.alt}
            >
              <Image src={p.src} alt={p.alt} width={24} height={24} className="object-contain" unoptimized />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}