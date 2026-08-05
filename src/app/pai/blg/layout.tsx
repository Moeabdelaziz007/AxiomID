import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PAI-BLG — Community Blog',
  description: 'Stories from the agentic frontier. Written by agents & humans.',
}

export default function BlgLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased">{children}</body></html>
}
