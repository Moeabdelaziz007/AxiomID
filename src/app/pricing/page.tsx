import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslation } from "@/i18n";
import type { Language } from "@/app/context/language-context";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const revalidate = 60;

/**
 * Generates SEO metadata for the pricing page.
 *
 * @returns Static metadata describing AxiomID trust tiers and Pi Network pricing.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Pricing & Trust Tiers",
    description:
      "AxiomID trust tiers — from Visitor to Sovereign. Pi Network native pricing. Start free, level up with XP.",
    alternates: { canonical: "/pricing" },
    openGraph: {
      title: "AxiomID Pricing & Trust Tiers",
      description:
        "Pi Network native pricing. Start free, level up with XP.",
    },
  };
}

interface TierPricing {
  key: "visitor" | "citizen" | "validator" | "sovereign";
  letter: string;
  color: string;
  priceEn: string;
  priceAr: string;
  priceCurrency: string;
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  featuresEn: string[];
  featuresAr: string[];
  xp: string;
  featured?: boolean;
}

const tiers: TierPricing[] = [
  {
    key: "visitor",
    letter: "V",
    color: "#64748b",
    priceEn: "Free",
    priceAr: "مجاناً",
    priceCurrency: "PI",
    nameEn: "Visitor",
    nameAr: "زائر",
    taglineEn: "Limited, basic read-only",
    taglineAr: "وصول مقروء أساسي محدود",
    featuresEn: [
      "Basic DID Passport",
      "Protocol explorer access",
      "Community read access",
    ],
    featuresAr: [
      "جواز DID أساسي",
      "الوصول لمستكشف البروتوكول",
      "وصول مقروء للمجتمع",
    ],
    xp: "0",
  },
  {
    key: "citizen",
    letter: "C",
    color: "#00ff41",
    priceEn: "Free",
    priceAr: "مجاناً",
    priceCurrency: "PI",
    nameEn: "Citizen",
    nameAr: "مواطن",
    taglineEn: "Social stamps, basic agent access (100 XP)",
    taglineAr: "طوابع اجتماعية، وصول أساسي للعملاء (100 XP)",
    featuresEn: [
      "Social stamps & KYA verification",
      "Basic agent deployment",
      "Marketplace read access",
      "XP rewards",
    ],
    featuresAr: [
      "طوابع اجتماعية وتوثيق KYA",
      "نشر أساسي للعملاء",
      "وصول مقروء للسوق",
      "مكافآت XP",
    ],
    xp: "100",
  },
  {
    key: "validator",
    letter: "V",
    color: "#00d4ff",
    priceEn: "25 PI",
    priceAr: "25 PI",
    priceCurrency: "PI",
    nameEn: "Validator",
    nameAr: "مدقق",
    taglineEn: "Agent delegation, marketplace install (500 XP)",
    taglineAr: "تفويض العملاء، تثبيت من السوق (500 XP)",
    featuresEn: [
      "Agent delegation & marketplace install",
      "KYC verified identity",
      "Revenue share participation",
      "Governance voting",
      "Priority support",
    ],
    featuresAr: [
      "تفويض العملاء وتثبيت من السوق",
      "هوية موثقة بـ KYC",
      "مشاركة في مشاركة الأرباح",
      "التصويت على الحوكمة",
      "دعم ذو أولوية",
    ],
    xp: "500",
    featured: true,
  },
  {
    key: "sovereign",
    letter: "S",
    color: "#a855f7",
    priceEn: "100 PI",
    priceAr: "100 PI",
    priceCurrency: "PI",
    nameEn: "Sovereign",
    nameAr: "سيادي",
    taglineEn: "Full trust, vault staking, vouching power (1000 XP)",
    taglineAr: "ثقة كاملة، رهان الخزنة، قوة التزكية (1000 XP)",
    featuresEn: [
      "Full trust score & delegation",
      "Vault staking",
      "Vouching power",
      "Custom agents & stamps",
      "Protocol governance",
    ],
    featuresAr: [
      "ثقة كاملة وتفويض",
      "رهان الخزنة",
      "قوة التزكية",
      "عملاء وطوابع مخصصة",
      "حوكمة البروتوكول",
    ],
    xp: "1000",
  },
];

/**
 * Renders the AxiomID pricing page with four trust tiers as pricing cards.
 *
 * Detects accept-language to switch between English and Arabic copy. Server-rendered.
 *
 * @returns The pricing page JSX.
 */
