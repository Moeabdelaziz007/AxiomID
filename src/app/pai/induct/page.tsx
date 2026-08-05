'use client'
import { useState, useCallback } from 'react'
import { FadeIn, TiltCard, ShimmerText, Typewriter, ParticleField, MorphingView, NeuralNetworkViz } from '@/components/effects'
import { PAIShowcase } from '@/components/PAIShowcase'
import PAITerminalDemo from '@/components/PAITerminalDemo'
import InductGraphCanvas from '@/components/pai/InductGraphCanvas'
import { cn } from '@/lib/utils'
import { InductHero } from '@/components/pai/InductHero'
import { EndpointsGrid } from '@/components/pai/EndpointsGrid'
import { WhyPai } from '@/components/pai/WhyPai'
import { InductTerminalDemo } from '@/components/pai/InductTerminalDemo'
import { InductFooter } from '@/components/pai/InductFooter'

type SandboxState = 'prompt' | 'generating' | 'eval' | 'pattern' | 'generalize' | 'compose' | 'evolve'

const STATE_META: Record<SandboxState, { label: string; emoji: string; color: string; desc: string; zeroCmd: string; packCmd: string }> = {
  prompt:     { label: 'PROMPT',     emoji: '◇', color: '#39FF14', desc: 'Human asks for an outcome', zeroCmd: 'zero query', packCmd: 'packnplay run opencode' },
  generating: { label: 'GENERATE',   emoji: '◈', color: '#6bff4a', desc: 'Agent queries graph + patches', zeroCmd: 'zero patch --op', packCmd: 'packnplay run --worktree=induct' },
  eval:       { label: 'EVALUATE',   emoji: '◉', color: '#ffd700', desc: 'Compiler checks patch', zeroCmd: 'zero check', packCmd: 'zero check --json' },
  pattern:    { label: 'INDUCE',     emoji: '◇', color: '#ff6b6b', desc: 'zero query --find pattern', zeroCmd: 'zero query --find', packCmd: 'zero query --find Pattern' },
  generalize: { label: 'GENERALIZE', emoji: '◆', color: '#6b5bff', desc: 'zero patch --rewrite', zeroCmd: 'zero patch --rewrite', packCmd: 'zero patch --rewrite --apply' },
  compose:    { label: 'COMPOSE',    emoji: '◈', color: '#ff8cff', desc: 'upsertFunction + merge', zeroCmd: 'zero merge', packCmd: 'zero patch upsertFunction' },
  evolve:     { label: 'EVOLVE',     emoji: '⟐', color: '#39FF14', desc: 'zero reconcile + repeat', zeroCmd: 'zero reconcile', packCmd: 'zero reconcile . && zero patch' },
}

const CYCLE_STORIES = [
  {
    prompt: 'Sort these numbers: [3, 1, 4, 1, 5, 9, 2, 6, 5]',
    output: '→ [1, 1, 2, 3, 4, 5, 5, 6, 9] using bubble sort',
    score: { accuracy: 100, efficiency: 40, elegance: 30 },
    pattern: 'adjacent comparison + swap until sorted',
    rule: 'O(n²) sorting via pairwise comparison',
    composed: 'BubbleSort module added to stdlib',
  },
  {
    prompt: 'Same task, faster approach with context of previous cycle',
    output: '→ [1, 1, 2, 3, 4, 5, 5, 6, 9] using quicksort (median-of-three)',
    score: { accuracy: 100, efficiency: 85, elegance: 80 },
    pattern: 'divide-and-conquer with pivot selection',
    rule: 'O(n log n) via recursive partitioning',
    composed: 'QuickSort module added. Lib now has 2 sort strategies.',
  },
  {
    prompt: 'Build a hybrid sorter that picks the best algorithm per input',
    output: '→ AdaptiveSort: bubble for n<50, quicksort for n<10k, mergesort for n≥10k',
    score: { accuracy: 100, efficiency: 95, elegance: 90 },
    pattern: 'meta-selection based on input characteristics',
    rule: 'Optimal sorting requires context-aware strategy selection',
    composed: 'AdaptiveSort engine v1. Algorithm selector + 3 strategies.',
  },
]

