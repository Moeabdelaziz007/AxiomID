import { PassportView } from "./PassportView";
import { PassportHeader } from "./PassportHeader";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Passport: ${slug}`,
    description: `AxiomID Passport for ${slug}`,
  };
}

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
