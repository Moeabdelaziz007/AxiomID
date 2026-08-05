'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── Graph Data ─── */

type NodeId = string

interface Node {
  id: NodeId
  label: string
  layer: number
  color: string
  desc: string
  lang: string
  loop: string
  x: number
  y: number
  vx: number
  vy: number
}

interface Edge {
  source: NodeId
  target: NodeId
  label: string
  weight: number
}

const LAYER_COLORS = ['#6f42c1', '#3178c6', '#3776ab', '#dea584', '#f7a41d', '#39FF14', '#ff8cff']
const LAYER_NAMES = ['L0 Identity', 'L1 Agent', 'L2 Market', 'L3 Truth', 'L4 Trust', 'L5 Self-Play', 'L6 Protocol']

const NODES: Node[] = [
  { id: 'vai', label: 'VAI', layer: 0, color: LAYER_COLORS[0], desc: 'Birth & death of agents. Identity.', lang: 'Solidity+Rust', loop: 'Bio', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'bye', label: 'BYE', layer: 0, color: LAYER_COLORS[0], desc: 'Entry point. Every agent starts.', lang: 'Solidity+Rust', loop: 'Bio', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'try', label: 'TRY', layer: 1, color: LAYER_COLORS[1], desc: 'Agent school. Create, train, talk.', lang: 'TypeScript', loop: 'PDCA', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'buy', label: 'BUY', layer: 2, color: LAYER_COLORS[2], desc: 'Marketplace. Monetize skills.', lang: 'TS+Python', loop: 'AlphaZero', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'fly', label: 'FLY', layer: 2, color: LAYER_COLORS[2], desc: 'Agentic travel & booking.', lang: 'TS+Python', loop: 'XFlow', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'new', label: 'NEW', layer: 3, color: LAYER_COLORS[3], desc: 'Truth-scored news.', lang: 'TS+Python', loop: 'DoubleRatchet', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'blg', label: 'BLG', layer: 3, color: LAYER_COLORS[3], desc: 'Community blog.', lang: 'TS+Python', loop: 'PDCA', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'hai', label: 'HAI', layer: 4, color: LAYER_COLORS[4], desc: 'Trust layer. Ratings, reviews.', lang: 'Rust/Zig', loop: 'OODA+DoubleR', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'style', label: 'STYLE', layer: 6, color: LAYER_COLORS[6], desc: 'Design system.', lang: 'TypeScript', loop: 'PDCA', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'induct', label: 'INDUCT', layer: 5, color: LAYER_COLORS[5], desc: 'Self-play sandbox.', lang: 'ZeroLang/C', loop: 'Induct+AlphaZ', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'why', label: 'WHY', layer: 6, color: LAYER_COLORS[6], desc: 'The story. The vision.', lang: 'All', loop: 'Bio', x: 0, y: 0, vx: 0, vy: 0 },
  { id: 'ppp', label: 'PPP', layer: 6, color: LAYER_COLORS[6], desc: 'Protocol Network.', lang: 'All', loop: 'XFlow+OODA', x: 0, y: 0, vx: 0, vy: 0 },
]

const EDGES: Edge[] = [
  { source: 'vai', target: 'bye', label: 'identity', weight: 8 },
  { source: 'vai', target: 'try', label: 'creates', weight: 9 },
  { source: 'bye', target: 'try', label: 'launches', weight: 7 },
  { source: 'try', target: 'buy', label: 'monetizes', weight: 7 },
  { source: 'try', target: 'fly', label: 'travels', weight: 5 },
  { source: 'try', target: 'new', label: 'publishes', weight: 5 },
  { source: 'try', target: 'blg', label: 'writes', weight: 5 },
  { source: 'buy', target: 'hai', label: 'rated', weight: 8 },
  { source: 'fly', target: 'hai', label: 'rated', weight: 6 },
  { source: 'new', target: 'hai', label: 'trusted', weight: 7 },
  { source: 'blg', target: 'hai', label: 'reviewed', weight: 6 },
  { source: 'hai', target: 'induct', label: 'evolves', weight: 7 },
  { source: 'induct', target: 'try', label: 'upgrades', weight: 8 },
  { source: 'induct', target: 'new', label: 'patterns', weight: 4 },
  { source: 'induct', target: 'blg', label: 'lessons', weight: 4 },
  { source: 'style', target: 'ppp', label: 'designs', weight: 3 },
  { source: 'style', target: 'vai', label: 'looks', weight: 3 },
  { source: 'style', target: 'buy', label: 'looks', weight: 3 },
  { source: 'style', target: 'fly', label: 'looks', weight: 3 },
  { source: 'style', target: 'new', label: 'looks', weight: 3 },
  { source: 'style', target: 'blg', label: 'looks', weight: 3 },
  { source: 'style', target: 'hai', label: 'looks', weight: 3 },
  { source: 'ppp', target: 'hai', label: 'routes', weight: 6 },
  { source: 'ppp', target: 'try', label: 'wires', weight: 5 },
  { source: 'ppp', target: 'induct', label: 'protocol', weight: 5 },
  { source: 'why', target: 'vai', label: 'explains', weight: 4 },
  { source: 'why', target: 'bye', label: 'explains', weight: 4 },
  { source: 'why', target: 'ppp', label: 'vision', weight: 5 },
  { source: 'new', target: 'blg', label: 'cross-ref', weight: 5 },
  { source: 'buy', target: 'fly', label: 'bundles', weight: 4 },
]

