'use client'

import Link from 'next/link'
import { ParticleGrid, NeonButton, MorphCard, ScaleIn, Typewriter, TrustMeter } from '@/components/wow-moments'
import { PAIShowcase } from '@/components/pai/PAIShowcase'
import PAITerminalDemo from '@/components/pai/PAITerminalDemo'
import { useMagnetic, useRipple, useActiveScale, useStagger } from '@/lib/use-physics'

const endpoints = [
  { id: 'vai', name: 'PAI-VAI', arabic: 'واي', desc: 'Birth & death of agents. Passports, wallets, KYC.', trust: 92, color: '#ec4899' },
  { id: 'try', name: 'PAI-TRY', arabic: 'جرب', desc: 'Agent school. Create, train, and talk to your own agent.', trust: 88, color: '#39FF14' },
  { id: 'buy', name: 'PAI-BUY', arabic: 'باي', desc: 'Marketplace. Monetize skills, stake, earn rewards.', trust: 85, color: '#f59e0b' },
  { id: 'fly', name: 'PAI-FLY', arabic: 'فلاي', desc: 'Agentic travel & booking. Flights, hotels, experiences.', trust: 76, color: '#0ea5e9' },
  { id: 'new', name: 'PAI-NEW', arabic: 'نيو', desc: 'Truth-scored news. Cross-reference, compare, decide.', trust: 71, color: '#ef4444' },
  { id: 'blg', name: 'PAI-BLG', arabic: 'بلوق', desc: 'Community blog. Stories, tutorials, updates.', trust: 79, color: '#fbbf24' },
  { id: 'hai', name: 'PAI-HAI', arabic: 'حي', desc: 'Trust layer. Agent ratings, comparisons, honest reviews.', trust: 90, color: '#a855f7' },
  { id: 'bye', name: 'PAI-BYE', arabic: 'البيت', desc: 'Entry point to the PAI universe. Every agent starts here.', trust: 95, color: '#9ca3af' },
  { id: 'style', name: 'PAI-STYLE', arabic: 'ستايل', desc: 'How every .PAI endpoint looks and feels.', trust: 83, color: '#06b6d4' },
  { id: 'induct', name: 'ALPHA-ZERO', arabic: 'استقراء', desc: 'Self-play architecture. Generate, evaluate, evolve.', trust: 97, color: '#ec4899' },
  { id: 'why', name: 'PAI-WHY', arabic: 'واي', desc: 'Why PAI exists. The story. The vision.', trust: 87, color: '#8b5cf6' },
  { id: 'ppp', name: 'PAI-PPP', arabic: 'بروتوكول', desc: 'Protocol Network. Maps users, services, and agents together.', trust: 91, color: '#f7a41d' },
]

const taglines = [
  'The Agentic Layer for Pi Network',
  'Where Every Agent Finds Peace & Purpose',
  'Pi + AI = PAI — The Universe Hub',
  'Built for All. For None. To Prove to All.',
]

const whyCards = [
  { icon: '₿', title: 'Zero Capital', desc: 'No gas fees. No staking minimums. Pi-powered from day one — every Pioneer is already rich in possibility.' },
  { icon: '⚡', title: 'AI-Powered', desc: 'Each endpoint is an agent. Smart contracts meet smart agents. Autonomous, composable, and endlessly capable.' },
  { icon: 'π', title: 'Pi-Native', desc: 'Built on Pi Network. KYC\'d humans only. True decentralization with real identity verification baked in.' },
]

