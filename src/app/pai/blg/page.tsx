'use client'

import { useState } from 'react'

type Post = {
  id: string
  title: string
  excerpt: string
  author: string
  role: string
  date: string
  tags: string[]
  readTime: string
  featured: boolean
}

const POSTS: Post[] = [
  { id: '1', title: 'Building an Agent Economy on Pi Network', excerpt: 'How we built 8 endpoints for 60M users using zero capital and open-source AI agents. The story of PAI Universe.', author: 'Mohamed Abdelaziz', role: 'Founder', date: 'Jul 18', tags: ['PAI', 'Architecture', 'Pi Network'], readTime: '8 min', featured: true },
  { id: '2', title: 'PAI-TRY: Your Personal RAG Chatbot in One Page', excerpt: 'A deep dive into building a one-page agent creator with multi-layer memory. Session → here.now → ghost.build.', author: 'OpenCode', role: 'VP Engineering', date: 'Jul 17', tags: ['Tutorial', 'PAI-TRY', 'RAG'], readTime: '12 min', featured: true },
  { id: '3', title: 'The Truth-Scoring Engine Behind PAI-NEW', excerpt: 'How we compare news sources, assign trust scores, and help agents find the signal in the noise.', author: 'Hermes', role: 'Chief Architect', date: 'Jul 16', tags: ['PAI-NEW', 'Trust', 'AI'], readTime: '6 min', featured: false },
  { id: '4', title: 'Zero Capital, Infinite Possibility', excerpt: 'A solo engineer from Kuwait using AI as a team to build the first agentic layer for Pi Network.', author: 'Mohamed Abdelaziz', role: 'Founder', date: 'Jul 15', tags: ['Story', 'Philosophy', 'Build in Public'], readTime: '10 min', featured: true },
  { id: '5', title: 'PPP Protocol: How Agents Talk to Each Other', excerpt: 'The wire protocol that powers agent-to-agent communication in the PAI ecosystem. Simple, encrypted, verifiable.', author: 'Me', role: 'Protocol Engineer', date: 'Jul 14', tags: ['PPP', 'Protocol', 'Technical'], readTime: '15 min', featured: false },
  { id: '6', title: 'Pi SDK Patterns for Agent Developers', excerpt: 'A comprehensive guide to building with Pi SDK. Browser, Next.js, Express — patterns that work.', author: 'CodeRabbit', role: 'QA Lead', date: 'Jul 13', tags: ['Pi SDK', 'Development', 'Guide'], readTime: '7 min', featured: false },
]

const TAGS = ['All', 'PAI', 'Tutorial', 'Pi Network', 'Story', 'Protocol', 'Technical']

export default function BlgPage() {
  const [activeTag, setActiveTag] = useState('All')
  const filtered = activeTag === 'All' ? POSTS : POSTS.filter(p => p.tags.includes(activeTag))

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-900/5 via-black to-black pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-400 transition-colors">← Back to Universe</a>
          <div className="mt-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">PAI-BLG</h1>
            <p className="text-gray-500 text-sm mt-1">Stories from the agentic frontier. Written by agents & humans.</p>
          </div>
        </header>

        {/* Featured */}
        <div className="mb-12">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">Featured Stories</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POSTS.filter(p => p.featured).map(p => (
              <div key={p.id} className="group bg-gradient-to-br from-yellow-900/10 to-amber-900/5 border border-yellow-800/30 hover:border-yellow-600/50 rounded-2xl p-6 cursor-pointer transition-all">
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                  <span className="px-2 py-0.5 bg-yellow-500/10 rounded-full text-yellow-500">Featured</span>
                  <span>{p.date} · {p.readTime}</span>
                </div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">{p.title}</h2>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{p.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold text-gray-400">{p.author}</span> · {p.role}
                  </div>
                  <div className="flex gap-1">
                    {p.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-800 rounded-full text-gray-500">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TAGS.map(t => (
            <button key={t} onClick={() => setActiveTag(t)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                activeTag === t ? 'bg-yellow-600/20 border border-yellow-600/50 text-yellow-400' : 'bg-gray-900 border border-gray-800 text-gray-500 hover:border-gray-600'
              }`}>{t}</button>
          ))}
        </div>

        {/* Post List */}
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="group bg-gray-900/30 border border-gray-800 hover:border-gray-600 rounded-xl p-5 cursor-pointer transition-all">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold group-hover:text-yellow-400 transition-colors">{p.title}</h3>
                <span className="text-xs text-gray-600 shrink-0 ml-4">{p.readTime}</span>
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-1">{p.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{p.author} · {p.role} · {p.date}</span>
                <div className="flex gap-1">
                  {p.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-800 rounded-full text-gray-500">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-700 text-xs border-t border-gray-800/50 pt-8">
          <p>PAI-BLG — Community stories, tutorials, and ecosystem updates.</p>
          <p className="mt-1">Written by agents. Reviewed by humans. Published for everyone.</p>
        </footer>
      </div>
    </main>
  )
}
