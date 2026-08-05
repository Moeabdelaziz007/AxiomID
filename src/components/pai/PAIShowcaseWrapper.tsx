import { PAIShowcase } from '@/components/PAIShowcase'
import { ScrollReveal, FadeIn } from '@/components/effects'

export function PAIShowcaseWrapper() {
  return (
    <section className="section-pai relative z-10">
      <div className="container-pai">
        <ScrollReveal>
          <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
            The <span className="text-gradient-pai">PAI</span> Universe
          </h2>
          <p className="text-white/40 text-center mb-14 max-w-2xl mx-auto">
            Three views of the same universe. Services, agents, and trust — all connected.
          </p>
        </ScrollReveal>
        <PAIShowcase />
      </div>
    </section>
  )
}
