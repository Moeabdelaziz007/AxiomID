"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "../context/language-context";

export default function Terms() {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen bg-grid relative">
      <div className="scanline" />

      <Header showBack />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-20 relative z-10">
        <div className="bento-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20">
              {t("terms_legal")}
            </span>
            <span className="text-xs font-mono text-faint">{t("terms_last_updated")}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {t("terms_title_main")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">{t("terms_title_highlight")}</span>
          </h1>
          <p className="text-subtle text-sm mb-8 font-mono">
            {t("terms_subtitle")}
          </p>

          <div className="space-y-6 text-subtle text-sm leading-relaxed">
            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                {t("terms_use")}
              </h2>
              <p>{t("terms_use_desc")}</p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
                {t("terms_wallet")}
              </h2>
              <p>{t("terms_wallet_desc")}</p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-axiom-purple" />
                {t("terms_ai_agent")}
              </h2>
              <p>{t("terms_ai_agent_desc")}</p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                {t("terms_liability")}
              </h2>
              <p>{t("terms_liability_desc")}</p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                {t("terms_changes")}
              </h2>
              <p>{t("terms_changes_desc")}</p>
            </section>
          </div>
        </div>

        <Footer minimal copyright="© 2026 AxiomID — Built on Pi Network" />
      </div>
    </main>
  );
}
