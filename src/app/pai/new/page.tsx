'use client'

import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════════
   PAI-NEW — Truth-Scored News
   Enterprise-grade: Apple glass + Vercel precision + 
   Stripe gradient + Linear springs + Neon cyberpunk
   ═══════════════════════════════════════════════════ */

type Source = { name: string; url: string; bias: 'left' | 'center' | 'right'; score: number }
type NewsItem = {
  id: string; title: string; summary: string; sources: Source[]
  trustScore: number; consensus: 'high' | 'medium' | 'low' | 'conflicting'
  timestamp: string; category: string
}

const NEWS: NewsItem[] = [
  { id: '1', title: 'Pi Network Reaches 60M Active Users', summary: 'Pi Network surpasses 60 million active users globally. 18 million KYC verified pioneers mark significant growth toward mainnet.', sources: [{ name: 'Pi Core Team', url: '#', bias: 'center', score: 95 }, { name: 'CoinDesk', url: '#', bias: 'center', score: 88 }, { name: 'CryptoNews', url: '#', bias: 'right', score: 72 }], trustScore: 92, consensus: 'high', timestamp: '2h ago', category: 'Pi Network' },
  { id: '2', title: 'PAI Universe Launches 10-Endpoint Ecosystem', summary: 'PAI launches 10 endpoints for agentic services — identity, marketplace, travel, news, blog, social — all on Pi Network.', sources: [{ name: 'PAI Official', url: '#', bias: 'center', score: 90 }, { name: 'Pi Forum', url: '#', bias: 'center', score: 75 }], trustScore: 85, consensus: 'medium', timestamp: '6h ago', category: 'Ecosystem' },
  { id: '3', title: 'Agent Economy Projected to Hit $50B by 2028', summary: 'Analysts project the agent-to-agent economy at $50 billion by 2028. Decentralized platforms like Pi lead.', sources: [{ name: 'TechCrunch', url: '#', bias: 'left', score: 82 }, { name: 'VentureBeat', url: '#', bias: 'center', score: 80 }, { name: 'CoinTelegraph', url: '#', bias: 'right', score: 68 }], trustScore: 76, consensus: 'medium', timestamp: '1d ago', category: 'Industry' },
  { id: '4', title: 'Pi Mainnet Launch Expected Q1 2027', summary: 'Multiple sources confirm Pi mainnet timeline. Community excitement builds as KYC deadline approaches.', sources: [{ name: 'Pi Core Team', url: '#', bias: 'center', score: 95 }, { name: 'CryptoDaily', url: '#', bias: 'left', score: 45 }, { name: 'Pi News Wire', url: '#', bias: 'right', score: 35 }], trustScore: 58, consensus: 'conflicting', timestamp: '2d ago', category: 'Pi Network' },
  { id: '5', title: 'Zero Capital, Infinite Possibility: The PAI Story', summary: 'A solo engineer from Kuwait builds the first agentic layer for Pi using AI as a team. 10 endpoints, zero funding.', sources: [{ name: 'PAI Blog', url: '#', bias: 'center', score: 85 }, { name: 'Medium', url: '#', bias: 'center', score: 60 }], trustScore: 72, consensus: 'medium', timestamp: '3d ago', category: 'Ecosystem' },
]

const CATS = ['All', 'Pi Network', 'Ecosystem', 'Industry', 'Technology', 'Agents']

