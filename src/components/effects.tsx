'use client'

import { ReactNode, forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// FadeIn — fade + slide entrance
// ============================================
export interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = 600, direction = 'up', className }, ref) => {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
      const timer = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(timer)
    }, [delay])

    const transforms = {
      up: 'translateY(24px)',
      down: 'translateY(-24px)',
      left: 'translateX(24px)',
      right: 'translateX(-24px)',
    }

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translate(0)' : transforms[direction],
          transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {children}
      </div>
    )
  }
)

FadeIn.displayName = 'FadeIn'

// ============================================
// ScaleIn — scale + fade entrance
// ============================================
export interface ScaleInProps {
  children: ReactNode
  delay?: number
  duration?: number
  startScale?: number
  className?: string
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, delay = 0, duration = 500, startScale = 0.95, className }, ref) => {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
      const timer = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(timer)
    }, [delay])

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : `scale(${startScale})`,
          transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {children}
      </div>
    )
  }
)

ScaleIn.displayName = 'ScaleIn'

// ============================================
// TiltCard — 3D tilt on hover
// ============================================
export interface TiltCardProps {
  children: ReactNode
  className?: string
  maxTilt?: number
  perspective?: number
  scale?: number
  glow?: boolean
}

export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(
  ({ children, className, maxTilt = 8, perspective = 800, scale = 1.02, glow = false }, ref) => {
    const [style, setStyle] = useState<React.CSSProperties>({})
    const [hovered, setHovered] = useState(false)

    const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      setStyle({
        transform: `perspective(${perspective}px) rotateY(${x * maxTilt * 2}deg) rotateX(${-y * maxTilt * 2}deg) scale(${scale})`,
        transition: 'transform 0.08s ease-out',
        borderColor: glow ? 'rgba(57,255,20,0.3)' : undefined,
        boxShadow: glow ? `0 8px 32px rgba(57,255,20,0.06), ${x * 20}px ${y * 20}px 40px rgba(57,255,20,0.04)` : undefined,
      })
    }, [perspective, maxTilt, scale, glow])

    const handleLeave = useCallback(() => {
      setStyle({
        transform: 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)',
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        borderColor: undefined,
        boxShadow: undefined,
      })
    }, [])

    return (
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...style,
          willChange: 'transform',
          borderRadius: 16,
          border: '1px solid rgba(57,255,20,0.08)',
          background: hovered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
          padding: 24,
          cursor: 'default',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        }}
        className={cn(className)}
      >
        {children}
      </div>
    )
  }
)

TiltCard.displayName = 'TiltCard'

// ============================================
// ShimmerText — animated gradient text
// ============================================
export interface ShimmerTextProps {
  children: ReactNode
  className?: string
  speed?: number
  colors?: string[]
}

export const ShimmerText = forwardRef<HTMLSpanElement, ShimmerTextProps>(
  ({ children, className, speed = 3, colors = ['#39FF14', '#6bff4a', '#39FF14'] }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('inline-block bg-clip-text text-transparent', className)}
        style={{
          backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
          backgroundSize: '200% 100%',
          animation: `shimmer ${speed}s ease-in-out infinite`,
        }}
      >
        {children}
      </span>
    )
  }
)

ShimmerText.displayName = 'ShimmerText'

// ============================================
// Typewriter — character-by-character typing
// ============================================
export interface TypewriterProps {
  text?: string
  texts?: string[]
  speed?: number
  delay?: number
  loop?: boolean
  cursor?: string
  cursorBlinkSpeed?: number
  className?: string
  onComplete?: () => void
}

export const Typewriter = forwardRef<HTMLSpanElement, TypewriterProps>(
  ({ text, texts, speed = 40, delay = 0, loop = true, cursor = '▎', cursorBlinkSpeed = 0.8, className, onComplete }, ref) => {
    const [displayed, setDisplayed] = useState('')
    const [index, setIndex] = useState(0)
    const [done, setDone] = useState(false)
    const activeText = text || (texts?.[index] ?? '')

    useEffect(() => {
      setDisplayed('')
      setDone(false)
      let i = 0
      const timer = setTimeout(() => {
        const interval = setInterval(() => {
          i++
          setDisplayed(activeText.slice(0, i))
          if (i >= activeText.length) {
            clearInterval(interval)
            setDone(true)
            if (loop && texts && index < texts.length - 1) {
              setTimeout(() => {
                setIndex((i) => (i + 1) % texts.length)
                setDone(false)
              }, 2000)
            } else if (onComplete) {
              onComplete()
            }
          }
        }, speed)
        return () => clearInterval(interval)
      }, delay)
    }, [activeText, speed, delay, loop, texts, index, onComplete])

    return (
      <span ref={ref} className={cn('inline-flex items-center', className)}>
        {displayed}
        <span
          style={{
            opacity: done ? 0 : 1,
            transition: 'opacity 1s',
            animation: `blink ${0.8 / cursorBlinkSpeed}s step-end infinite`,
            display: 'inline-block',
            width: '0.5em',
            textAlign: 'center',
          }}
        >
          {cursor}
        </span>
      </span>
    )
  }
)

