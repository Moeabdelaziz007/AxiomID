import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";

/**
 * Generate page metadata for a passport identified by `slug`.
 *
 * @param params - A promise resolving to an object with `slug`, the passport identifier used to populate the metadata.
 * @returns A `Metadata` object whose `title` is `Passport: {slug}` and `description` is `AxiomID Passport for {slug}`.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Passport: ${slug}`,
    description: `AxiomID Passport for ${slug}`,
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

      <footer className="w-full border-t border-white/5 py-4 px-6 text-[9px] font-mono text-gray-600 text-center">
        &copy; 2026 AxiomID. Agent Identity Protocol.
      </footer>
    </main>
  );
}
