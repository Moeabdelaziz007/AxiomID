import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let ogTier = "Visitor";
  let ogXp = 0;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: decodedSlug },
          { did: decodedSlug },
          { piUsername: decodedSlug },
        ],
      },
      select: { tier: true, xp: true },
    });
    if (user) {
      ogTier = user.tier || "Visitor";
      ogXp = user.xp ?? 0;
    }
  } catch {
    // fall back to defaults if DB is unreachable
  }

  const title = `Passport: ${decodedSlug} | AxiomID`;
  const description = `AxiomID sovereign identity passport for ${decodedSlug}. Verified agent identity, trust score, and decentralized identifier (DID).`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axiomid.app";
  const ogUrl = `${baseUrl}/api/og/passport?title=${encodeURIComponent(title)}&did=${encodeURIComponent(decodedSlug)}&tier=${encodeURIComponent(ogTier)}&xp=${ogXp}`;

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
