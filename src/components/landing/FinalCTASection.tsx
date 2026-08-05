interface FinalCTASectionProps {
  t: (key: string) => string;
}

/**
 * Closing conversion band — sparse, high-contrast, premium AI product style.
 */
export default function FinalCTASection({ t }: FinalCTASectionProps) {
  return (
    <section
      className="w-full max-w-6xl px-4 sm:px-6 z-10 border-t"
      style={{
        borderColor: "var(--card-border)",
        paddingBlock: "clamp(5rem, 11vh, 8rem)",
      }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-14 sm:px-12 sm:py-16 text-center">
        {/* Soft spotlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.12), transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative space-y-6">
          <span className="inline-block text-[10px] font-mono tracking-[0.2em] uppercase text-electric-blue">
            {t("final_cta_badge")}
          </span>
          <h2
            className="font-bold text-white tracking-[-0.04em] leading-[1.05] max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.75rem, 4.5vw, 3rem)" }}
          >
            {t("final_cta_title")}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto text-pretty leading-relaxed">
            {t("final_cta_desc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="/claim"
              className="btn-primary py-3.5 px-8 text-sm font-mono tracking-wider w-full sm:w-auto shadow-[0_0_24px_rgba(59,130,246,0.28)] hover:shadow-[0_0_36px_rgba(59,130,246,0.45)] transition-all focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
            >
              {t("final_cta_button")}
            </a>
            <a
              href="/docs"
              className="text-xs sm:text-sm font-mono text-subtle hover:text-surface transition-colors px-5 py-3 border border-glass hover:border-glass-hover rounded-xl focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none w-full sm:w-auto text-center"
            >
              {t("hero_cta_explore")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
