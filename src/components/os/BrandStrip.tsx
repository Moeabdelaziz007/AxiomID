"use client";

import Image from "next/image";
import { useLanguage } from "@/app/context/language-context";

const PARTNERS = [
  { name: "Vercel", src: "https://assets.vercel.com/image/upload/v1662131052/front/favicon-32x32.png", alt: "Vercel" },
  { name: "Cloudflare", src: "https://www.cloudflare.com/favicon.ico", alt: "Cloudflare" },
  { name: "Google Gemini", src: "https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685c24db4a9363f9a2da1230212310f40d9682e6e38.png", alt: "Google Gemini" },
  { name: "Pi Network", src: "https://minepi.com/favicon.ico", alt: "Pi Network" },
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
              href={`https://${p.name.toLowerCase().replace(" ", "")}.com`}
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