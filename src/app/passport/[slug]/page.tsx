import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";
import Footer from "@/components/Footer";

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const title = `Passport: ${decodedSlug} | AxiomID`;
  const description = `AxiomID sovereign identity passport for ${decodedSlug}. Verified agent identity, trust score, and decentralized identifier (DID).`;

  // NOTE: This page is `force-static` with no generateStaticParams, so we cannot
  // fetch per-slug tier/xp/stamps here without converting it to dynamic/ISR.
  // The OG endpoint accepts optional `tier`, `xp`, and `stamps` params and
  // derives a coherent Visitor card from XP when they are omitted. Populating
  // them with live data is deferred to a follow-up that addresses rendering mode.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axiomid.app";
  const ogUrl = `${baseUrl}/api/og/passport?title=${encodeURIComponent(title)}&did=${encodeURIComponent(decodedSlug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "AxiomID",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `Passport for ${decodedSlug}`,
        },
      ],
    } as Metadata["openGraph"],
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

/**
 * Renders the passport page layout for an agent.
 *
 * @returns A JSX element containing the assembled passport page
 */
export default function PassportPage() {
  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />

      <PassportHeader />

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <PassportView />
      </div>

      <Footer minimal copyright="© 2026 AxiomID. Agent Identity Protocol." />
    </main>
  );
}
