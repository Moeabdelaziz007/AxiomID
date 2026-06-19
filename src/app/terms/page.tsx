import Link from "next/link";

export default function Terms() {
  return (
    <main className="min-h-screen bg-grid relative">
      <div className="scanline" />

      {/* Header */}
      <header className="w-full flex justify-between items-center p-4 md:p-8 max-w-4xl mx-auto relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-neon-green/20 flex items-center justify-center border border-neon-green/50 group-hover:bg-neon-green/30 transition-all">
            <span className="text-neon-green font-bold text-sm">A</span>
          </div>
          <span className="font-mono text-lg tracking-tighter">
            AXIOM<span className="text-faint">ID</span>
          </span>
        </Link>
        <Link
          href="/"
          className="btn-ghost text-xs font-mono"
        >
          ← BACK
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-20 relative z-10">
        <div className="bento-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20">
              LEGAL
            </span>
            <span className="text-xs font-mono text-faint">Last updated: May 17, 2026</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">Service</span>
          </h1>
          <p className="text-subtle text-sm mb-8 font-mono">
            By using AxiomID, you agree to these terms.
          </p>

          <div className="space-y-6 text-subtle text-sm leading-relaxed">
            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Use of Service
              </h2>
              <p>
                AxiomID provides decentralized identity verification and reputation tracking. You may use the service in compliance with all applicable laws and regulations. The service is provided for lawful purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
                Wallet Connection
              </h2>
              <p>
                Connecting your Pi wallet is required for authentication. You are solely responsible for maintaining the security of your wallet and private keys. AxiomID never has access to your private keys or seed phrases.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-axiom-purple" />
                AI Agent Verification
              </h2>
              <p>
                Each user may register one verified AI agent. The verified agent may interact with ecosystem products on your behalf. You are responsible for all actions taken by your agent. Agent verification is non-transferable.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Limitation of Liability
              </h2>
              <p>
                The App is provided <strong className="text-subtle">&quot;as is&quot;</strong> without warranties of any kind, either express or implied. We are not liable for any damages arising from the use or inability to use the service, including but not limited to loss of reputation score, agent data, or Pi transactions.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Changes to Terms
              </h2>
              <p>
                We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. You will be notified of material changes via the app.
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs font-mono text-faint">
            &copy; 2026 AxiomID — Built on Pi Network
          </p>
        </div>
      </div>
    </main>
  );
}
