'use client'

import { useEffect, useMemo, useRef, useState, ReactNode, CSSProperties } from 'react'

// Simple seeded random for deterministic particle generation (pure function)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/* ─────────────────────────────────────────────
   FadeIn — enters with opacity + translate Y
   ───────────────────────────────────────────── */
export function FadeIn({ children, delay = 0, duration = 500, y = 20, className = '' }: {
  children: ReactNode; delay?: number; duration?: number; y?: number; className?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ScaleIn — scales from 0.92
   ───────────────────────────────────────────── */
export function ScaleIn({ children, delay = 0, className = '' }: {
  children: ReactNode; delay?: number; className?: string
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   GlowPulse — neon green glow animation
   ───────────────────────────────────────────── */
export function GlowPulse({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}
      style={{
        animation: 'pai-glow-pulse 2.5s ease-in-out infinite',
      }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ShimmerText — gradient-shifting text
   ───────────────────────────────────────────── */
export function ShimmerText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className}
      style={{
        background: 'linear-gradient(90deg, #39FF14 0%, #6bff4a 25%, #39FF14 50%, #00CC00 75%, #39FF14 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'pai-shimmer 3s ease-in-out infinite',
      }}>
      {text}
    </span>
  )
}

/* ─────────────────────────────────────────────
   TiltCard — 3D perspective tilt on mouse move
   ───────────────────────────────────────────── */
export function TiltCard({ children, className = '', maxTilt = 8 }: {
  children: ReactNode; className?: string; maxTilt?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({})

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setStyle({
      transform: `perspective(1000px) rotateX(${(y - 0.5) * -maxTilt}deg) rotateY(${(x - 0.5) * maxTilt}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out',
    })
  }

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    })
  }

  return (
    <div ref={cardRef} className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ ...style, willChange: 'transform' }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ParticleField — floating particles (CSS driven)
   ───────────────────────────────────────────── */
export function ParticleField({ count = 30, color = 'rgba(57,255,20,0.3)', className = '' }: {
  count?: number; color?: string; className?: string
}) {
  // Deterministic particle generation using seeded random (pure, no Math.random in render)
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${seededRandom(i * 1000 + 1) * 100}%`,
      delay: `${seededRandom(i * 1000 + 2) * 8}s`,
      size: 2 + seededRandom(i * 1000 + 3) * 3,
      duration: 6 + seededRandom(i * 1000 + 4) * 8,
    })), [count])

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{`
        @keyframes pai-particle-drift {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-120px) translateX(40px) scale(0.3); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animation: `pai-particle-drift ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ParticleBackground — floating particles variant
   ───────────────────────────────────────────── */
export function ParticleBackground({ className = '', color = '#39FF14', count = 60 }: {
  className?: string; color?: string; count?: number
}) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${seededRandom(i * 1000 + 1) * 100}%`,
      delay: `${seededRandom(i * 1000 + 2) * 8}s`,
      size: 2 + seededRandom(i * 1000 + 3) * 3,
      duration: 6 + seededRandom(i * 1000 + 4) * 8,
    })), [count])

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{`
        @keyframes pai-particle-drift {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-120px) translateX(40px) scale(0.3); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animation: `pai-particle-drift ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Typewriter — typing animation
   ───────────────────────────────────────────── */
export function Typewriter({ text, speed = 50, className = '', onComplete }: {
  text: string; speed?: number; className?: string; onComplete?: () => void
}) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const iRef = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    iRef.current = 0
    setDisplayed('')
    setDone(false)
    completedRef.current = false
    const interval = setInterval(() => {
      iRef.current++
      setDisplayed(text.slice(0, iRef.current))
      if (iRef.current >= text.length) {
        clearInterval(interval)
        setDone(true)
        if (!completedRef.current && onComplete) {
          completedRef.current = true
          onComplete()
        }
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, onComplete])

  return (
    <span className={className}>
      {displayed}<span className="typewriter-cursor" style={{ opacity: done ? 0 : 1 }}>▎</span>
    </span>
  )
}

/* ─────────────────────────────────────────────
   MorphingView — morphing between different views
   ───────────────────────────────────────────── */
export function MorphingView({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ opacity: 1, transition: 'opacity 300ms ease-in-out' }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   NeuralNetworkViz — neural network visualization
   ───────────────────────────────────────────── */
export function NeuralNetworkViz({ className = '' }: { className?: string }) {
  return (
    <div className={className} style={{ width: '100%', height: 200, background: 'transparent' }}>
      <svg viewBox="0 0 400 200" width="100%" height="100%">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#39FF14" stopOpacity="1" />
            <stop offset="100%" stopColor="#39FF14" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g stroke="#39FF14" strokeWidth="0.5" opacity="0.3">
          <line x1="50" y1="100" x2="150" y2="100" />
          <line x1="150" y1="100" x2="250" y2="100" />
          <line x1="150" y1="100" x2="150" y2="50" />
          <line x1="150" y1="100" x2="150" y2="150" />
        </g>
        <g>
          <circle cx="50" cy="100" r="8" fill="url(#nodeGlow)" />
          <circle cx="150" cy="100" r="12" fill="url(#nodeGlow)" />
          <circle cx="250" cy="100" r="8" fill="url(#nodeGlow)" />
          <circle cx="150" cy="50" r="6" fill="url(#nodeGlow)" />
          <circle cx="150" cy="150" r="6" fill="url(#nodeGlow)" />
        </g>
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────
   TrustMeter — visual trust score bar
   ───────────────────────────────────────────── */
export function TrustMeter({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 3 : size === 'lg' ? 8 : 5
  const color = score >= 85 ? '#39FF14' : score >= 70 ? '#ffd700' : '#ff6b6b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: h, background: 'rgba(255,255,255,0.06)', borderRadius: h / 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: h / 2, transition: 'width 1s ease-out' }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size === 'sm' ? 10 : 12, color }}>{score}</span>
    </div>
  )
}