Typewriter.displayName = 'Typewriter'

// ============================================
// ParticleField — ambient particle background
// ============================================
export interface ParticleFieldProps {
  count?: number
  color?: string
  size?: number
  speed?: number
  className?: string
}

export const ParticleField = forwardRef<HTMLDivElement, ParticleFieldProps>(
  ({ count = 60, color = 'rgba(57,255,20,0.03)', size = 2, speed = 0.0005, className }, ref) => {
    const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; size: number }>>([])

    useEffect(() => {
      const initial = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: Math.random() * size + 0.5,
      }))
      setParticles(initial)
    }, [count, speed])

    useEffect(() => {
      let mounted = true
      const animate = () => {
        if (!mounted) return
        setParticles(prev => prev.map(p => ({
          ...p,
          x: (p.x + p.vx + 1) % 1,
          y: (p.y + p.vy + 1) % 1,
        })))
        requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
      return () => { mounted = false }
    }, [count])

    return (
      <div
        ref={ref}
        className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
        style={{ zIndex: 0 }}
      >
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: color,
              opacity: 0.5 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>
    )
  }
)

ParticleField.displayName = 'ParticleField'

// ============================================
// MorphingView — smooth view transitions
// ============================================
export interface MorphingViewProps {
  current: number
  views: ReactNode[]
  className?: string
  transitionDuration?: number
  easing?: string
}

export const MorphingView = forwardRef<HTMLDivElement, MorphingViewProps>(
  ({ current, views, className, transitionDuration = 500, easing = 'cubic-bezier(0.16, 1, 0.3, 1)' }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        style={{
          minHeight: 400,
          position: 'relative',
        }}
      >
        {views.map((view, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'translateY(0)' : 'translateY(24px)',
              pointerEvents: i === current ? 'auto' : 'none',
              transition: `opacity ${transitionDuration}ms ${easing}, transform ${transitionDuration}ms ${easing}`,
            }}
          >
            {view}
          </div>
        ))}
      </div>
    )
  }
)

MorphingView.displayName = 'MorphingView'

// ============================================
// NeuralNetworkViz — animated neural network
// ============================================
export interface NeuralNetworkVizProps {
  nodes?: number
  connections?: number
  color?: string
  className?: string
  animated?: boolean
}

export const NeuralNetworkViz = forwardRef<HTMLDivElement, NeuralNetworkVizProps>(
  ({ nodes = 20, connections = 40, color = '#39FF14', className, animated = true }, ref) => {
    const [nodePositions, setNodePositions] = useState<Array<{ x: number; y: number }>>([])

    useEffect(() => {
      const positions = Array.from({ length: nodes }, () => ({
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
      }))
      setNodePositions(positions)
    }, [nodes])

    useEffect(() => {
      if (!animated) return
      let mounted = true
      const animate = () => {
        if (!mounted) return
        setNodePositions(prev => prev.map((node, i) => ({
          x: Math.max(0.05, Math.min(0.95, node.x + (Math.random() - 0.5) * 0.005)),
          y: Math.max(0.05, Math.min(0.95, node.y + (Math.random() - 0.5) * 0.005)),
        })))
        requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
      return () => { mounted = false }
    }, [animated])

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        style={{ width: '100%', height: '100%', minHeight: 300 }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          {/* Connections */}
          {Array.from({ length: connections }, (_, i) => {
            const a = Math.floor(Math.random() * nodes)
            const b = Math.floor(Math.random() * nodes)
            if (a === b) return null
            const na = nodePositions[a]
            const nb = nodePositions[b]
            if (!na || !nb) return null
            return (
              <line
                key={i}
                x1={na.x * 100}
                y1={na.y * 100}
                x2={nb.x * 100}
                y2={nb.y * 100}
                stroke={color}
                strokeWidth="0.3"
                strokeOpacity="0.15"
                strokeLinecap="round"
              />
            )
          })}
          {/* Nodes */}
          {nodePositions.map((pos, i) => (
            <circle
              key={i}
              cx={pos.x * 100}
              cy={pos.y * 100}
              r={3}
              fill={color}
              opacity="0.6"
              filter="url(#glow)"
            />
          ))}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>
    )
  }
)

NeuralNetworkViz.displayName = 'NeuralNetworkViz'

// ============================================
// Export all
// ============================================
export type {
  FadeInProps,
  ScaleInProps,
  TiltCardProps,
  ShimmerTextProps,
  TypewriterProps,
  ParticleFieldProps,
  MorphingViewProps,
  NeuralNetworkVizProps,
}

export { ScrollReveal } from './wow-moments'