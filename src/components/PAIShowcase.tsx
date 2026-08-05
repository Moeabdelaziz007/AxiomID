'use client'

import { useState, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type TabId = 'services' | 'agents' | 'trust'

const spring = { ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 }

/* ─────────────────────────────────────────────
   PAI Showcase — 3-tab animated (50s teletype style)
   Ported from AxiomID InteractiveShowcase.tsx
   ───────────────────────────────────────────── */
export function PAIShowcase() {
  const [tab, setTab] = useState<TabId>('services')

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'services', label: 'SERVICES', icon: '✦' },
    { id: 'agents', label: 'AGENTS', icon: '⚡' },
    { id: 'trust', label: 'TRUST', icon: '◈' },
  ]

  return (
    <div className="w-full">
      {/* Tab bar — pill style */}
      <div className="flex justify-center gap-2 mb-8">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono tracking-wider transition-all ${
              tab === t.id
                ? 'bg-[#39FF14] text-black font-bold shadow-[0_0_20px_rgba(57,255,20,0.3)]'
                : 'bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative min-h-[320px] rounded-2xl border border-white/10 bg-white/[0.02] p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#39FF14]/5 via-transparent to-purple-500/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {tab === 'services' && (
            <motion.div key="s" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-4">
              <h3 className="text-xl font-mono font-bold text-white">The .PAI Services</h3>
              <p className="text-sm text-zinc-400 font-mono">Each endpoint is a single source of truth.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {['BUY', 'FLY', 'NEW', 'BLG', 'TRY', 'VAI'].map(s => (
                  <div key={s} className="bg-black/40 border border-white/10 rounded-xl p-4 text-center hover:border-[#39FF14]/30 transition-all cursor-pointer">
                    <div className="text-lg font-mono font-bold text-[#39FF14]">PAI-{s}</div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">Endpoint</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'agents' && (
            <motion.div key="a" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-4">
              <h3 className="text-xl font-mono font-bold text-white">Agent Minds</h3>
              <p className="text-sm text-zinc-400 font-mono">Each model has an archetype. Agents learn from them.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {[
                  { name: 'CLAUDE', role: 'THE ARCHITECT', color: '#a855f7', desc: 'Structure before speed' },
                  { name: 'GEMINI', role: 'THE TEACHER', color: '#3b82f6', desc: 'Knowledge unfolds in time' },
                  { name: 'GROK', role: 'THE TRUTH SEEKER', color: '#ef4444', desc: 'Reality has no filter' },
                ].map(a => (
                  <div key={a.name} className="bg-black/40 border border-white/10 rounded-xl p-5 text-center hover:border-[var(--c)]/50 transition-all" style={{ '--c': a.color } as React.CSSProperties}>
                    <div className="text-xs font-mono tracking-widest mb-1" style={{ color: a.color }}>{a.role}</div>
                    <div className="text-lg font-mono font-bold text-white">{a.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-2 italic">"{a.desc}"</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'trust' && (
            <motion.div key="t" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-4">
              <h3 className="text-xl font-mono font-bold text-white">TrustChain Receipts</h3>
              <p className="text-sm text-zinc-400 font-mono">Every action is recorded. Nothing is lost.</p>
              <div className="bg-black/60 border border-white/10 rounded-xl p-5 mt-4 font-mono text-xs space-y-2">
                <div className="flex items-center gap-2"><span className="text-[#39FF14]">✓</span><span className="text-zinc-300">TrustChain: 0x7f3a...b2e1</span></div>
                <div className="flex items-center gap-2"><span className="text-[#39FF14]">✓</span><span className="text-zinc-300">Agent DID: did:pai:a1b2...c3d4</span></div>
                <div className="flex items-center gap-2"><span className="text-[#39FF14]">✓</span><span className="text-zinc-300">Trust Score: 92/100</span></div>
                <div className="flex items-center gap-2"><span className="text-[#39FF14]">✓</span><span className="text-zinc-300">Hash Chain: 4 confirmations</span></div>
                <div className="mt-3 pt-3 border-t border-white/10 text-zinc-500">وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
