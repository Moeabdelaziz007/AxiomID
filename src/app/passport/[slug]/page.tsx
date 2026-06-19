import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";

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
 * Render the passport page layout for an agent, composing the header, passport view, and footer.
 *
 * The layout includes a full-height grid background with a scanline, the PassportHeader component,
 * a centered area containing PassportView, and a bottom footer with copyright text.
 *
 * @returns A JSX element containing the assembled passport page layout
 */
export default function PassportPage() {
  return (
    <main className="min-h-screen bg-grid flex flex-col items-center">
      <div className="scanline" />

      <PassportHeader />

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <PassportView />
      </div>

      <footer className="w-full border-t py-4 px-6 text-[9px] font-mono text-center" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
        &copy; 2026 AxiomID. Agent Identity Protocol.
      </footer>
    </main>
  );
}