/* ── Animated Trust Meter ─────────────────────────── */
function AnimatedMeter({ score }: { score: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      let c = 0; const s = Math.ceil(score / 25)
      const iv = setInterval(() => { c += s; if (c >= score) { setDisplay(score); clearInterval(iv) } else setDisplay(c) }, 25)
      obs.unobserve(el)
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [score])

  return (
    <div ref={ref} className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-[3px] rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-[1200ms] ease-out-expo"
          style={{ width: `${display}%`, background: `linear-gradient(90deg, #ef4444, #f59e0b, #39FF14)`, boxShadow: display > 50 ? '0 0 6px rgba(57,255,20,0.3)' : 'none' }} />
      </div>
      <span className="text-[11px] font-mono text-white/40 tabular-nums w-[2.5ch] text-right">{display}</span>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────── */
export default function NewPage() {
  const [cat, setCat] = useState('All')
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const filtered = cat === 'All' ? NEWS : NEWS.filter(n => n.category === cat)

  const consensusColor = (c: string) =>
    c === 'high' ? 'bg-emerald-500' : c === 'medium' ? 'bg-amber-500' : c === 'conflicting' ? 'bg-red-500' : 'bg-gray-500'

  const biasColor = (b: string) =>
    b === 'left' ? 'text-blue-400' : b === 'center' ? 'text-green-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Particle Canvas Background */}
      <canvas id="particles" className="fixed inset-0 pointer-events-none z-0" />

      {/* Glass Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 backdrop-blur-xl bg-black/30 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.5)]" />
            <span className="text-sm font-medium tracking-tight">PAI-NEW</span>
          </a>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
            <span>{NEWS.length} stories</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[56px] leading-[1.07] font-semibold tracking-[-2.4px] bg-gradient-to-r from-white via-white/80 to-[#39FF14]/60 bg-clip-text text-transparent">
            PAI-NEW
          </h1>
          <p className="text-[18px] leading-[1.4] text-white/50 mt-2 max-w-lg">
            Truth-scored news. Every story cross-referenced. Every source rated.
          </p>
        </header>

        {/* Legend */}
        <div className="flex gap-6 mb-6 text-xs text-white/30 flex-wrap items-center">
          {['high', 'medium', 'conflicting'].map(c => (
            <span key={c} className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${consensusColor(c)}`} /> {c}</span>
          ))}
          <div className="flex gap-3 ml-auto">
            {['left', 'center', 'right'].map(b => (
              <span key={b} className={`${biasColor(b)} text-[10px] font-bold uppercase`}>{b}</span>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                cat === c ? 'bg-white/10 border border-white/20 text-white' : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:border-white/20'
              }`}>{c}</button>
          ))}
        </div>

        {selected ? (
          /* ── Detail View ── */
          <div className="animate-[fade-in-up_0.4s_ease-out]">
            <button onClick={() => setSelected(null)} className="text-xs text-white/30 hover:text-white/60 mb-6 transition-colors">← Back to stories</button>
            <div className="relative group rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-8 transition-all"
              style={{ background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(57,255,20,0.04), transparent 40%)` }}
              onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMousePos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-white/30 mb-1">{selected.category} · {selected.timestamp}</p>
                  <h2 className="text-2xl font-semibold tracking-tight">{selected.title}</h2>
                </div>
                <div className="text-right shrink-0 ml-6">
                  <p className="text-xs text-white/30 mb-1">Trust Score</p>
                  <p className={`text-3xl font-bold ${selected.trustScore >= 80 ? 'text-[#39FF14]' : selected.trustScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{selected.trustScore}</p>
                </div>
              </div>
              <p className="text-white/60 leading-relaxed mb-8">{selected.summary}</p>
              <p className="text-xs text-white/30 mb-3">Sources ({selected.sources.length})</p>
              <div className="space-y-2">
                {selected.sources.map(s => (
                  <div key={s.name} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-5 py-3 border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold ${biasColor(s.bias)} uppercase`}>{s.bias[0]}</span>
                      <span className="text-sm text-white/70">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3 w-[200px]">
                      <span className="text-[11px] text-white/30">Trust: {s.score}%</span>
                      <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s.score}%`, background: s.score >= 80 ? 'linear-gradient(90deg, #22c55e, #39FF14)' : s.score >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <p className="text-xs text-white/30 mb-2">Consensus</p>
                <div className="flex items-center gap-3">
                  <div className={`h-2 rounded-full transition-all ${consensusColor(selected.consensus)}`}
                    style={{ width: selected.consensus === 'high' ? '85%' : selected.consensus === 'medium' ? '55%' : '25%' }} />
                  <span className="text-xs text-white/50 capitalize">{selected.consensus}</span>
                </div>
                {selected.consensus === 'conflicting' && <p className="text-xs text-red-400 mt-2">⚠ Sources disagree. Cross-reference before trusting.</p>}
              </div>
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(item => (
              <div key={item.id} onClick={() => setSelected(item)}
                className="group relative cursor-pointer rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-6 transition-all duration-300 ease-out-expo hover:border-[#39FF14]/20"
                style={{ background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(57,255,20,0.03), transparent 40%)` }}
                onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMousePos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-white/30">{item.category} · {item.timestamp}</p>
                  <span className={`w-1.5 h-1.5 rounded-full ${consensusColor(item.consensus)}`} />
                </div>
                <h3 className="text-base font-semibold mb-2 group-hover:text-[#39FF14] transition-colors">{item.title}</h3>
                <p className="text-sm text-white/50 mb-4 line-clamp-2">{item.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {item.sources.map(s => (
                      <span key={s.name} className={`text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white/[0.06] ${biasColor(s.bias)}`}>
                        {s.name[0]}
                      </span>
                    ))}
                  </div>
                  <AnimatedMeter score={item.trustScore} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-white/[0.04] text-xs border-t border-white/[0.04] pt-8">
          <p>PAI-NEW — Truth-scored news for the agentic era.</p>
        </footer>
      </div>

      {/* Particle System */}
      <ParticleSystem />
    </div>
  )
}

/* ── Particle System ──────────────────────────────── */
function ParticleSystem() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    let id: number, mouse = { x: -1000, y: -1000 }
    const ps = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      s: Math.random() * 1.5 + 0.5,
    }))

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0
        const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          ctx.beginPath(); ctx.strokeStyle = `rgba(57,255,20,${0.08 * (1 - dist / 120)})`; ctx.lineWidth = 0.5
          ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke()
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(57,255,20,${0.2 + (1 - dist / 300) * 0.3})`; ctx.fill()
      })
      id = requestAnimationFrame(draw)
    }
    draw()

    const m = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    window.addEventListener('mousemove', m)
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', m) }
  }, [])

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" />
}
