import { Metadata } from "next";
import { getTranslation } from "@/i18n";
import { headers } from "next/headers";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustTiers from "@/components/TrustTiers";
import StatsBar from "@/components/StatsBar";

import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection, { SectionHeader } from "@/components/landing/FeaturesSection";
import { LazyLandingSections } from "@/components/landing/LazyLandingSections";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return {
    title: t("landing_headline_en") + " " + t("landing_headline_rules_en"),
    description: t("landing_tagline"),
  };
}

export default async function Home() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-grid relative overflow-hidden" id="main-content" role="main">
        {/* Dynamic Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] spotlight-primary rounded-full pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] spotlight-accent rounded-full pointer-events-none" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />

        <Header />

        <HeroSection t={t} />

        {/* Stats */}
        <div className="w-full max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16 mb-4 z-10">
          <StatsBar />
        </div>

        {/* Below-fold lazy-loaded sections */}
        <LazyLandingSections />

        <FeaturesSection t={t} />

        {/* Trust Tiers */}
        <div className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10">
          <SectionHeader
            label={t("tier")}
            title={t("landing_level_up")}
            labelColor="text-electric-blue"
          />
          <TrustTiers />
        </div>

        <Footer />
      </main>
    </>
  );
}