import { PassportView } from "./PassportView";
import { Metadata } from "next";
import Link from "next/link";

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

      <header className="w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50">
              <span className="text-neon-green font-bold text-[8px]">A</span>
            </div>
            <span className="font-mono text-sm tracking-tighter text-white">
              AXIOM<span className="text-gray-600">ID</span>
            </span>
          </Link>
          <span className="text-[10px] font-mono text-gray-500">AGENT PASSPORT</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl w-full">
        <PassportView />
      </div>

      <footer className="w-full border-t border-white/5 py-4 px-6 text-[9px] font-mono text-gray-600 text-center">
        &copy; 2026 AxiomID. Agent Identity Protocol.
      </footer>
    </main>
  );
}