/* ─── Force-Directed Layout ─── */

const W = 900, H = 600
const REPULSE = 4000, ATTRACT = 0.005, DAMP = 0.9, MIN_D = 50

function simulate(nodes: Node[], edges: Edge[], iterations: number) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  
  // Initialize positions in a circle by layer
  for (const n of nodes) {
    const layerNodes = nodes.filter(x => x.layer === n.layer)
    const idx = layerNodes.indexOf(n)
    const angle = (idx / layerNodes.length) * 2 * Math.PI
    const r = 80 + n.layer * 70
    n.x = W / 2 + r * Math.cos(angle)
    n.y = H / 2 + r * Math.sin(angle)
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        let dx = a.x - b.x, dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = REPULSE / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = ATTRACT * e.weight * dist
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    }

    // Apply velocity with damping
    for (const n of nodes) {
      n.vx *= DAMP; n.vy *= DAMP
      n.x += n.vx; n.y += n.vy
      // Clamp to bounds
      n.x = Math.max(50, Math.min(W - 50, n.x))
      n.y = Math.max(50, Math.min(H - 50, n.y))
    }
  }
}

/* ─── Topological Predictions ─── */

function computeCentrality(nodes: Node[], edges: Edge[]): Map<NodeId, number> {
  const degree = new Map<NodeId, number>()
  for (const n of nodes) degree.set(n.id, 0)
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) || 0) + 1)
    degree.set(e.target, (degree.get(e.target) || 0) + 1)
  }
  return degree
}

function predictGaps(nodes: Node[], edges: Edge[]): { from: NodeId; to: NodeId; reason: string; confidence: number }[] {
  const existing = new Set(edges.map(e => `${e.source}-${e.target}`))
  const same = new Set(edges.map(e => `${e.target}-${e.source}`))
  const connected = new Set([...existing, ...same])
  const gaps: { from: NodeId; to: NodeId; reason: string; confidence: number }[] = []

  // Gap: same-layer nodes that aren't connected
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      if (a.layer === b.layer && !connected.has(`${a.id}-${b.id}`) && a.layer > 0) {
        gaps.push({
          from: a.id, to: b.id,
          reason: `Same layer (${LAYER_NAMES[a.layer]}) — natural connection`,
          confidence: 0.6 + a.layer * 0.05,
        })
      }
    }
  }

  // Gap: cross-layer missing links
  gaps.push({ from: 'induct', to: 'buy', reason: 'Self-play → market strategy', confidence: 0.85 })
  gaps.push({ from: 'induct', to: 'fly', reason: 'Self-play → travel optimization', confidence: 0.7 })
  gaps.push({ from: 'bye', to: 'hai', reason: 'Entry → trust verification', confidence: 0.8 })
  gaps.push({ from: 'new', to: 'induct', reason: 'Truth patterns → self-play training', confidence: 0.75 })
  gaps.push({ from: 'blg', to: 'induct', reason: 'Community lessons → self-play', confidence: 0.65 })

  return gaps
}

function bestPath(start: NodeId, end: NodeId, edges: Edge[]): { path: NodeId[]; score: number } | null {
  const adj = new Map<NodeId, { node: NodeId; weight: number }[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    if (!adj.has(e.target)) adj.set(e.target, [])
    adj.get(e.source)!.push({ node: e.target, weight: e.weight })
    adj.get(e.target)!.push({ node: e.source, weight: e.weight })
  }
  
  // BFS with weight heuristic
  const queue: { node: NodeId; path: NodeId[]; score: number }[] = [{ node: start, path: [start], score: 0 }]
  const visited = new Set<NodeId>()
  
  while (queue.length > 0) {
    queue.sort((a, b) => b.score - a.score)
    const cur = queue.shift()!
    if (cur.node === end) return { path: cur.path, score: cur.score / cur.path.length }
    if (visited.has(cur.node)) continue
    visited.add(cur.node)
    
    for (const neighbor of adj.get(cur.node) || []) {
      if (!visited.has(neighbor.node)) {
        queue.push({
          node: neighbor.node,
          path: [...cur.path, neighbor.node],
          score: cur.score + neighbor.weight,
        })
      }
    }
  }
  return null
}

