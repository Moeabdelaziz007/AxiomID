import type { Metadata } from 'next'
import '../globals.css'
import '../pai-design.css'

export const metadata: Metadata = {
  title: 'AlphaZero Sandbox — PAI',
  description: 'Self-play architecture. Generate. Evaluate. Evolve. Never forget.',
}

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased">{children}</body></html>
}
