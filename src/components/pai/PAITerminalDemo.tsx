'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const spring = { ease: [0.16, 1, 0.3, 1] as const, duration: 0.5 }

interface LogLine { text: string; type: 'input' | 'output' | 'success' | 'info' }

function typeText(full: string, onChar: (t: string) => void, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal?.aborted) { resolve(); return }
    let i = 0
    const speed = 12 + Math.random() * 20 // 50s teletype speed
    const interval = setInterval(() => {
      i++
      onChar(full.slice(0, i))
      if (i >= full.length || signal?.aborted) { clearInterval(interval); resolve() }
    }, speed)
    signal?.addEventListener('abort', () => { clearInterval(interval); resolve() })
  })
}

const STEPS = [
  {
    label: 'INIT', icon: '⟐',
    lines: [
      'Initializing PAI agent runtime...',
      '✓ Pi SDK detected — handshake established',
      '✓ Agent kernel v1.0 loaded',
      'Ready. Awaiting instruction.',
    ],
  },
  {
    label: 'PROMPT', icon: '◇',
    lines: [
      '$ build a trust-scored news aggregator',
      '◇ Parsing request...',
      '◇ Decomposing into 3 sub-tasks',
      '◇ Querying agent graph for patterns',
    ],
  },
  {
    label: 'RUN', icon: '▶',
    lines: [
      '▶ Generating news endpoint code...',
      '▶ Fetching 3 sources for cross-reference',
      '▶ Computing trust scores...',
      '✓ PAI-NEW deployed at /new',
    ],
  },
  {
    label: 'VERIFY', icon: '◉',
    lines: [
      '◉ Verifying TrustChain receipt...',
      '✓ Hash: 0x9f3a...b2e1 (2 confirmations)',
      '✓ Trust score: 84/100 (high consensus)',
      '✓ Receipt sealed. Proof available.',
    ],
  },
]

export default function PAITerminalDemo() {
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([
    { text: 'PAI Agent Terminal v1.0 — interactive demo', type: 'output' },
    { text: 'Type a command or click a step below.', type: 'info' },
  ])
  const [streaming, setStreaming] = useState<LogLine[]>([])
  const [cursor, setCursor] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log, streaming])
  useEffect(() => {
    const ci = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(ci)
  }, [])

  const runStep = async (i: number) => {
    if (running || i > step) return
    if (i < step) { setStep(i); setLog(l => l.slice(0, l.findIndex(x => x.text.startsWith('> Step')))); return }
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setRunning(true)
    setStreaming([])
    setLog(l => [...l, { text: `$ ${STEPS[i].label}`, type: 'input' }])

    for (const line of STEPS[i].lines) {
      let buf = ''
      await typeText(line, t => { buf = t; setStreaming([{ text: buf, type: line.startsWith('✓') ? 'success' : line.startsWith('$') ? 'input' : 'info' }]) }, ac.signal)
      if (ac.signal.aborted) { setRunning(false); return }
      setLog(l => [...l, { text: line, type: line.startsWith('✓') ? 'success' : 'output' }])
      setStreaming([])
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
    }
    setStep(i + 1)
    setRunning(false)
  }

  return (
    <div className="w-full">
      {/* Step buttons */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        {STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          return (
            <motion.button key={s.label}
              whileHover={!running && !done ? { scale: 1.03 } : {}}
              whileTap={!running && !done ? { scale: 0.97 } : {}}
              transition={spring}
              onClick={() => runStep(i)}
              disabled={running || done || i > step}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                done ? 'bg-[#39FF14]/10 border border-[#39FF14]/20 text-[#39FF14]' :
                current || (!running && i === step) ? 'bg-[#39FF14]/10 border border-[#39FF14]/30 text-[#39FF14] animate-glow-pulse' :
                'bg-white/5 border border-white/10 text-zinc-500 hover:bg-white/10 hover:text-white'
              } disabled:opacity-70`}>
              <span className={done ? '' : 'animate-spin'}>{done ? '✓' : current && running ? '⟳' : s.icon}</span>
              {s.label}
            </motion.button>
          )
        })}
      </div>

      {/* Terminal */}
      <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-black/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#39FF14]/60" />
          </div>
          <span className="text-[10px] font-mono text-zinc-600 ml-2">PAI terminal — 50s teletype loop</span>
        </div>

        <div className="p-5 font-mono text-xs leading-relaxed max-h-[360px] overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">
              {entry.type === 'input' ? (
                <div className="flex gap-2"><span className="text-[#39FF14] shrink-0">$</span><span className="text-white">{entry.text.slice(2)}</span></div>
              ) : entry.type === 'success' ? (
                <div className="ml-4 text-[#39FF14]/90">{entry.text}</div>
              ) : entry.type === 'info' ? (
                <div className="ml-4 text-blue-400/80">{entry.text}</div>
              ) : (
                <div className="ml-4 text-zinc-400">{entry.text}</div>
              )}
            </div>
          ))}

          <AnimatePresence mode="popLayout">
            {streaming.map((entry, i) => (
              <motion.div key={`s-${i}`} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={spring} className="mb-1">
                <div className={`ml-4 ${entry.type === 'success' ? 'text-[#39FF14]/90' : entry.type === 'input' ? 'text-white' : 'text-blue-400/80'}`}>
                  {entry.text}<span className={cursor ? '' : 'opacity-0'} style={{ color: '#39FF14' }}>▊</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!running && step < STEPS.length && (
            <div className="ml-4 text-zinc-600 mt-2 flex items-center gap-2">
              <span className="text-[#39FF14]">$</span>
              <span className={cursor ? '' : 'opacity-0'}>▊</span>
            </div>
          )}

          {step >= STEPS.length && (
            <div className="ml-4 text-[#39FF14] mt-3 text-xs">
              ✓ All steps complete. Self-play loop ready for next cycle.
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
