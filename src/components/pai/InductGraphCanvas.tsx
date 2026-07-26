'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

// Types for our graph data
interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  type: 'agent' | 'skill' | 'endpoint' | 'patch' | 'state'
  color: string
  size: number
  metadata?: Record<string, unknown>
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'data' | 'control' | 'trust' | 'patch'
  weight: number
}

interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: { x: number; y: number; zoom: number }
  selectedNodeId: string | null
  hoveredNodeId: string | null
}

interface InductGraphCanvasProps {
  initialState?: Partial<GraphState>
  onStateChange?: (state: GraphState) => void
  className?: string
  realMode?: boolean
  zeroLangPatches?: Array<{ id: string; diff: string; status: 'pending' | 'approved' | 'rejected' }>
}

// Color palette matching mino.mobi / PAI aesthetic
const COLORS = {
  agent: '#39FF14',
  skill: '#6BFF4A',
  endpoint: '#0EA5E9',
  patch: '#FFD700',
  state: '#FF6B6B',
  background: '#0A0A0F',
  grid: 'rgba(57, 255, 20, 0.03)',
  gridAccent: 'rgba(57, 255, 20, 0.08)',
  text: '#E8E8ED',
  textMuted: '#6B6B7B',
  accent: '#39FF14',
  accentDim: 'rgba(57, 255, 20, 0.15)',
  patchPending: '#FFA500',
  patchApproved: '#39FF14',
  patchRejected: '#FF6B6B',
}

const NODE_COLORS = {
  agent: COLORS.agent,
  skill: COLORS.skill,
  endpoint: COLORS.endpoint,
  patch: COLORS.patch,
  state: COLORS.state,
}

const NODE_SIZES = {
  agent: 16,
  skill: 12,
  endpoint: 14,
  patch: 10,
  state: 12,
}

