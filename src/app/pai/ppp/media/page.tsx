'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function MediaPage() {
  return (
    <main className="min-h-screen bg-black text-white font-mono">
      {/* Slim breadcrumb */}
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
          <span className="text-[11px] font-mono text-white/60">Media Studio</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#39FF14]/5 via-transparent to-transparent" />
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          <span className="text-[#39FF14]">Media</span> Studio
        </h1>
        <p className="text-white/50 text-sm max-w-xl mx-auto mb-8">
          0-cost content engines for image, video, voice, and script generation.
          From cmux to YouTube in one command.
        </p>
      </section>

      {/* Engine Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-2 gap-6">
        <EngineCard
          title="Image"
          icon="🖼"
          endpoint="generate_image"
          engine="HuggingFace Gradio (free)"
          cost="$0"
          commands={[
            `pai media "a futuristic PAI terminal with neon green text"`,
            `curl -X POST https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`,
          ]}
        />
        <EngineCard
          title="Video"
          icon="🎬"
          endpoint="generate_video"
          engine="pai-pro local Docker (CPU)"
          cost="$0"
          commands={[
            `docker compose -f pai-pro/docker-compose.yml up`,
            `open http://localhost:7588`,
          ]}
        />
        <EngineCard
          title="Voice"
          icon="🎙"
          endpoint="generate_voice"
          engine="edge-tts (local, free)"
          cost="$0"
          commands={[
            `pip install edge-tts`,
            `edge-tts --text "PAI-PPP universe ready" --voice ar-EG-SalmaNeural --write-media hello.mp3`,
          ]}
        />
        <EngineCard
          title="Script"
          icon="📝"
          endpoint="generate_script"
          engine="Hermes + Claude/DeepSeek"
          cost="$0"
          commands={[
            `pai media "write a 60s YouTube script explaining PAI topology"`,
            `# Agent auto-generates script + storyboard`,
          ]}
        />
        <EngineCard
          title="YouTube Pipeline"
          icon="▶"
          endpoint="youtube_publish"
          engine="PAI Agent + yt-dlp + pai-pro"
          cost="$0"
          commands={[
            `pai media "PAI topology explained in 3 min" --publish`,
            `# Script → Voice → Visuals → Stitch → Upload`,
          ]}
        />
        <EngineCard
          title="GitHub Mining"
          icon="⛏"
          endpoint="github_mine"
          engine="PAI Discovery Agent"
          cost="$0"
          commands={[
            `pai mine`,
            `# Discovers valuable repos by topic, stars, freshness`,
          ]}
        />
      </section>

      {/* 0-Cost Stack */}
      <section className="max-w-3xl mx-auto px-6 pb-32">
        <h2 className="text-sm text-[#39FF14] font-semibold tracking-wider mb-6 uppercase">
          The 0-Cost Stack
        </h2>
        <div className="space-y-3">
          {[
            ['edge-tts', 'Free local TTS (50+ languages, Arabic + English)'],
            ['HuggingFace Inference API', 'Free tier: 30k chars/month, 1k images/hour'],
            ['Replicate trial', 'Free credits for image/video generation'],
            ['Docker CPU mode', 'pai-pro runs on CPU — slower but free'],
            ['yt-dlp', 'Free video download, metadata extraction'],
            ['Hermes cron', 'Free scheduling, monitoring, alerts'],
            ['GitHub API', 'Free tier: 60 req/hr (5k with token)'],
          ].map(([name, desc]) => (
            <div key={name} className="flex items-start gap-3">
              <span className="text-[#39FF14] mt-1">▸</span>
              <div>
                <span className="text-white/80 font-medium">{name}</span>
                <span className="text-white/40 text-xs ml-2">— {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <p className="text-[10px] text-white/30 tracking-widest uppercase">
          PAI-PPP · Built for All. For None. To Prove to All.
        </p>
      </footer>
    </main>
  )
}

function EngineCard({ title, icon, endpoint, engine, cost, commands }: {
  title: string; icon: string; endpoint: string; engine: string; cost: string; commands: string[]
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group border border-white/10 rounded-xl p-6 hover:border-[#39FF14]/40 transition-all bg-black/40 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-mono text-[#39FF14] bg-[#39FF14]/10 px-2 py-1 rounded">
          {cost}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-[10px] text-white/30 font-mono mb-4">{endpoint} · {engine}</p>
      <div className="space-y-1.5">
        {commands.map((cmd, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-white/20 text-[10px]">$</span>
            <code className="text-[11px] text-white/60 font-mono flex-1 truncate hover:text-white/90 transition-colors cursor-pointer"
                  onClick={() => { navigator.clipboard.writeText(cmd.replace(/^`|`$/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
              {cmd}
            </code>
          </div>
        ))}
      </div>
      {copied && <span className="absolute top-4 right-16 text-[10px] text-[#39FF14] animate-pulse">copied</span>}
    </div>
  )
}
