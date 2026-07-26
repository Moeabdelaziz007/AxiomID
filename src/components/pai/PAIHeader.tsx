'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const LAYERS = [
  { name: 'Identity', color: '#ec4899', endpoints: ['vai', 'bye'] },
  { name: 'Agent',   color: '#39FF14', endpoints: ['try'] },
  { name: 'Market',  color: '#f59e0b', endpoints: ['buy', 'fly'] },
  { name: 'Truth',   color: '#ef4444', endpoints: ['new', 'blg'] },
  { name: 'Trust',   color: '#a855f7', endpoints: ['hai'] },
  { name: 'Alpha',   color: '#ec4899', endpoints: ['induct'] },
  { name: 'Protocol',color: '#f7a41d', endpoints: ['ppp'] },
]

export default function PAIHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (ep: string) => pathname === `/${ep}` || pathname.startsWith(`/${ep}/`)

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 transition-all duration-300 ${
      scrolled
        ? 'bg-[rgba(13,13,20,0.88)] border-b border-[rgba(255,255,255,0.06)] backdrop-blur-[20px]'
        : 'bg-transparent border-b border-transparent'
    }`}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#39FF14" strokeWidth="2" />
          <path d="M12 6V18M6 12H18" stroke="#39FF14" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4" fill="#39FF14" />
        </svg>
        <span className="text-sm font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
          PAI
        </span>
        <span className="text-[10px] font-mono text-[#39FF14] tracking-[0.15em] uppercase">
          البيت
        </span>
      </Link>

      {/* Desktop Nav — layers */}
      <nav className="hidden md:flex items-center gap-1">
        {LAYERS.map((layer) => (
          <div key={layer.name} className="relative group/layer">
            <span
              className="px-2.5 py-1.5 text-[11px] font-mono text-white/40 hover:text-white/80 cursor-default transition-colors rounded-md hover:bg-white/5"
              style={{ borderLeft: `2px solid ${layer.color}33`, paddingLeft: '10px' }}
            >
              {layer.name}
            </span>
            <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-[#16161f] border border-[rgba(255,255,255,0.08)] rounded-lg py-1 opacity-0 invisible group-hover/layer:opacity-100 group-hover/layer:visible transition-all duration-200 shadow-xl backdrop-blur-[12px]">
              {layer.endpoints.map((ep, i) => (
                <Link
                  key={ep}
                  href={`/pai/${ep}`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-colors ${
                    isActive(ep)
                      ? 'text-white bg-white/8'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive(ep) ? 'bg-[#39FF14]' : 'bg-white/20'}`} style={{ background: isActive(ep) ? layer.color : undefined }} />
                  /{ep}
                  {isActive(ep) && <span className="ml-auto text-[8px] text-[#39FF14]">◂</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {/* Topology shortcut */}
        <Link
          href="/ppp/topology"
          className="ml-2 px-2.5 py-1.5 text-[11px] font-mono text-[#39FF14]/60 hover:text-[#39FF14] transition-colors rounded-md hover:bg-[#39FF14]/5 border border-[#39FF14]/10"
        >
          GRAPH
        </Link>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span
          className="hidden sm:inline-block w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.5)] animate-pulse"
        />
        <span className="hidden sm:inline text-[10px] font-mono text-white/30">ALL SYSTEMS</span>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white/60 hover:text-white"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeWidth={1.5} d="M6 6l12 12M18 6l-12 12" />
            ) : (
              <path strokeLinecap="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#0d0d14] border-b border-[rgba(255,255,255,0.06)] md:hidden py-4 px-6 space-y-1 backdrop-blur-[20px]">
          {LAYERS.map((layer) => (
            <div key={layer.name} className="py-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/30 flex items-center gap-2" style={{ paddingLeft: '8px' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: layer.color }} />
                {layer.name}
              </span>
              <div className="flex flex-wrap gap-1 mt-1 ml-4">
                {layer.endpoints.map((ep) => (
                  <Link
                    key={ep}
                    href={`/${ep}`}
                    className={`text-[11px] font-mono px-2 py-1 rounded transition-colors ${
                      isActive(ep)
                        ? 'text-white bg-white/10'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {isActive(ep) && <span className="mr-1 text-[#39FF14]">⬡</span>}
                    /{ep}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link
            href="/ppp/topology"
            className="block text-[11px] font-mono text-[#39FF14]/70 hover:text-[#39FF14] px-2 py-1.5 mt-2 border-t border-white/5 pt-3"
            onClick={() => setMenuOpen(false)}
          >
            ⬡ GRAPH VIEW
          </Link>
        </div>
      )}
    </header>
  )
}