export function InductGraphCanvas({
  initialState,
  onStateChange,
  className = '',
  realMode = false,
  zeroLangPatches = [],
}: InductGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  // State management with URL sync
  const [graphState, setGraphState] = useState<GraphState>(() => {
    if (typeof window !== 'undefined') {
      return loadStateFromURL() ?? defaultGraphState()
    }
    return defaultGraphState()
  })

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [animationTime, setAnimationTime] = useState(0)

  // Generate default graph state with PAI network topology
  function defaultGraphState(): GraphState {
    const nodes: GraphNode[] = [
      // Core PAI endpoints as nodes
      { id: 'vai', label: 'VAI', x: 150, y: 200, type: 'endpoint', color: '#EC4899', size: 18, metadata: { layer: 'identity', trust: 92 } },
      { id: 'bye', label: 'BYE', x: 350, y: 200, type: 'endpoint', color: '#9CA3AF', size: 16, metadata: { layer: 'portal', trust: 95 } },
      { id: 'hai', label: 'HAI', x: 550, y: 200, type: 'endpoint', color: '#A855F7', size: 16, metadata: { layer: 'trust', trust: 90 } },
      { id: 'try', label: 'TRY', x: 150, y: 400, type: 'endpoint', color: '#39FF14', size: 16, metadata: { layer: 'agent', trust: 88 } },
      { id: 'buy', label: 'BUY', x: 350, y: 400, type: 'endpoint', color: '#F59E0B', size: 16, metadata: { layer: 'market', trust: 85 } },
      { id: 'fly', label: 'FLY', x: 550, y: 400, type: 'endpoint', color: '#0EA5E9', size: 16, metadata: { layer: 'travel', trust: 76 } },
      { id: 'new', label: 'NEW', x: 150, y: 600, type: 'endpoint', color: '#EF4444', size: 16, metadata: { layer: 'truth', trust: 71 } },
      { id: 'blg', label: 'BLG', x: 350, y: 600, type: 'endpoint', color: '#FBBF24', size: 16, metadata: { layer: 'blog', trust: 79 } },
      { id: 'induct', label: 'INDUCT', x: 550, y: 600, type: 'endpoint', color: '#EC4899', size: 20, metadata: { layer: 'alpha', trust: 97 } },
      { id: 'ppp', label: 'PPP', x: 750, y: 400, type: 'endpoint', color: '#F7A41D', size: 18, metadata: { layer: 'protocol', trust: 91 } },
      { id: 'style', label: 'STYLE', x: 750, y: 200, type: 'endpoint', color: '#06B6D4', size: 16, metadata: { layer: 'design', trust: 83 } },
      { id: 'why', label: 'WHY', x: 750, y: 600, type: 'endpoint', color: '#8B5CF6', size: 16, metadata: { layer: 'philosophy', trust: 87 } },

      // Agent nodes
      { id: 'hermes', label: 'HERMES\n(L1 Observe)', x: 150, y: 50, type: 'agent', color: '#39FF14', size: 14, metadata: { loop: 'L1', role: 'Researcher' } },
      { id: 'gemini', label: 'GEMINI\n(L2 Synthesize)', x: 350, y: 50, type: 'agent', color: '#6BFF4A', size: 14, metadata: { loop: 'L2', role: 'Synthesizer' } },
      { id: 'claude', label: 'CLAUDE\n(L3 Design)', x: 550, y: 50, type: 'agent', color: '#FFD700', size: 14, metadata: { loop: 'L3', role: 'Architect' } },
      { id: 'codex', label: 'CODEX\n(L4 Build)', x: 150, y: 750, type: 'agent', color: '#FF6B6B', size: 14, metadata: { loop: 'L4', role: 'Builder' } },
      { id: 'opencode', label: 'OPENCODE\n(L5 Verify)', x: 350, y: 750, type: 'agent', color: '#FF6B6B', size: 14, metadata: { loop: 'L5', role: 'QA' } },
      { id: 'alphazero', label: 'ALPHAZERO\n(L7 Evolve)', x: 550, y: 750, type: 'agent', color: '#EC4899', size: 14, metadata: { loop: 'L7', role: 'Evolver' } },

      // Skill nodes
      { id: 'skill-packnplay', label: 'packnplay', x: 750, y: 50, type: 'skill', color: '#6BFF4A', size: 10, metadata: { sandbox: true } },
      { id: 'skill-zerolang', label: 'ZeroLang', x: 750, y: 100, type: 'skill', color: '#EC4899', size: 10, metadata: { compiler: true } },
      { id: 'skill-tlsnotary', label: 'TLSNotary', x: 750, y: 150, type: 'skill', color: '#0EA5E9', size: 10, metadata: { verifiable: true } },
      { id: 'skill-tlsn', label: 'TLSN', x: 750, y: 200, type: 'skill', color: '#A855F7', size: 10, metadata: { verifiable: true } },
    ]

    const edges: GraphEdge[] = [
      // Protocol layer connections
      { id: 'e1', source: 'ppp', target: 'vai', type: 'control', weight: 1 },
      { id: 'e2', source: 'ppp', target: 'hai', type: 'control', weight: 1 },
      { id: 'e3', source: 'ppp', target: 'try', type: 'control', weight: 1 },
      { id: 'e4', source: 'ppp', target: 'buy', type: 'control', weight: 1 },
      { id: 'e5', source: 'ppp', target: 'fly', type: 'control', weight: 1 },
      { id: 'e6', source: 'ppp', target: 'new', type: 'control', weight: 1 },
      { id: 'e7', source: 'ppp', target: 'blg', type: 'control', weight: 1 },
      { id: 'e8', source: 'ppp', target: 'induct', type: 'control', weight: 1 },
      { id: 'e9', source: 'ppp', target: 'style', type: 'control', weight: 1 },
      { id: 'e10', source: 'ppp', target: 'why', type: 'control', weight: 1 },
      { id: 'e11', source: 'ppp', target: 'ppp', type: 'control', weight: 0 },

      // Agent loop connections
      { id: 'e12', source: 'hermes', target: 'gemini', type: 'data', weight: 1 },
      { id: 'e13', source: 'gemini', target: 'claude', type: 'data', weight: 1 },
      { id: 'e4', source: 'claude', target: 'codex', type: 'data', weight: 1 },
      { id: 'e5', source: 'codex', target: 'opencode', type: 'data', weight: 1 },
      { id: 'e6', source: 'opencode', target: 'alphazero', type: 'data', weight: 1 },
      { id: 'e7', source: 'alphazero', target: 'hermes', type: 'data', weight: 1 },

      // Agent to endpoint connections
      { id: 'e8', source: 'hermes', target: 'vai', type: 'data', weight: 0.5 },
      { id: 'e9', source: 'hermes', target: 'bye', type: 'data', weight: 0.5 },
      { id: 'e10', source: 'gemini', target: 'try', type: 'data', weight: 0.5 },
      { id: 'e11', source: 'claude', target: 'induct', type: 'data', weight: 0.5 },
      { id: 'e12', source: 'codex', target: 'buy', type: 'data', weight: 0.5 },
      { id: 'e13', source: 'codex', target: 'fly', type: 'data', weight: 0.5 },
      { id: 'e14', source: 'opencode', target: 'new', type: 'data', weight: 0.5 },
      { id: 'e15', source: 'opencode', target: 'blg', type: 'data', weight: 0.5 },
      { id: 'e16', source: 'alphazero', target: 'induct', type: 'data', weight: 0.5 },

      // Skill connections
      { id: 'e17', source: 'hermes', target: 'skill-tlsnotary', type: 'trust', weight: 1 },
      { id: 'e18', source: 'gemini', target: 'skill-zerolang', type: 'trust', weight: 1 },
      { id: 'e19', source: 'codex', target: 'skill-packnplay', type: 'trust', weight: 1 },
      { id: 'e20', source: 'alphazero', target: 'skill-zerolang', type: 'trust', weight: 1 },
      { id: 'e21', source: 'opencode', target: 'skill-tlsnotary', type: 'trust', weight: 1 },
    ]

    return {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 0.7 },
      selectedNodeId: null,
      hoveredNodeId: null,
    }
  }

  // URL-synced state management
  function loadStateFromURL(): GraphState | null {
    if (typeof window === 'undefined') return null
    try {
      const params = new URLSearchParams(window.location.hash.slice(1))
      if (!params.has('state')) return null
      return JSON.parse(decodeURIComponent(params.get('state')!))
    } catch {
      return null
    }
  }

  function saveStateToURL(state: GraphState) {
    if (typeof window === 'undefined') return
    const stateToSave = {
      viewport: state.viewport,
      selectedNodeId: state.selectedNodeId,
      showGrid,
      showLabels,
    }
    const encoded = encodeURIComponent(JSON.stringify(stateToSave))
    window.history.replaceState(null, '', `#state=${encoded}`)
  }

  // Sync state to URL on changes
  useEffect(() => {
    saveStateToURL(graphState)
    onStateChange?.(graphState)
  }, [graphState.viewport, graphState.selectedNodeId, showGrid, showLabels])

  // Canvas rendering
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (!container) return

    // Set canvas size
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height
    const { x, y, zoom } = graphState.viewport

    // Clear
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, width, height)

    // Grid
    if (showGrid) {
      const gridSize = 40 * zoom
      const offsetX = (graphState.viewport.x % gridSize + gridSize) % gridSize
      const offsetY = (graphState.viewport.y % gridSize + gridSize) % gridSize

      ctx.strokeStyle = COLORS.grid
      ctx.lineWidth = 1

      for (let x = -offsetX; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = -offsetY; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Accent grid lines every 5
      ctx.strokeStyle = COLORS.gridAccent
      for (let x = -offsetX; x < width; x += gridSize * 5) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = -offsetY; y < height; y += gridSize * 5) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Transform for viewport
    ctx.save()
    ctx.translate(width / 2 + graphState.viewport.x, height / 2 + graphState.viewport.y)
    ctx.scale(zoom, zoom)

    // Draw edges
    graphState.edges.forEach(edge => {
      const source = graphState.nodes.find(n => n.id === edge.source)
      const target = graphState.nodes.find(n => n.id === edge.target)
      if (!source || !target) return

      const x1 = source.x
      const y1 = source.y
      const x2 = target.x
      const y2 = target.y

      // Edge color by type
      let strokeColor = 'rgba(255,255,255,0.08)'
      let lineWidth = Math.max(0.5, edge.weight * zoom * 1.5)

      switch (edge.type) {
        case 'control':
          strokeColor = 'rgba(247, 164, 29, 0.3)'
          break
        case 'data':
          strokeColor = 'rgba(57, 255, 20, 0.2)'
          break
        case 'trust':
          strokeColor = 'rgba(168, 85, 247, 0.3)'
          break
        case 'patch':
          strokeColor = 'rgba(255, 215, 0, 0.4)'
          break
      }

      // Animate data flow
      if (edge.type === 'data' && animationTime > 0) {
        const pulse = Math.sin(animationTime * 3) * 0.5 + 0.5
        strokeColor = `rgba(57, 255, 20, ${0.2 + pulse * 0.3})`
        lineWidth *= 1 + pulse * 0.5
      }

      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'

      // Draw curved edge
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      const dx = x2 - x1
      const dy = y2 - y1
      const dist = Math.sqrt(dx * dx + dy * dy)
      const curve = Math.min(dist * 0.3, 80)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(
        midX - dy * 0.15,
        midY + dx * 0.15,
        x2, y2
      )
      ctx.stroke()

      // Arrowhead for directed edges
      if (edge.type !== 'control') {
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const arrowSize = 8 / zoom
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(
          x2 - arrowSize * Math.cos(angle - Math.PI / 6),
          y2 - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          x2 - arrowSize * Math.cos(angle + Math.PI / 6),
          y2 - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.fillStyle = strokeColor
        ctx.fill()
      }
    })

    // Draw nodes
    graphState.nodes.forEach(node => {
      const { x, y, size, color, type, label, id } = node
      const isSelected = graphState.selectedNodeId === id
      const isHovered = graphState.hoveredNodeId === id
      const isDragged = draggedNodeId === node.id

      const displaySize = Math.max(4, size * zoom)
      const pulse = isHovered || isSelected ? Math.sin(animationTime * 4) * 0.15 + 1 : 1
      const currentSize = displaySize * pulse

      // Node glow for special states
      if (isSelected || isHovered) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentSize * 3)
        gradient.addColorStop(0, `${color}40`)
        gradient.addColorStop(1, `${color}00`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, currentSize * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Node body
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, currentSize, 0, Math.PI * 2)
      ctx.fill()

      // Border
      ctx.strokeStyle = isSelected ? COLORS.accent : isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = isSelected ? 2 / zoom : isHovered ? 1.5 / zoom : 0.5 / zoom
      ctx.stroke()

      // Patch status indicator
      if (node.type === 'patch') {
        const statusColor = zeroLangPatches.find(p => p.id === id)?.status
        if (statusColor) {
          ctx.fillStyle = statusColor === 'approved' ? COLORS.patchApproved :
                          statusColor === 'rejected' ? COLORS.patchRejected :
                          COLORS.patchPending
          ctx.beginPath()
          ctx.arc(x + currentSize * 0.7, y - currentSize * 0.7, 4 / zoom, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Label
      if (showLabels) {
        ctx.fillStyle = COLORS.text
        ctx.font = `500 ${Math.max(9, 11 / zoom)}px 'JetBrains Mono', monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(label, x, y + currentSize + 4 / zoom)
      }

      // Selected indicator
      if (isSelected) {
        ctx.strokeStyle = COLORS.accent
        ctx.lineWidth = 2 / zoom
        ctx.setLineDash([8 / zoom, 4 / zoom])
        ctx.beginPath()
        ctx.arc(x, y, currentSize + 6 / zoom, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    ctx.restore()

    // Mini-map
    if (width > 400 && height > 300) {
      const mmSize = 150
      const mmX = width - mmSize - 20
      const mmY = 20
      const mmZoom = 0.1

      ctx.fillStyle = 'rgba(10, 10, 15, 0.9)'
      ctx.fillRect(mmX, mmY, mmSize, mmSize)
      ctx.strokeStyle = COLORS.border
      ctx.lineWidth = 1
      ctx.strokeRect(mmX, mmY, mmSize, mmSize)

      // Viewport indicator
      const vx = mmX + mmSize / 2 + graphState.viewport.x * mmZoom
      const vy = mmY + mmSize / 2 + graphState.viewport.y * mmZoom
      const vw = width * mmZoom * zoom
      const vh = height * mmZoom * zoom

      ctx.strokeStyle = COLORS.accent
      ctx.lineWidth = 2
      ctx.strokeRect(vx - vw / 2, vy - vh / 2, vw, vh)

      // Nodes in minimap
      graphState.nodes.forEach(node => {
        const nx = mmX + mmSize / 2 + node.x * mmZoom
        const ny = mmY + mmSize / 2 + node.y * mmZoom
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    graphState.nodes, graphState.edges, graphState.viewport, showGrid, showLabels, animationTime, draggedNodeId
  }, [graphState, showGrid, showLabels, animationTime, draggedNodeId])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 1 / 60)
      drawGraph()
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Draw on resize
  useEffect(() => {
    const handleResize = () => drawGraph()
    window.addEventListener('resize', handleResize)
    drawGraph()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left - graphState.viewport.x) / graphState.viewport.zoom
    const y = (e.clientY - rect.top - graphState.viewport.y) / graphState.viewport.zoom

    // Check node clicks
    for (const node of graphState.nodes) {
      const dx = node.x - x
      const dy = node.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const nodeRadius = Math.max(4, node.size * graphState.viewport.zoom)

      if (dist < nodeRadius * 1.5) {
        if (e.button === 0) { // Left click - select
          setGraphState(s => ({ ...s, selectedNodeId: s.selectedNodeId === node.id ? null : node.id }))
        } else if (e.button === 2) { // Right click - drag
          setDraggedNodeId(node.id)
          setDragOffset({ x: node.x - x, y: node.y - y })
        }
        return
      }

      // Canvas click - pan start
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      }
    }
  }, [graphState])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left - graphState.viewport.x) / graphState.viewport.zoom
    const y = (e.clientY - rect.top - graphState.viewport.y) / graphState.viewport.zoom

    // Check hover
    let hovered = null
    for (const node of graphState.nodes) {
      const dx = node.x - x
      const dy = node.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const nodeRadius = Math.max(4, node.size * graphState.viewport.zoom)
      if (dist < nodeRadius * 1.5) {
        hovered = node.id
        break
      }
    }
    setHoveredNodeId(hovered)

    // Drag node
    if (draggedNodeId) {
      setGraphState(s => ({
        ...s,
        nodes: s.nodes.map(n => n.id === draggedNodeId ? { ...n, x: x + dragOffset.x, y: y + dragOffset.y } : n)
      }))
      return
    }

    // Pan
    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setGraphState(s => ({
        ...s,
        viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy }
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [graphState, draggedNodeId, dragOffset, isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setDraggedNodeId(null)
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.15, Math.min(3, graphState.viewport.zoom * zoomFactor))

    // Zoom toward mouse
    const newViewport = {
      x: mouseX - (mouseX - graphState.viewport.x) * (newZoom / graphState.viewport.zoom),
      y: mouseY - (mouseY - graphState.viewport.y) * (newZoom / graphState.viewport.zoom),
      zoom: newZoom,
    }

    setGraphState(s => ({ ...s, viewport: newViewport }))
  }, [graphState.viewport])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'g') setShowGrid(!showGrid)
    if (e.key === 'l') setShowLabels(!showLabels)
    if (e.key === 'Escape') setGraphState(s => ({ ...s, selectedNodeId: null }))
    if (e.key === 'r') setGraphState(defaultGraphState())
    if (e.key === '0') setGraphState(s => ({ ...s, viewport: { x: 0, y: 0, zoom: 1 } }))
  }, [showGrid, showLabels])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Real-time updates for realMode
  useEffect(() => {
    if (!realMode) return
    const interval = setInterval(() => {
      setGraphState(s => ({
        ...s,
        nodes: s.nodes.map(n => ({
          ...n,
          x: n.x + (Math.random() - 0.5) * 0.5,
          y: n.y + (Math.random() - 0.5) * 0.5,
        }))
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [realMode])

  // Panel for selected node
  const selectedNode = graphState.nodes.find(n => n.id === graphState.selectedNodeId)

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full bg-bg-deepest overflow-hidden', className)}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
        tabIndex={0}
      />

      {/* Top Controls */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between p-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setGraphState(defaultGraphState())}
            className="px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-wider transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-tertiary)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            RESET VIEW
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-wider transition-all ${showGrid ? 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30' : 'bg-white/5 text-white/40 border-white/10'}`}
          >
            GRID
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-wider transition-all ${showLabels ? 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30' : 'bg-white/5 text-white/40 border-white/10'}`}
          >
            LABELS
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-mono text-white/40">ZOOM</span>
            <span className="text-[11px] font-mono tabular-nums text-[#39FF14]">
              {Math.round(graphState.viewport.zoom * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setRealMode(!realMode)}
            className={`px-4 py-2 rounded-xl font-mono text-sm tracking-wider transition-all ${
              realMode
                ? 'bg-[#6B5BFF]/15 text-[#6B5BFF] border-[#6B5BFF]/30'
                : 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/30'
            }`}
          >
            {realMode ? '⚡ REAL (ZeroLang + packnplay)' : '◇ SIMULATED'}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-mono text-white/40">VIEWPORT</span>
            <span className="text-[11px] font-mono tabular-nums text-white/60">
              {Math.round(graphState.viewport.x)} × {Math.round(graphState.viewport.y)}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[#39FF14]">
              @{Math.round(graphState.viewport.zoom * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Selected Node Details */}
      {selectedNode && (
        <div className="fixed bottom-4 left-4 right-4 z-40 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="p-4 rounded-2xl"
              style={{
                background: 'rgba(10, 10, 15, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
              }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[10px]"
                      style={{
                        background: selectedNode.color,
                        color: '#000',
                      }}
                    >
                      {selectedNode.emoji || selectedNode.label.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg" style={{ color: selectedNode.color }}>
                        {selectedNode.name} ({selectedNode.type.toUpperCase()})
                      </h3>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {selectedNode.metadata?.layer && `Layer: ${selectedNode.metadata.layer}`}
                        {selectedNode.metadata?.trust && ` • Trust: ${selectedNode.metadata.trust}`}
                        {selectedNode.metadata?.loop && ` • Loop: ${selectedNode.metadata.loop}`}
                        {selectedNode.metadata?.role && ` • Role: ${selectedNode.metadata.role}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {realMode && (
                      <code className="px-2 py-1 rounded text-[10px] font-mono"
                        style={{ background: 'rgba(107, 91, 255, 0.15)', color: '#6B5BFF', border: '1px solid rgba(107, 91, 255, 0.2)' }}
                      >
                        {selectedNode.type === 'endpoint' ? `zero query ${selectedNode.id}` :
                         selectedNode.type === 'agent' ? `${selectedNode.metadata?.zeroCmd || 'zero query'}` :
                         selectedNode.type === 'skill' ? `zero patch --skill ${selectedNode.id}` : ''}
                      </code>
                    )}
                    <button
                      onClick={() => setGraphState(s => ({ ...s, selectedNodeId: null }))}
                      className="ml-auto px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-tertiary)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      CLOSE
                    </button>
                  </div>
                </div>

                {selectedNode.type === 'endpoint' && (
                  <div className="mt-4 p-3 rounded-xl text-left"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <p className="text-[11px] font-mono text-white/40 mb-2">Available Commands:</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono"
                      style={{ color: 'var(--text-secondary)' }}>
                      <code className="px-2 py-1 rounded"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        zero query {selectedNode.id}
                      </code>
                      <code className="px-2 py-1 rounded"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        zero patch --endpoint {selectedNode.id}
                      </code>
                      <code className="px-2 py-1 rounded"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        zero reconcile {selectedNode.id}
                      </code>
                      <code className="px-2 py-1 rounded"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        zero query --find {selectedNode.id}
                      </code>
                    </div>
                  </div>
                )}

                {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                  <div className="mt-4 p-3 rounded-xl text-left"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <p className="text-[10px] font-mono uppercase tracking-wider mb-2"
                      style={{ color: 'var(--text-tertiary)' }}>
                      Metadata
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono"
                      style={{ color: 'var(--text-secondary)' }}>
                      {Object.entries(selectedNode.metadata).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <span style={{ color: 'var(--text-tertiary)' }}>{k}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  )
}

InductGraphCanvas.displayName = 'InductGraphCanvas'

export default InductGraphCanvas