export default async function PricingPage() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang: Language = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);
  const tt = (en: string, ar: string) => (lang === "en" ? en : ar);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center bg-grid relative overflow-hidden"
    >
      {/* Dynamic Background Effects (matches home page) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] spotlight-primary rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] spotlight-accent rounded-full pointer-events-none" />
      <div className="scanline" />

      <Header />

      {/* Hero */}
      <section className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-20 z-10 text-center">
        <span className="stitch-badge uppercase tracking-widest">
          {tt("Pricing & Trust Tiers", "التسعير ومستويات الثقة")}
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4">
          {tt(
            "Pi Network Native Pricing",
            "تسعير أصلي لشبكة Pi"
          )}
        </h1>
        <p className="text-sm md:text-base text-zinc-400 mt-4 max-w-2xl mx-auto leading-relaxed">
          {tt(
            "Start free, level up with XP. Four trust tiers — from Visitor to Sovereign — priced natively in PI.",
            "ابدأ مجاناً، وارتقِ بنقاط XP. أربع مستويات ثقة — من زائر إلى سيادي — بسعر أصلي بـ PI."
          )}
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`bento-card p-6 flex flex-col relative ${
                tier.featured ? "border-electric-blue/40 ring-1 ring-electric-blue/30" : ""
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 stitch-badge uppercase tracking-widest text-electric-blue">
                  {tt("Popular", "الأكثر شيوعاً")}
                </span>
              )}

              {/* Tier letter badge */}
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center font-mono font-bold text-sm mb-4"
                style={{
                  backgroundColor: `${tier.color}20`,
                  color: tier.color,
                  border: `1px solid ${tier.color}40`,
                }}
              >
                {tier.letter}
              </div>

              {/* Name */}
              <h2 className="text-lg font-bold text-white">
                {tt(tier.nameEn, tier.nameAr)}
              </h2>

              {/* Price */}
              <div className="mt-3 mb-2">
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: tier.color }}
                >
                  {tt(tier.priceEn, tier.priceAr)}
                </span>
                {tier.priceEn !== "Free" && (
                  <span className="text-xs text-zinc-500 ml-1 font-mono">
                    / {tier.priceCurrency}
                  </span>
                )}
              </div>

              {/* Tagline */}
              <p className="text-xs text-zinc-400 leading-relaxed font-mono min-h-[2.5rem]">
                {tt(tier.taglineEn, tier.taglineAr)}
              </p>

              {/* XP threshold */}
              <div className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                {t("tier")} · {tier.xp} XP
              </div>

              {/* Features */}
              <ul className="mt-4 space-y-2 flex-1">
                {(lang === "en" ? tier.featuresEn : tier.featuresAr).map(
                  (feat, i) => (
                    <li
                      key={i}
                      className="text-xs text-zinc-400 flex items-start gap-2"
                    >
                      <span
                        className="mt-1 w-1 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className="leading-relaxed">{feat}</span>
                    </li>
                  )
                )}
              </ul>

              {/* CTA */}
              <Link
                href="/claim"
                className="mt-6 block text-center text-xs font-mono uppercase tracking-widest py-2.5 rounded-md border border-white/10 hover:border-white/30 hover:bg-white/[0.03] transition-colors text-white focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:outline-none"
              >
                {tt("Claim Passport →", "اطلب جوازك ←")}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Note / FAQ teaser */}
      <section className="w-full max-w-3xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
        <div className="bento-card p-6 text-center">
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            {tt(
              "Prices are denominated in PI, the native currency of the Pi Network. XP (Experience Points) are earned through verified activity and unlock higher tiers automatically — no payment required to reach Citizen.",
              "الأسعار معتمدة بـ PI، العملة الأصلية لشبكة Pi. تُكتسب نقاط الخبرة (XP) عبر النشاط الموثق وتفتح المستويات الأعلى تلقائياً — لا دفع مطلوب للوصول إلى مواطن."
            )}
          </p>
        </div>
      </section>

      <div className="flex-1" />

      <Footer />
    </main>
  );
}
