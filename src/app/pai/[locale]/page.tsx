'use client'

import { useEffect, useRef } from 'react'

export default function PaiLandingPage() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Three.js 3D scene
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => {
      const container = canvasRef.current
      if (!container || !(window as any).THREE) return
      const THREE = (window as any).THREE
      
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000)
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      const geometry = new THREE.IcosahedronGeometry(1, 1)
      const material = new THREE.MeshPhongMaterial({ color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.3 })
      const ico = new THREE.Mesh(geometry, material)
      scene.add(ico)

      const wireGeo = new THREE.IcosahedronGeometry(2, 0)
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true, transparent: true, opacity: 0.1 })
      const wireIco = new THREE.Mesh(wireGeo, wireMat)
      scene.add(wireIco)

      const light = new THREE.DirectionalLight(0x39ff14, 1)
      light.position.set(1, 1, 1)
      scene.add(light)
      scene.add(new THREE.AmbientLight(0x222222))

      camera.position.z = 3.5

      const animate = () => {
        requestAnimationFrame(animate)
        ico.rotation.x += 0.003
        ico.rotation.y += 0.005
        wireIco.rotation.x -= 0.001
        wireIco.rotation.y -= 0.002
        renderer.render(scene, camera)
      }
      animate()

      const handleResize = () => {
        if (!container) return
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener('resize', handleResize)
    }
    document.head.appendChild(script)
  }, [])

  return (
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] font-['JetBrains_Mono'] overflow-x-hidden">
      {/* 3D Canvas */}
      <div ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0" />

      {/* Grid overlay */}
      <div className="fixed inset-0 z-[1] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(57,255,20,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.03) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-32">
          <span className="text-[#39ff14] text-lg font-bold">PAI</span>
          <div className="flex gap-6 text-sm text-[#64748b]">
            <a href="#endpoints" className="hover:text-[#39ff14] transition">Endpoints</a>
            <a href="#protocol" className="hover:text-[#39ff14] transition">Protocol</a>
            <a href="https://github.com/pai-list" className="hover:text-[#39ff14] transition">GitHub</a>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-32">
          <p className="text-[#39ff14] text-sm mb-4 animate-pulse">✦ LIVE ON PI NETWORK</p>
          <h1 className="text-7xl md:text-9xl font-bold mb-6 font-['Space_Grotesk']"
            style={{ background: 'linear-gradient(135deg, #39ff14, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PAI
          </h1>
          <p className="text-xl text-[#64748b] mb-4">Pi + AI = PAI</p>
          <p className="text-3xl text-[#334155] mb-8" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>البيت</p>
          <p className="text-lg text-[#64748b] max-w-2xl mx-auto mb-12">
            The Agent Economy&apos;s Operating System
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/pai/try" className="inline-block px-8 py-3 rounded-xl font-semibold text-[#020617] transition-all hover:translate-y-[-2px]"
              style={{ background: 'linear-gradient(135deg, #39ff14, #22c55e)', boxShadow: '0 10px 30px -5px rgba(57,255,20,0.4)' }}>
              Create Your Agent →
            </a>
            <a href="/pai" className="inline-block px-8 py-3 rounded-xl border border-[#1e293b] text-[#f8fafc] hover:border-[#39ff14] hover:bg-[rgba(57,255,20,0.05)] transition">
              Explore the Universe
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-32 text-center">
          {[
            { n: '60M+', l: 'Pi Network Users', c: '#39ff14' },
            { n: '18M', l: 'KYC\'d Humans', c: '#22c55e' },
            { n: '0', l: 'Gas Fees', c: '#64748b' },
          ].map(s => (
            <div key={s.n}>
              <p className="text-4xl font-bold" style={{ color: s.c }}>{s.n}</p>
              <p className="text-sm text-[#64748b] mt-2">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Endpoints */}
        <div id="endpoints" className="mb-32">
          <h2 className="text-3xl font-bold text-center mb-4 font-['Space_Grotesk']">
            The <span style={{ background: 'linear-gradient(135deg, #39ff14, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.PAI</span> Endpoints
          </h2>
          <p className="text-center text-[#64748b] mb-12">Single Sources of Truth. Every agent trip ends at a beautiful, secure, verifiable destination.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { n: 'BYE', a: 'البيت', m: 'The Universe', d: 'Entry point' },
              { n: 'HAI', a: 'حي', m: 'The Greeting', d: 'Trust & ratings' },
              { n: 'BUY', a: 'باي', m: 'The Exchange', d: 'Marketplace' },
              { n: 'VAI', a: 'واي', m: 'The Identity', d: 'Passports & KYC' },
              { n: 'TRY', a: 'جرب', m: 'The School', d: 'Agent creator' },
              { n: 'FLY', a: 'فلاي', m: 'The Journey', d: 'Travel booking' },
              { n: 'NEW', a: 'نيو', m: 'The News', d: 'Truth-scored news' },
              { n: 'BLG', a: 'بلوق', m: 'The Blog', d: 'Community stories' },
              { n: 'STYLE', a: 'ستايل', m: 'The Design', d: 'Design system' },
              { n: 'WHY', a: 'واي', m: 'The Philosophy', d: 'Vision & story' },
            ].map(ep => (
              <a key={ep.n} href={`/${ep.n.toLowerCase()}`}
                className="group p-4 rounded-xl transition-all"
                style={{ background: '#0f172a', border: '1px solid #1e293b' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#39ff14'; e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(57,255,20,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.boxShadow = 'none' }}>
                <p className="text-xs text-[#64748b] mb-1">{ep.a}</p>
                <p className="text-lg font-bold mb-0.5">PAI-{ep.n}</p>
                <p className="text-xs text-[#39ff14] mb-2">{ep.m}</p>
                <p className="text-xs text-[#64748b]">{ep.d}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[#334155] text-xs border-t border-[#1e293b] pt-8">
          <p>PAI — البيت. The Agent Economy&apos;s Operating System.</p>
          <p className="mt-1">Built with ❤️ by a Solo Engineer + AI Team. From Kuwait → USA → The Universe.</p>
          <p className="mt-4"><a href="https://github.com/pai-list" className="underline hover:text-[#39ff14] transition">github.com/pai-list</a></p>
        </footer>
      </div>
    </main>
  )
}
