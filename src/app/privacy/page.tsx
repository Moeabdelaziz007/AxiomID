"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * Renders the Privacy Policy page for AxiomID.
 */
export default function Privacy() {
  return (
    <main className="min-h-screen bg-grid relative">
      <div className="scanline" />

      <Header showBack />

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
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-electric-blue">Policy</span>
          </h1>
          <p className="text-subtle text-sm mb-8 font-mono">
            How AxiomID handles your data.
          </p>

          <div className="space-y-6 text-subtle text-sm leading-relaxed">
            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Information We Collect
              </h2>
              <p>
                When you connect your wallet via Pi Network, we collect your Pi wallet address and Pi Network UID for the purpose of authentication and XP tracking. We do <strong className="text-neon-green">not</strong> collect personal identifiable information such as your name, email, or IP address beyond standard server logs.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
                How We Use Information
              </h2>
              <p>
                We use your wallet address and Pi UID solely to operate the App, track reputation scores (XP/Tier), and enable AI agent verification. Your data is never sold or shared with third parties. Aggregated, anonymized analytics may be used for platform improvement.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-axiom-purple" />
                Data Storage & Security
              </h2>
              <p>
                Your data is stored securely in our PostgreSQL database on Ghost infrastructure. We implement industry-standard encryption at rest and in transit. You may request deletion of your data at any time by contacting us via GitHub.
              </p>
            </section>

            <section>
              <h2 className="text-surface text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Your Rights
              </h2>
              <p>
                You have the right to access, correct, or delete your data. To exercise these rights, open an issue on our GitHub repository or reach out to the developer directly.
              </p>
            </section>
          </div>
        </div>

        <Footer minimal copyright="© 2026 AxiomID — Built on Pi Network" />
      </div>
    </main>
  );
}