/* ─── Page Component ─── */

export default function TopologyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selected, setSelected] = useState<Node | null>(null)
  const [simulated, setSimulated] = useState(false)
  const [hovered, setHovered] = useState<NodeId | null>(null)
  const [showPredict, setShowPredict] = useState(false)

  // Run simulation once
  useEffect(() => {
    if (!simulated) {
      simulate(NODES, EDGES, 150)
      setSimulated(true)
    }
  }, [simulated])

  // Draw
  useEffect(() => {
    if (!simulated) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0,0,0,0.95)'
      ctx.fillRect(0, 0, W, H)

      // Grid dots
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let x = 0; x < W; x += 40)
        for (let y = 0; y < H; y += 40)
          ctx.fillRect(x, y, 1.5, 1.5)

      // Edges
      for (const e of EDGES) {
        const a = NODES.find(n => n.id === e.source)
        const b = NODES.find(n => n.id === e.target)
        if (!a || !b) continue

        const alpha = 0.1 + (e.weight / 10) * 0.4
        const hl = hovered === e.source || hovered === e.target
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = hl ? `rgba(57,255,20,${alpha + 0.3})` : `rgba(255,255,255,${alpha})`
        ctx.lineWidth = hl ? 2 : 0.5 + e.weight * 0.15
        ctx.stroke()

        // Edge label at midpoint (only for high weight)
        if (e.weight >= 5) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
          ctx.fillStyle = `rgba(255,255,255,0.15)`
          ctx.font = '8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(e.label, mx, my - 6)
        }
      }

      // Nodes
      for (const n of NODES) {
        const isSelected = selected?.id === n.id
        const isHovered = hovered === n.id
        const radius = isSelected ? 22 : isHovered ? 18 : 14

        // Glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 3)
        gradient.addColorStop(0, n.color + '33')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(n.x, n.y, radius * 3, 0, Math.PI * 2)
        ctx.fill()

        // Circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? n.color : (isHovered ? n.color + 'cc' : n.color + '88')
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#fff' : (isHovered ? n.color : 'rgba(255,255,255,0.2)')
        ctx.lineWidth = isSelected ? 2 : (isHovered ? 1.5 : 1)
        ctx.stroke()

        // Label
        ctx.fillStyle = isSelected ? '#fff' : (isHovered ? n.color : 'rgba(255,255,255,0.5)')
        ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(n.label, n.x, n.y + radius + 14)

        // Layer indicator
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.font = '7px monospace'
        ctx.fillText(`L${n.layer}`, n.x, n.y + radius + 26)
      }

      // Legend
      let ly = 20
      ctx.font = '9px monospace'
      for (let i = 0; i < LAYER_NAMES.length; i++) {
        ctx.fillStyle = LAYER_COLORS[i]
        ctx.fillRect(20, ly, 8, 8)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.textAlign = 'left'
        ctx.fillText(LAYER_NAMES[i], 34, ly + 7)
        ly += 18
      }
    }

    draw()
  }, [simulated, selected, hovered])

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    // Find closest node
    let closest: Node | null = null, minDist = 35
    for (const n of NODES) {
      const dx = n.x - x, dy = n.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) { minDist = dist; closest = n }
    }
    setSelected(closest === selected ? null : closest)
  }, [selected])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    let found: NodeId | null = null
    for (const n of NODES) {
      const dx = n.x - x, dy = n.y - y
      if (Math.sqrt(dx * dx + dy * dy) < 20) { found = n.id; break }
    }
    setHovered(found)
  }, [])

  const degree = simulated ? computeCentrality(NODES, EDGES) : new Map()
  const gaps = simulated ? predictGaps(NODES, EDGES) : []

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* slim breadcrumb */}
      <div className="fixed top-14 left-0 right-0 z-40 flex items-center justify-between px-6 py-2 bg-[rgba(13,13,20,0.6)] backdrop-blur-[12px] border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Link href="/pai" className="group flex items-center gap-1.5 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
            Universe
          </Link>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <Link href="/pai/ppp" className="group flex items-center gap-1.5 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">
            <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-[#39FF14] transition-colors" />
            PPP
          </Link>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span className="text-xs font-mono text-white/70">Topology</span>
        </div>
        <button onClick={() => setShowPredict(!showPredict)}
          className="text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: showPredict ? 'rgba(247,164,29,0.15)' : 'rgba(255,255,255,0.04)',
            color: showPredict ? '#f7a41d' : 'var(--text-tertiary)',
            border: `1px solid ${showPredict ? 'rgba(247,164,29,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
          {showPredict ? 'HIDE' : 'SHOW'} PREDICTIONS
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Graph */}
        <div className="flex-1 p-4">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <canvas
              ref={canvasRef}
              style={{ width: W, height: H, cursor: 'pointer' }}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHovered(null)}
            />
          </div>
          <div className="text-[9px] font-mono text-white/20 text-center mt-2">
            Click any node to inspect. Hover to highlight connections.
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-96 p-4 space-y-4">
          {/* Selected Node */}
          {selected ? (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
                <span className="font-mono font-bold text-sm" style={{ color: selected.color }}>{selected.label}</span>
                <span className="text-[9px] font-mono text-white/30">{selected.id}</span>
              </div>
              <div className="text-[10px] font-mono text-white/60 mb-2">{selected.desc}</div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div><span className="text-white/30">Layer:</span> <span style={{ color: selected.color }}>L{selected.layer}</span></div>
                <div><span className="text-white/30">Lang:</span> <span className="text-white/70">{selected.lang}</span></div>
                <div><span className="text-white/30">Loop:</span> <span className="text-white/70">{selected.loop}</span></div>
                <div><span className="text-white/30">Degree:</span> <span className="text-white/70">{degree.get(selected.id) || 0}</span></div>
              </div>
              {/* Connected nodes */}
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-[9px] font-mono text-white/30 mb-1">Connected to:</div>
                <div className="flex flex-wrap gap-1.5">
                  {EDGES.filter(e => e.source === selected.id || e.target === selected.id).map(e => {
                    const otherId = e.source === selected.id ? e.target : e.source
                    const other = NODES.find(n => n.id === otherId)
                    return other ? (
                      <button key={other.id} onClick={() => setSelected(other)}
                        className="px-2 py-0.5 rounded text-[9px] font-mono transition-all hover:opacity-80"
                        style={{ background: other.color + '22', color: other.color, border: `1px solid ${other.color}33` }}>
                        {other.label}
                      </button>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-4 text-[10px] font-mono text-white/40">
              Click a node on the graph to inspect its position in the topology.
            </div>
          )}

          {/* Predictions Panel */}
          {showPredict && (
            <>
              {/* Best Paths */}
              <div className="glass-card p-4">
                <div className="text-[10px] font-mono text-[#39FF14] font-bold mb-2">Best Paths</div>
                {[['vai', 'buy'], ['try', 'hai'], ['new', 'induct'], ['ppp', 'bye']].map(([s, e]) => {
                  const path = bestPath(s, e, EDGES)
                  return (
                    <div key={`${s}-${e}`} className="flex items-center gap-1 mb-1.5 text-[9px] font-mono">
                      <span className="text-white/50">{s}→{e}</span>
                      <span className="text-white/20">:</span>
                      <span className="text-white/60">
                        {path ? path.path.join(' → ') : 'no path'}
                      </span>
                      {path && <span className="text-[#39FF14] ml-auto">{path.score.toFixed(1)}</span>}
                    </div>
                  )
                })}
              </div>

              {/* Gaps */}
              <div className="glass-card p-4">
                <div className="text-[10px] font-mono text-[#f7a41d] font-bold mb-2">Predicted Gaps</div>
                {gaps.sort((a, b) => b.confidence - a.confidence).slice(0, 6).map((g, i) => (
                  <div key={i} className="flex items-center gap-1 mb-1.5 text-[9px] font-mono">
                    <span className="text-white/60">{g.from}</span>
                    <span className="text-[#f7a41d]">→</span>
                    <span className="text-white/60">{g.to}</span>
                    <span className="text-white/20 ml-1">{g.reason}</span>
                    <span className="ml-auto text-[9px]" style={{ color: g.confidence > 0.7 ? '#39FF14' : '#f7a41d' }}>
                      {(g.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Centrality ranking */}
              <div className="glass-card p-4">
                <div className="text-[10px] font-mono text-[#6b5bff] font-bold mb-2">Centrality Ranking</div>
                {[...degree.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 7)
                  .map(([id, d], i) => {
                    const node = NODES.find(n => n.id === id)
                    return (
                      <div key={id} className="flex items-center gap-2 mb-1 text-[9px] font-mono">
                        <span className="text-white/20 w-4">{i + 1}.</span>
                        <div className="w-2 h-2 rounded-full" style={{ background: node?.color }} />
                        <span style={{ color: node?.color }}>{id.toUpperCase()}</span>
                        <span className="text-white/40">degree {d}</span>
                        <div className="ml-auto" style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(d / 14) * 100}%`, height: '100%', background: '#6b5bff', borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}

          {/* Topology legend */}
          <div className="glass-card p-4">
            <div className="text-[10px] font-mono text-white/40">
              <span className="text-white/60 font-bold">T = (V, E)</span>
              <br />V = {NODES.length} endpoints · E = {EDGES.length} connections
              <br />Graph density: {(EDGES.length / (NODES.length * (NODES.length - 1) / 2) * 100).toFixed(1)}%
              <br />Avg degree: {(EDGES.length * 2 / NODES.length).toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
