import { Metadata } from "next";
import { getTranslation } from "@/i18n";
import { headers } from "next/headers";
import { DesktopCanvas } from "@/components/os/DesktopCanvas";
import { DesktopIcons } from "@/components/os/DesktopIcons";
import { DesktopTaskbar } from "@/components/os/DesktopTaskbar";
import { BrandStrip } from "@/components/os/BrandStrip";
import { WallpaperMenu } from "@/components/os/WallpaperMenu";

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

const LABEL_KEYS = [
  "agents",
  "notes",
  "code",
  "files",
  "terminal",
  "automation",
  "autopilot",
  "assistant",
  "settings",
  "soon",
] as const;

export default async function Home() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const lang = acceptLang.startsWith("ar") ? "ar" : acceptLang.startsWith("zh") ? "zh" : "en";
  const t = (key: string) => getTranslation(lang, key);

  const labels = Object.fromEntries(LABEL_KEYS.map((k) => [k, t(`desktop_${k}`)]));

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]" id="main-content" role="main">
      {/* Ambient background: particle canvas + orbs + grid */}
      <DesktopCanvas />
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"
        aria-hidden="true"
      />

      {/* Desktop icon grid */}
      <div className="absolute left-6 top-6 z-10">
        <DesktopIcons labels={labels} />
      </div>

      {/* Taskbar */}
      <DesktopTaskbar />

      <BrandStrip />

      <WallpaperMenu />
    </main>
  );
}
