'use client'

import { FadeIn } from '@/components/effects'
import { WhyPai } from '@/components/pai/WhyPai'

export default function WhyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="section-pai relative z-10">
        <div className="container-pai">
          <FadeIn delay={100}>
            <span className="neon-pulse text-xs font-mono text-[#39FF14] tracking-[0.2em] uppercase mb-6 block">
              Why PAI
            </span>
            <h1 className="text-gradient-pai text-[clamp(36px,8vw,72px)] font-semibold leading-[1.07] tracking-[-2.4px] mb-6">
              PAI-WHY
            </h1>
            <p className="text-[clamp(18px,3vw,28px)] text-white/60 mb-10 font-arabic">
              واي
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <WhyPai />
          </FadeIn>
        </div>
      </section>
    </main>
  )
}