const TRADITIONAL_LOOP = ['agent writes source', 'format', 'check', 'build', 'test', 'inspect failures']
const ZEROLANG_LOOP = ['agent writes graph patch', 'compiler checks patch', 'projection available for review']

export default function InductPage() {
  const [state, setState] = useState<SandboxState>('prompt')
  const [cycle, setCycle] = useState(0)
  const [showCode, setShowCode] = useState(false)
  const [typedComplete, setTypedComplete] = useState(false)
  const [realMode, setRealMode] = useState(false)
  const [showArch, setShowArch] = useState(false)
  const [viewMode, setViewMode] = useState<'graph' | 'canvas' | 'split'>('canvas')
  const history = CYCLE_STORIES[cycle]

  const advanceState = useCallback(() => {
    const order: SandboxState[] = ['prompt', 'generating', 'eval', 'pattern', 'generalize', 'compose', 'evolve']
    const idx = order.indexOf(state)
    if (idx < order.length - 1) {
      setState(order[idx + 1])
    } else {
      setState('prompt')
      setCycle(c => (c + 1) % CYCLE_STORIES.length)
      setTypedComplete(false)
    }
  }, [state])

  const current = STATE_META[state]

  return (
    <main style={{ background: 'var(--bg-deepest)', minHeight: '100vh', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Mode toggle bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-4 p-3"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Execution Mode</span>
        <button onClick={() => setRealMode(false)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all"
          style={{
            background: !realMode ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.04)',
            color: !realMode ? '#39FF14' : 'var(--text-tertiary)',
            border: `1px solid ${!realMode ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
          ◇ Simulated
        </button>
        <button onClick={() => setRealMode(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all"
          style={{
            background: realMode ? 'rgba(107,91,255,0.15)' : 'rgba(255,255,255,0.04)',
            color: realMode ? '#6b5bff' : 'var(--text-tertiary)',
            border: `1px solid ${realMode ? 'rgba(107,91,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
          ⚡ Real (ZeroLang + packnplay)
        </button>
        <span className="text-[9px] font-mono" style={{ color: realMode ? '#6b5bff' : '#39FF14', opacity: 0.5 }}>
          {realMode ? 'zero.graph is the program' : '7-state self-play loop'}
        </span>
      </div>

      {/* View Mode Toggle */}
      <div className="fixed top-16 left-4 z-50 flex items-center gap-2 p-2 pointer-events-auto"
        style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>VIEW</span>
        <button onClick={() => setViewMode('graph')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${viewMode === 'graph' ? 'bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/40' : 'bg-white/5 text-white/40 border-white/10'}`}
        >
          GRAPH
        </button>
        <button onClick={() => setViewMode('canvas')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${viewMode === 'canvas' ? 'bg-[#6B5BFF]/20 text-[#6B5BFF] border-[#6B5BFF]/40' : 'bg-white/5 text-white/40 border-white/10'}`}
        >
          CANVAS
        </button>
        <button onClick={() => setViewMode('split')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all ${viewMode === 'split' ? 'bg-[#F7A41D]/20 text-[#F7A41D] border-[#F7A41D]/40' : 'bg-white/5 text-white/40 border-white/10'}`}
        >
          SPLIT
        </button>
      </div>

      {/* Architecture toggle */}
      <div className="fixed top-16 right-4 z-50 pointer-events-auto">
        <button onClick={() => setShowArch(!showArch)}
          className="px-4 py-2 rounded-xl font-mono text-[10px] tracking-wider transition-all"
          style={{
            background: showArch ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.04)',
            color: showArch ? '#39FF14' : 'var(--text-tertiary)',
            border: `1px solid ${showArch ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
        {showArch ? 'HIDE' : 'SHOW'} GRAPH ARCH
        </button>
      </div>

      <div style={{ background: 'var(--bg-deepest)', minHeight: '100vh', color: 'var(--text-primary)', overflow: 'hidden' }}>
        <InductHero />
        <EndpointsGrid />
        <WhyPai />
        <InductTerminalDemo />
        <InductFooter />
      </div>
    </main>
  )
}

