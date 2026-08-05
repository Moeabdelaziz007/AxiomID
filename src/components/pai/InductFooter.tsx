import { FadeIn } from '@/components/effects'

export function InductFooter() {
  return (
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
          <a href="/bye" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
            Portal
          </a>
          <a href="https://github.com/pai-list" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
            GitHub
          </a>
          <a href="/why" className="group flex items-center gap-1.5 hover:text-white/60 transition-colors duration-300">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
            Philosophy
          </a>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-white/20">
          <span>PAI — البيت</span>
          <span className="w-px h-3 bg-white/10" />
          <span>The Agentic Layer for Pi Network</span>
        </div>
      </div>
    </footer>
  )
}
