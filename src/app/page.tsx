import { Metadata } from "next";
import { getTranslation } from "@/i18n";
import { headers } from "next/headers";
import { WorkspaceGrid } from "@/components/landing/WorkspaceGrid";
import StatsBar from "@/components/StatsBar";
import { StatusBar } from "@/components/os/StatusBar";
import { AuraDock } from "@/components/os/AuraDock";
import { BrandStrip } from "@/components/os/BrandStrip";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return {
    title: t("aura_os_title"),
    description: t("aura_os_desc"),
  };
}

export default async function Home() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col bg-grid overflow-hidden" id="main-content" role="main">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] spotlight-primary rounded-full pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] spotlight-accent rounded-full pointer-events-none" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />

        {/* p5 dataflow animation — ambient OS background (dimmed, non-interactive) */}
        <iframe
          src="/dataflow/dataflow-animation.html"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 w-full h-full opacity-20 pointer-events-none"
        />

        {/* Top status bar */}
        <StatusBar />

        {/* Center: icon grid + stats panel */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-16 px-4 pt-20 pb-40">
          <WorkspaceGrid />
          <StatsBar />
        </div>

        {/* Bottom floating dock + brand strip */}
        <AuraDock />
        <BrandStrip />
      </main>
    </>
  );
}