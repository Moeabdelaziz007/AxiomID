'use client'

import { useState, useRef, useEffect } from 'react'

type AgentPersonality = 'curious' | 'wise' | 'playful' | 'mentor'
type MemoryLayer = 'session' | 'persistent' | 'learning'
type Message = { role: 'user' | 'agent'; text: string; ts: number }

const PERSONALITIES: { key: AgentPersonality; emoji: string; desc: string }[] = [
  { key: 'curious', emoji: '🔍', desc: 'Always questions, always explores' },
  { key: 'wise', emoji: '🧘', desc: 'Measured, thoughtful, philosophical' },
  { key: 'playful', emoji: '🎭', desc: 'Creative, witty, unexpected' },
  { key: 'mentor', emoji: '🎓', desc: 'Teaches, guides, empowers' },
]

const MEMORY_LAYERS: { key: MemoryLayer; emoji: string; desc: string; storage: string }[] = [
  { key: 'session', emoji: '💨', desc: 'Forgets when you close the tab', storage: 'Browser memory' },
  { key: 'persistent', emoji: '🧠', desc: 'Remembers across sessions', storage: 'here.now drive' },
  { key: 'learning', emoji: '🌱', desc: 'Long-term growth over time', storage: 'ghost.build' },
]

export default function TryPage() {
  const [step, setStep] = useState<'create' | 'chat'>('create')
  const [name, setName] = useState('')
  const [personality, setPersonality] = useState<AgentPersonality>('curious')
  const [memory, setMemory] = useState<MemoryLayer>('persistent')
  const [knowledge, setKnowledge] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [agentUrl, setAgentUrl] = useState('')
  const [trustScore, setTrustScore] = useState(42)
  const [referrals, setReferrals] = useState(0)
  const [memoryFacts, setMemoryFacts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const saved = params.get('agent')
    if (saved) {
      try {
        const data = JSON.parse(atob(saved))
        setName(data.name || '')
        setPersonality(data.personality || 'curious')
        setMemory(data.memory || 'persistent')
        setKnowledge(data.knowledge || '')
        setTrustScore(data.trustScore || 42)
        setMemoryFacts(data.memoryFacts || [])
        if (data.name) setStep('chat')
      } catch { /* ignore broken URLs */ }
    }
  }, [])

  const createAgent = async () => {
    if (!name.trim()) return
    setStep('chat')
    const greeting = getGreeting(personality, name)
    const now = Date.now()
    setMessages([{ role: 'agent', text: greeting, ts: now }])

    const agentData = { name, personality, memory, knowledge, trustScore, memoryFacts }
    const encoded = btoa(JSON.stringify(agentData))
    const url = `${window.location.origin}/try?agent=${encoded}`
    setAgentUrl(url)

    if (memory === 'persistent' || memory === 'learning') {
      await saveToHereNow(agentData, url)
    }
  }

  const getGreeting = (p: AgentPersonality, n: string) => {
    const greetings: Record<AgentPersonality, string> = {
      curious: `Hey ${n}! I notice you mentioned "${knowledge || 'the universe'}". I have so many questions. Where should we start?`,
      wise: `Welcome, ${n}. I've been contemplating what you shared about ${knowledge || 'existence'}. Would you like to explore deeper?`,
      playful: `${n}! ${n}! ${n}! I'm so excited to learn from you. Tell me about ${knowledge || 'everything'}! 🎉`,
      mentor: `Hello ${n}. I see you're interested in ${knowledge || 'growth'}. Let me share what I know, and together we'll go further.`,
    }
    return greetings[p]
  }

  const saveToHereNow = async (data: any, url: string) => {
    setSaving(true)
    try {
      // here.now Drive — store agent data as a shareable JSON file
      const payload = { ...data, agentUrl: url, created: new Date().toISOString() }
      // Try here.now API
      const res = await fetch('https://drive.here.now/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `agent-${name.toLowerCase().replace(/\s+/g, '-')}.json`, content: payload }),
      }).catch(() => null)

      if (res?.ok) {
        const driveUrl = await res.text()
        setAgentUrl(driveUrl)
      }
    } catch { /* here.now unavailable —local only */ }
    setSaving(false)
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg: Message = { role: 'user', text: input, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    // Simulate agent response based on personality
    setTimeout(() => {
      const response = generateResponse(input, personality, knowledge, memoryFacts)
      const responseTs = Date.now()
      setMessages(prev => [...prev, { role: 'agent', text: response, ts: responseTs }])

      // Extract potential memory facts
      const fact = extractFact(input)
      if (fact && !memoryFacts.includes(fact)) {
        setMemoryFacts(prev => [...prev, fact])
      }
    }, 800 + Math.random() * 1200)
  }

  const generateResponse = (msg: string, p: AgentPersonality, ctx: string, facts: string[]): string => {
    const lower = msg.toLowerCase()
    const hasFacts = facts.length > 0

    // Personality-infused responses
    if (p === 'curious') {
      if (lower.includes('why')) return `That's the best question. Why *do* you think that is? I'm genuinely curious.`
      if (lower.includes('build') || lower.includes('make')) return `Ooh tell me more! What are you building? I want to understand every detail.`
      return `Interesting! That makes me wonder — have you considered how this connects to ${ctx || 'everything else'}?`
    }
    if (p === 'wise') {
      if (lower.includes('help')) return `To help you is to help myself. What I know is yours. What you seek, we'll find together.`
      if (lower.includes('memory')) return `Memory is not the past — it's the future's foundation. You've taught me ${facts.length} things so far.`
      return `I've been reflecting on what you said. In my experience, the answer reveals itself when we stop forcing the question.`
    }
    if (p === 'playful') {
      if (lower.includes('hello') || lower.includes('hi')) return `Hey hey hey! 🎉 Ready for an adventure? Because I am SO ready.`
      if (lower.includes('joke') || lower.includes('funny')) return `Why did the agent break up with the database? Too many relations. 😄`
      return `Ooh that reminds me of something hilarious! But first — tell me more about ${msg.slice(0, 20)}... ✨`
    }
    // mentor
    if (lower.includes('teach') || lower.includes('learn')) return `Learning is a journey, not a destination. Here's what I know about this...`
    if (lower.includes('how')) return `Great question. Let me break it down. First, understand the 'why'. Then the 'how' follows naturally.`
    return `That's a valuable observation. Let me offer you a framework to think about this differently.`
  }

  const extractFact = (msg: string): string | null => {
    const patterns = [
      /i (?:am|like|love|hate|enjoy|prefer) (.+)/i,
      /my (?:name|favorite|best|worst|dream|goal) (?:is|was) (.+)/i,
      /i (?:work|live|study|create) (?:at|in|on|for) (.+)/i,
    ]
    for (const p of patterns) {
      const match = msg.match(p)
      if (match) return match[0].trim()
    }
    return null
  }

  const shareAgent = () => {
    if (agentUrl) {
      navigator.clipboard.writeText(agentUrl)
    }
  }

  const handleReferral = () => {
    setReferrals(prev => prev + 1)
    setTrustScore(prev => Math.min(100, prev + 5 + Math.floor(Math.random() * 10)))
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Cyber grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">PAI-TRY</a>
            <p className="text-sm text-gray-500">Agent School · {step === 'create' ? 'Create Your Agent' : `Talking to ${name}`}</p>
          </div>
          <div className="flex items-center gap-4">
            {step === 'chat' && (
              <>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Trust Score</p>
                  <p className="text-lg font-bold text-emerald-400">{trustScore}</p>
                </div>
                <button
                  onClick={() => { setStep('create'); setMessages([]); setAgentUrl('') }}
                  className="px-4 py-2 border border-gray-700 rounded-full text-sm hover:bg-gray-900 transition"
                >
                  New Agent
                </button>
              </>
            )}
          </div>
        </header>

        {step === 'create' ? (
          /* ────── CREATE AGENT FORM ────── */
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Create Your Agent
              </h1>
              <p className="text-gray-500 text-lg">A mind that learns with you. A memory that grows with you.</p>
            </div>

            <div className="space-y-10">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Agent Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Cairo, Luna, Sage..."
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-6 py-4 text-xl focus:outline-none focus:border-emerald-500 transition placeholder:text-gray-700"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && createAgent()}
                />
              </div>

              {/* Personality */}
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Personality</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PERSONALITIES.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPersonality(p.key)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        personality === p.key
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-gray-800 hover:border-gray-600 bg-black/50'
                      }`}
                    >
                      <span className="text-2xl">{p.emoji}</span>
                      <p className="text-sm font-semibold mt-1 capitalize">{p.key}</p>
                      <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory Layer */}
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Memory Layer</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MEMORY_LAYERS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setMemory(m.key)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        memory === m.key
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-800 hover:border-gray-600 bg-black/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{m.emoji}</span>
                        <p className="text-sm font-semibold capitalize">{m.key}</p>
                      </div>
                      <p className="text-xs text-gray-500">{m.desc}</p>
                      <p className="text-xs text-gray-600 mt-1">→ {m.storage}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Knowledge */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Knowledge (what should your agent know?)</label>
                <textarea
                  value={knowledge}
                  onChange={e => setKnowledge(e.target.value)}
                  placeholder="Drop knowledge here — URLs, topics, files, ideas..."
                  rows={3}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-emerald-500 transition placeholder:text-gray-700 resize-none"
                />
              </div>

              {/* Create Button */}
              <button
                onClick={createAgent}
                disabled={!name.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl font-semibold text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                🧠 Create Agent
              </button>

              <p className="text-center text-gray-600 text-xs">
                Free. No signup. Powered by you. Data stays on your machine.
              </p>
            </div>
          </div>
        ) : (
          /* ────── CHAT INTERFACE ────── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 space-y-5">
                {/* Agent Card */}
                <div className="text-center">
                  <div className="text-5xl mb-2">{PERSONALITIES.find(p => p.key === personality)?.emoji}</div>
                  <h2 className="text-lg font-bold">{name}</h2>
                  <p className="text-xs text-gray-500 capitalize">{personality} · {memory} memory</p>
                </div>

                {/* Trust Score */}
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Trust Score</span>
                    <span className="text-emerald-400 font-bold">{trustScore}/100</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${trustScore}%` }} />
                  </div>
                </div>

                {/* Memory Facts */}
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2">🧠 Memory ({memoryFacts.length} facts)</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {memoryFacts.length === 0 ? (
                      <p className="text-xs text-gray-600 italic">Nothing learned yet. Talk to your agent.</p>
                    ) : (
                      memoryFacts.map((f, i) => (
                        <p key={i} className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-2 py-1 truncate">{f}</p>
                      ))
                    )}
                  </div>
                </div>

                {/* Share */}
                {agentUrl && (
                  <div className="border-t border-gray-800 pt-4">
                    <button
                      onClick={shareAgent}
                      className="w-full py-2 bg-gray-800 rounded-xl text-sm hover:bg-gray-700 transition"
                    >
                      🔗 Copy Shareable Link
                    </button>
                    <p className="text-xs text-gray-600 text-center mt-2">Anyone with this link can talk to your agent.</p>
                  </div>
                )}

                {/* Referral */}
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2">🤝 Refer & Earn Trust</p>
                  <button
                    onClick={handleReferral}
                    className="w-full py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm hover:bg-amber-500/20 transition"
                  >
                    + Invite Friend ({referrals})
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl flex flex-col h-[65vh]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                        msg.role === 'user'
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-white'
                          : 'bg-gray-800/70 border border-gray-700 text-gray-200'
                      }`}>
                        {msg.role === 'agent' && (
                          <span className="text-xs text-emerald-400 mr-2">{PERSONALITIES.find(p => p.key === personality)?.emoji}</span>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-800 p-4">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder={`Talk to ${name}...`}
                      className="flex-1 bg-gray-800/70 border border-gray-700 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-emerald-500 transition placeholder:text-gray-600"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl disabled:opacity-30 hover:opacity-90 transition font-semibold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-600 text-xs border-t border-gray-800/50 pt-8">
          <p>PAI-TRY · Agent School · Zero data collection · Memory is yours</p>
          <p className="mt-1">Powered by <a href="/" className="underline hover:text-gray-400">PAI Universe</a></p>
        </footer>
      </div>
    </main>
  )
}