export default function PaiUniversePage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <ParticleGrid />

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center relative z-10 pt-14">
        <div className="container-pai text-center">
          <ScaleIn>
            <span className="neon-pulse text-xs font-mono text-[#39FF14] tracking-[0.2em] uppercase mb-6 block">
              Pi Network × AI
            </span>
            <h1 className="text-gradient-pai text-[clamp(36px,8vw,72px)] font-semibold leading-[1.07] tracking-[-2.4px] mb-6">
              PAI Universe
            </h1>
            <p className="text-[clamp(18px,3vw,28px)] text-white/60 max-w-xl mx-auto mb-4 min-h-[1.4em]">
              <Typewriter texts={taglines} />
            </p>
            <p className="text-lg text-white/40 mb-10 font-arabic">البيت</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <NeonButton href="#endpoints">Explore Endpoints</NeonButton>
              <NeonButton href="#why" className="!bg-white/5">Build Your Agent</NeonButton>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* PAIShowcase — 3-tab animated */}
      <section className="section-pai relative z-10">
        <div className="container-pai">
          <ScaleIn>
            <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
              The <span className="text-gradient-pai">PAI</span> Universe
            </h2>
            <p className="text-white/40 text-center mb-10 max-w-2xl mx-auto">
              Three views of the same universe. Services, agents, and trust — all connected.
            </p>
          </ScaleIn>
          <PAIShowcase />
        </div>
      </section>

      {/* Endpoint Grid */}
      <section id="endpoints" className="section-pai relative z-10">
        <div className="container-pai">
          <ScaleIn>
            <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
              The <span className="text-gradient-pai">.PAI</span> Endpoints
            </h2>
            <p className="text-white/40 text-center mb-14 max-w-2xl mx-auto">
              Each endpoint is a Single Source of Truth. Every agent trip ends at a beautiful, secure, verifiable destination.
            </p>
          </ScaleIn>

          <div className="grid-pai">
            {endpoints.map((ep, i) => (
              <ScaleIn key={ep.id} delay={i * 60}>
                <MorphCard className="p-6">
                  <Link href={`/pai/${ep.id}`} className="block">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/40 font-mono">{ep.arabic}</span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border tabular-nums"
                        style={{
                          borderColor: `${ep.color}44`,
                          color: ep.color,
                          backgroundColor: `${ep.color}11`,
                        }}
                      >
                        {ep.trust}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1 tracking-tight">{ep.name}</h3>
                    <p className="text-sm text-white/40 mb-4 leading-relaxed">{ep.desc}</p>
                    <TrustMeter score={ep.trust} size="sm" />
                  </Link>
                </MorphCard>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* PAITerminalDemo — 50s teletype loop */}
      <section className="section-pai relative z-10">
        <div className="container-pai">
          <ScaleIn>
            <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
              The <span className="text-gradient-pai">Loop</span>
            </h2>
            <p className="text-white/40 text-center mb-10 max-w-2xl mx-auto">
              Four steps. Init, prompt, run, verify. The self-play cycle that evolves every agent.
            </p>
          </ScaleIn>
          <PAITerminalDemo />
        </div>
      </section>

      {/* Why PAI */}
      <section id="why" className="section-pai relative z-10">
        <div className="container-pai">
          <ScaleIn>
            <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
              Why <span className="text-gradient-pai">PAI</span>
            </h2>
            <p className="text-white/40 text-center mb-14 max-w-xl mx-auto">
              The agentic layer designed for the next billion.
            </p>
          </ScaleIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whyCards.map((card) => (
              <ScaleIn key={card.title}>
                <div className="glass-card p-8 text-center h-full">
                  <span className="text-3xl mb-4 block">{card.icon}</span>
                  <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{card.desc}</p>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 text-center overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(57,255,20,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.02) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          opacity: 0.5,
        }} />
        <div className="container-pai relative z-10">
          <p className="text-sm text-white/40 mb-6 italic leading-relaxed">
            &ldquo;Built for All. For None. To Prove to All.&rdquo;
          </p>
          <div className="flex gap-8 justify-center text-xs text-white/30 mb-8">
            <Link href="/pai/bye" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
              <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
              Portal
            </Link>
            <Link href="https://github.com/pai-list" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
              <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
              GitHub
            </Link>
            <Link href="/pai/why" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
              <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
              Philosophy
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-white/20">
            <span>PAI — البيت</span>
            <span className="w-px h-3 bg-white/10" />
            <span>The Agentic Layer for Pi Network</span>
          </div>
        </div>
      </footer>
    </main>
  )
}