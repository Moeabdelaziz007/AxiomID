import { ParticleField, Typewriter } from '@/components/effects'

export function InductHero() {
  return (
    <section className="min-h-screen flex items-center justify-center relative z-10 pt-14">
      <div className="container-pai text-center">
        <ParticleField count={30} color="rgba(57,255,20,0.1)" />
        <span className="neon-pulse text-xs font-mono text-[#39FF14] tracking-[0.2em] uppercase mb-6 block">
          Pi Network × AI
        </span>
        <h1 className="text-gradient-pai text-[clamp(36px,8vw,72px)] font-semibold leading-[1.07] tracking-[-2.4px] mb-6">
          PAI Universe
        </h1>
        <p className="text-[clamp(18px,3vw,28px)] text-white/60 max-w-xl mx-auto mb-4 min-h-[1.4em]">
          <Typewriter texts={['The Agentic Layer for Pi Network', 'Where Every Agent Finds Peace & Purpose', 'Pi + AI = PAI — The Universe Hub', 'Built for All. For None. To Prove to All.']} />
        </p>
        <p className="text-lg text-white/40 mb-10 font-arabic">البيت</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="#endpoints" className="neon-btn">Explore Endpoints</a>
          <a href="#why" className="neon-btn secondary">Build Your Agent</a>
        </div>
      </div>
    </section>
  )
}
