import { FadeIn, ScaleIn } from '@/components/effects'
import { MorphCard } from '@/components/wow-moments'
import Link from 'next/link'

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

export function EndpointsGrid() {
  return (
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {endpoints.map((ep, i) => (
            <ScaleIn key={ep.id} delay={i * 60}>
              <a href={`/pai/${ep.id}`} className="morph-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/40 font-mono">{ep.arabic}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border tabular-nums" style={{ borderColor: `${ep.color}44`, color: ep.color, backgroundColor: `${ep.color}11` }}>
                    {ep.trust}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1 tracking-tight">{ep.name}</h3>
                <p className="text-sm text-white/40 mb-4 leading-relaxed">{ep.desc}</p>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full" style={{ width: `${ep.trust}%`, background: `linear-gradient(90deg, ${ep.color}, ${ep.color}aa)` }} />
                </div>
              </a>
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  )
}
