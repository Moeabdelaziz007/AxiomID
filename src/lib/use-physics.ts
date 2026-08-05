'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ─────────────────────────────────────────────
// SPRING PHYSICS CORE
// ─────────────────────────────────────────────
export interface SpringConfig {
  tension: number
  friction: number
  precision?: number
}

export const SPRINGS = {
  gentle:   { tension: 120, friction: 14 },
  snappy:   { tension: 180, friction: 16 },
  bouncy:   { tension: 280, friction: 12 },
  magnetic: { tension: 400, friction: 20 },
} as const satisfies Record<string, SpringConfig>

export function springStep(
  position: number,
  velocity: number,
  target: number,
  config: SpringConfig,
  dt: number = 1/60
): { position: number; velocity: number } {
  const { tension, friction } = config
  const force = -tension * (position - target)
  const damping = -friction * velocity
  const acceleration = force + damping
  const newVelocity = velocity + acceleration * dt
  const newPosition = position + newVelocity * dt
  return { position: newPosition, velocity: newVelocity }
}

export function springTo(
  from: number,
  to: number,
  config: SpringConfig,
  onUpdate: (v: number) => void,
  onComplete?: () => void
) {
  let pos = from
  let vel = 0
  const precision = config.precision ?? 0.01
  const animate = () => {
    const { position, velocity } = springStep(pos, vel, to, config)
    pos = position
    vel = velocity
    onUpdate(pos)
    if (Math.abs(pos - to) > precision || Math.abs(vel) > precision) {
      requestAnimationFrame(animate)
    } else {
      onUpdate(to)
      onComplete?.()
    }
  }
  requestAnimationFrame(animate)
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────

// Smooth scroll to anchor with spring
export function useSmoothScroll() {
  const scrollTo = useCallback((targetId: string, config: SpringConfig = SPRINGS.gentle) => {
    const el = document.getElementById(targetId.replace('#', ''))
    if (!el) return
    const start = window.scrollY
    const target = el.getBoundingClientRect().top + window.scrollY
    const distance = target - start
    let pos = start
    let vel = 0
    const animate = () => {
      const { position, velocity } = springStep(pos, vel, target, config)
      pos = position
      vel = velocity
      window.scrollTo(0, pos)
      if (Math.abs(pos - target) > 0.5 || Math.abs(vel) > 0.5) {
        requestAnimationFrame(animate)
      } else {
        window.scrollTo(0, target)
      }
    }
    requestAnimationFrame(animate)
  }, [])
  return { scrollTo }
}

// Magnetic button — follows cursor, springs back
export function useMagnetic(
  strength: number = 0.3,
  config: SpringConfig = SPRINGS.magnetic
) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const move = (e: Event) => {
      const mouseEvent = e as MouseEvent
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = (mouseEvent.clientX - centerX) * strength
      const dy = (mouseEvent.clientY - centerY) * strength
      setOffset({ x: dx, y: dy })
    }
    const leave = () => {
      springTo(offset.x, 0, config, (v) => setOffset(o => ({ ...o, x: v })))
      springTo(offset.y, 0, config, (v) => setOffset(o => ({ ...o, y: v })))
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [strength, config])

  return { ref, style: { transform: `translate(${offset.x}px, ${offset.y}px)` } }
}

// Parallax depth — multiple layers at different speeds
export function useParallax(layers: number[] = [0.2, 0.5, 0.8]) {
  const ref = useRef<HTMLDivElement>(null)
  const [offsets, setOffsets] = useState(layers.map(() => ({ x: 0, y: 0 })))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      setOffsets(layers.map((depth) => ({
        x: cx * depth,
        y: cy * depth,
      })))
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [layers])

  return { ref, offsets }
}

// Ripple click effect
export function useRipple(color: string = 'rgba(57,255,20,0.3)') {
  const [ripples, setRipples] = useState<Array<{x:number;y:number;id:number}>>([])

  const trigger = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id,
    }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
  }, [])

  return { ripples, trigger, color }
}

// Cursor glow — radial gradient follows mouse
export function useCursorGlow(
  color: string = 'rgba(57,255,20,0.15)',
  radius: number = 400
) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      el.style.background = `radial-gradient(${radius}px at ${x}% ${y}%, ${color}, transparent 70%)`
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [color, radius])

  return { ref }
}

// Stagger reveal — children animate in sequence
export function useStagger(
  count: number,
  delay: number = 60,
  config: SpringConfig = SPRINGS.gentle
) {
  const [states, setStates] = useState<Array<{ opacity: number; y: number }>>(
    Array.from({ length: count }, () => ({ opacity: 0, y: 24 }))
  )

  useEffect(() => {
    let mounted = true
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!mounted) return
        let pos = 24
        let vel = 0
        const animate = () => {
          const { position, velocity } = springStep(pos, vel, 0, config)
          pos = position
          vel = velocity
          if (mounted) {
            setStates(prev => prev.map((s, j) =>
              j === i ? { ...s, opacity: 1 - pos / 24, y: pos } : s
            ))
          }
          if (Math.abs(pos) > 0.1 || Math.abs(vel) > 0.1) {
            requestAnimationFrame(animate)
          } else if (mounted) {
            setStates(prev => prev.map((s, j) =>
              j === i ? { ...s, opacity: 1, y: 0 } : s
            ))
          }
        }
        requestAnimationFrame(animate)
      }, i * delay)
    }
    return () => { mounted = false }
  }, [count, delay, config])

  return states
}

// 3D Universe — mouse-tracked icosahedron + particles
export function useUniverse3D(
  containerRef: React.RefObject<HTMLDivElement>,
  options: {
    particles?: number
    color?: string
    rotationSpeed?: number
  } = {}
) {
  const { particles = 60, color = '#39FF14', rotationSpeed = 0.0005 } = options
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      setMouse({
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      })
    }
    el.addEventListener('mousemove', move)
    return () => el.removeEventListener('mousemove', move)
  }, [containerRef])

  // Returns Three.js setup data for consumer to render
  return {
    mouse,
    sceneConfig: {
      icoRadius: 1.5,
      particleCount: particles,
      color,
      rotationSpeed,
      targetRotation: { x: mouse.y * 0.5, y: mouse.x * 0.5 },
    },
  }
}

// Active press scale
export function useActiveScale(scale: number = 0.97) {
  const [pressed, setPressed] = useState(false)
  return {
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false),
    style: { transform: pressed ? `scale(${scale})` : 'scale(1)' },
  }
}

// Focus ring for keyboard nav
export function useFocusRing(
  color: string = 'rgba(57,255,20,0.5)',
  offset: number = 2
) {
  const [focused, setFocused] = useState(false)
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: focused
      ? { outline: `2px solid ${color}`, outlineOffset: offset, borderRadius: 4 }
      : {},
  }
}