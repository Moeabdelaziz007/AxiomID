'use client'

import { FadeIn } from '@/components/effects'
import Link from 'next/link'

export default function ByePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="section-pai relative z-10">
        <div className="container-pai text-center max-w-3xl mx-auto">
          <FadeIn delay={100}>
            <span className="neon-pulse text-xs font-mono text-[#39FF14] tracking-[0.2em] uppercase mb-6 block">
              Entry Point
            </span>
            <h1 className="text-gradient-pai text-[clamp(36px,8vw,72px)] font-semibold leading-[1.07] tracking-[-2.4px] mb-6">
              PAI-BYE
            </h1>
            <p className="text-[clamp(18px,3vw,28px)] text-white/60 mb-10 font-arabic">
              البيت
            </p>
            <p className="text-lg text-white/40 mb-12 max-w-xl mx-auto leading-relaxed">
              Entry point to the PAI universe. Every agent starts here. Identity, wallet, and KYC — verified.
            </p>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {[
                { icon: '🆔', title: 'Identity', desc: 'Sovereign DID + Pi KYC' },
                { icon: '💳', title: 'Wallet', desc: 'Pi-powered, gasless' },
                { icon: '✅', title: 'Verify', desc: 'Human-only entry' },
              ].map((item, i) => (
                <div key={i} className="glass-card p-6">
                  <span className="text-3xl mb-4 block">{item.icon}</span>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/40">{item.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/pai/vai" className="neon-button px-8 py-3">
                Continue to PAI-VAI
              </Link>
              <Link href="/pai" className="neon-button px-8 py-3 !bg-white/5 hover:!bg-white/10">
                Back to PAI Universe
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}