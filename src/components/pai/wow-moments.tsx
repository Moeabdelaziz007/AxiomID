'use client'

import { ReactNode, useRef, useState, useEffect, CSSProperties } from 'react'

/* ─────────────────────────────────────────────
   ParticleGrid — animated background grid
   ───────────────────────────────────────────── */
export function ParticleGrid({ className = '' }: { className?: string }) {
  return (
    <div className={className} style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      backgroundImage: 'linear-gradient(rgba(57,255,20,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.03) 1px, transparent 1px)',
      backgroundSize: '64px 64px',
      opacity: 0.7,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(57,255,20,0.04) 0%, transparent 70%)',
        animation: 'pulse 8s ease-in-out infinite',
      }} />
    </div>
  )
}

/* ─────────────────────────────────────────────
   NeonButton — pulsing neon CTA
   ───────────────────────────────────────────── */
export function NeonButton({ children, href, className = '' }: { children: ReactNode; href?: string; className?: string }) {
  const Tag = href ? 'a' : 'button'
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  return (
    <Tag ref={ref} href={href} className={className} style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 24px', borderRadius: 12,
      background: '#39FF14', color: '#000',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      border: 'none', cursor: 'pointer',
      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
      textDecoration: 'none',
      boxShadow: '0 0 20px rgba(57,255,20,0.3), 0 0 40px rgba(57,255,20,0.1)',
      willChange: 'transform',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 0 30px rgba(57,255,20,0.5), 0 0 60px rgba(57,255,20,0.2), 0 4px 12px rgba(0,0,0,0.3)'
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
        e.currentTarget.style.background = '#4aff20'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 0 20px rgba(57,255,20,0.3), 0 0 40px rgba(57,255,20,0.1)'
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.background = '#39FF14'
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)' }}
    >
      {children}
    </Tag>
  )
}

/* ─────────────────────────────────────────────
   MorphCard — card with neon border tilt
   ───────────────────────────────────────────── */
export function MorphCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({})
  const [hover, setHover] = useState(false)

  const move = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    setHover(true)
    setStyle({
      transform: `perspective(800px) rotateY(${(x - 0.5) * 8}deg) rotateX(${(y - 0.5) * -8}deg) translateY(-4px)`,
      transition: 'transform 0.08s ease-out',
      borderColor: `rgba(57,255,20,${0.15 + Math.abs(x - 0.5) * 0.25 + Math.abs(y - 0.5) * 0.25})`,
      boxShadow: `${(x - 0.5) * 16}px ${(y - 0.5) * 16}px 40px rgba(57,255,20,0.06), 0 8px 32px rgba(0,0,0,0.3)`,
    })
  }
  const leave = () => {
    setHover(false)
    setStyle({
      transform: 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)',
      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.5s ease, box-shadow 0.5s ease',
      borderColor: 'rgba(57,255,20,0.08)',
      boxShadow: 'none',
    })
  }

  return (
    <div ref={ref} className={className} onMouseMove={move} onMouseLeave={leave}
      style={{
        ...style,
        willChange: 'transform',
        borderRadius: 16,
        border: '1px solid rgba(57,255,20,0.08)',
        background: hover ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
        padding: 24,
        cursor: 'default',
        transition: style.transition || 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ScrollReveal — fade + slide on scroll
   ───────────────────────────────────────────── */
export function ScrollReveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); o.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)`,
    }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Typewriter — typing one char at a time
   Supports single text or cycling array
   ───────────────────────────────────────────── */
export function Typewriter({ text, texts, speed = 40, className = '' }: { text?: string; texts?: string[]; speed?: number; className?: string }) {
  const [displayed, setDisplayed] = useState('')
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)

  const activeText = text || (texts?.[idx] ?? '')

  useEffect(() => {
    let i = 0; setDisplayed(''); setDone(false)
    const interval = setInterval(() => {
      i++
      setDisplayed(activeText.slice(0, i))
      if (i >= activeText.length) {
        clearInterval(interval)
        setDone(true)
        if (texts) {
          setTimeout(() => {
            setIdx((prev) => (prev + 1) % texts.length)
          }, 2000)
        }
      }
    }, speed)
    return () => clearInterval(interval)
  }, [activeText, speed, texts])

  return (
    <span className={className}>
      {displayed}<span className="typewriter-cursor" style={{ opacity: done ? 0 : 1 }}>▎</span>
    </span>
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
