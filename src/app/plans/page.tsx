import { Metadata } from "next";
import { getTranslation } from "@/i18n";
import { headers } from "next/headers";
import { StatusBar } from "@/components/os/StatusBar";
import { AuraDock } from "@/components/os/AuraDock";
import { BrandStrip } from "@/components/os/BrandStrip";
import { CheckoutButton } from "@/components/plans/CheckoutButton";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return {
    title: t("plans_title"),
    description: t("plans_desc"),
  };
}

const ALLOCATION = [
  { key: "f_sandbox_hours", levels: [25, 60, 100] },
  { key: "f_models", levels: [30, 65, 100] },
  { key: "f_memory", levels: [10, 40, 100] },
  { key: "f_windows", levels: [15, 55, 100] },
  { key: "f_shield", levels: [20, 50, 100] },
] as const;

const TIERS = [
  { id: "hobby", free: true },
  { id: "creator", popular: true },
  { id: "power" },
] as const;

export default async function PlansPage() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return (
    <>
      <main className="relative flex min-h-screen flex-col bg-grid overflow-hidden" id="main-content" role="main">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] spotlight-primary rounded-full pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] spotlight-accent rounded-full pointer-events-none" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />

        <StatusBar />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-4 py-20">
          <div className="text-center">
            <p className="font-mono text-[11px] tracking-[0.35em] text-cyan-400/80">{t("plans_alloc_header")}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t("plans_title")}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400">{t("plans_alloc_sub")}</p>
          </div>

          <div className="grid w-full max-w-5xl gap-5 md:grid-cols-3" role="list" aria-label={t("plans")}>
            {TIERS.map((tier) => (
              <section
                key={tier.id}
                role="listitem"
                className={`flex flex-col rounded-2xl border p-6 backdrop-blur transition-all duration-200 ${
                  "popular" in tier && tier.popular
                    ? "border-cyan-500/40 bg-cyan-500/[0.04] shadow-[0_0_30px_rgba(0,240,255,0.12)]"
                    : "border-white/10 bg-slate-950/70 hover:border-white/25"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-white">{t(`plan_${tier.id}_name`)}</h2>
                  {"popular" in tier && tier.popular && (
                    <span className="rounded-md border border-cyan-500/40 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                      P2
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{t(`plan_${tier.id}_tag`)}</p>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="font-mono text-4xl font-semibold text-white">{t(`plan_${tier.id}_price`)}</span>
                  <span className="pb-1 font-mono text-xs text-slate-500">{t("plan_unit")}</span>
                </div>

                <div className="my-6 h-px w-full bg-white/10" aria-hidden="true" />

                <ul className="flex flex-col gap-4">
                  {ALLOCATION.map((row, i) => (
                    <li key={row.key}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-slate-400">{t(row.key)}</span>
                        <span className="font-mono text-cyan-300/90">{t(`f_${tier.id}_${row.key.slice(2)}`)}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-full bg-white/10" aria-hidden="true">
                        <div
                          className="h-1 rounded-full bg-cyan-400/70"
                          style={{ width: `${row.levels[TIERS.indexOf(tier)]}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {tier.id === "hobby" ? (
                  <a
                    href="/claim"
                    className="mt-7 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-center font-mono text-sm text-white transition-all duration-200 hover:border-white/30"
                  >
                    {t("cta_free")}
                  </a>
                ) : (
                  <CheckoutButton plan={tier.id} />
                )}
              </section>
            ))}
          </div>

          <p className="max-w-lg text-center font-mono text-[11px] text-slate-500">{t("plans_billing_note")}</p>
        </div>

        <AuraDock />
        <BrandStrip />
      </main>
    </>
  );
}
