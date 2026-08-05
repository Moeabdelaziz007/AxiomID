import { FadeIn, ScaleIn } from '@/components/effects'

const whyCards = [
  { icon: '₿', title: 'Zero Capital', desc: 'No gas fees. No staking minimums. Pi-powered from day one — every Pioneer is already rich in possibility.' },
  { icon: '⚡', title: 'AI-Powered', desc: 'Each endpoint is an agent. Smart contracts meet smart agents. Autonomous, composable, and endlessly capable.' },
  { icon: 'π', title: 'Pi-Native', desc: 'Built on Pi Network. KYC\'d humans only. True decentralization with real identity verification baked in.' },
]

export function WhyPai() {
  return (
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
          {whyCards.map((card, i) => (
            <ScaleIn key={card.title} delay={i * 100}>
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
  )
}
