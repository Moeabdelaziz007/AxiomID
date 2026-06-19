import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-grid flex flex-col items-center justify-center p-6">
      <div className="scanline" />
      
      <div className="flex flex-col items-center gap-6 text-center z-10">
        {/* Error Code */}
        <div className="relative">
          <span className="text-8xl md:text-9xl font-mono font-bold text-neon-green/10">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-mono font-bold text-neon-green">?</span>
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-surface">Page Not Found</h1>
          <p className="text-sm text-subtle max-w-md">
            This route does not exist in the AxiomID namespace. 
            The identity layer you&apos;re looking for has not been provisioned.
          </p>
        </div>

        {/* DID-style error */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 font-mono text-[10px] text-faint">
          <span className="text-neon-green">ERROR</span>: did:axiom:not-found:404
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <Link href="/" className="btn-primary">
            RETURN HOME
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            DASHBOARD
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-[9px] font-mono text-faint">
        &copy; 2026 AxiomID
      </footer>
    </main>
  );
}
