import { FadeIn } from '@/components/effects'
import PAITerminalDemo from '@/components/PAITerminalDemo'

export function InductTerminalDemo() {
  return (
    <section className="section-pai relative z-10">
      <div className="container-pai text-center">
        <FadeIn>
          <h2 className="text-[clamp(28px,5vw,48px)] font-semibold text-center mb-4 tracking-tight">
            The <span className="text-gradient-pai">Loop</span>
          </h2>
          <p className="text-white/40 text-center mb-10 max-w-2xl mx-auto">
            Four steps. Init, prompt, run, verify. The self-play cycle that evolves every agent.
          </p>
        </FadeIn>
        <PAITerminalDemo />
      </div>
    </section>
  )
}
