import { Metadata } from "next";
import { getTranslation } from "@/i18n";
import { headers } from "next/headers";

import { LazyControlCenter } from "@/components/landing/LazyControlCenter";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";
  const t = (key: string) => getTranslation(lang, key);

  return {
    title: t("agent_control_center_title"),
    description: t("agent_control_center_desc"),
  };
}

export default async function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-grid relative overflow-hidden" id="main-content" role="main">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] spotlight-primary rounded-full pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] spotlight-accent rounded-full pointer-events-none" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />

        {/* p5 dataflow animation — ambient OS background (dimmed, non-interactive) */}
        <iframe
          src="/dataflow/dataflow-animation.html"
          title={undefined}
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 w-full h-full opacity-20 pointer-events-none"
        />

        <div className="relative z-10 w-full">
          <LazyControlCenter />
        </div>
      </main>
    </>
  );
}