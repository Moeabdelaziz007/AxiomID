"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/app/context/language-context";

interface LegalSection {
  titleKey: string;
  descKey: string;
  color: string;
}

interface LegalPageProps {
  badgeKey: string;
  dateKey: string;
  titleMainKey: string;
  titleHighlightKey: string;
  subtitleKey: string;
  sections: LegalSection[];
}

const colorMap: Record<string, string> = {
  green: "bg-neon-green",
  blue: "bg-electric-blue",
  purple: "bg-axiom-purple",
};

export function LegalPage({
  badgeKey,
  dateKey,
  titleMainKey,
  titleHighlightKey,
  subtitleKey,
  sections,
}: LegalPageProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-grid relative">
      <div className="scanline" />

      <Header showBack />

      <div className="max-w-3xl mx-auto px-4 pb-20 relative z-10">
        <div className="bento-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20">
              {t(badgeKey)}
            </span>
            <span className="text-xs font-mono text-faint">{t(dateKey)}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {t(titleMainKey)} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">{t(titleHighlightKey)}</span>
          </h1>
          <p className="text-subtle text-sm mb-8 font-mono">
            {t(subtitleKey)}
          </p>

          <div className="space-y-6 text-subtle text-sm leading-relaxed">
            {sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${colorMap[section.color] || "bg-neon-green"}`} />
                  {t(section.titleKey)}
                </h2>
                <p>{t(section.descKey)}</p>
              </section>
            ))}
          </div>
        </div>

        <Footer minimal copyright="© 2026 AxiomID — Built on Pi Network" />
      </div>
    </main>
  );
}
