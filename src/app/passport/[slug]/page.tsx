import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";
import Footer from "@/components/Footer";

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = `Passport: ${slug} | AxiomID`;
  const description = `AxiomID sovereign identity passport for ${slug}. Verified agent identity, trust score, and decentralized identifier (DID).`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "AxiomID",
    } as Metadata["openGraph"],
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
