import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PAI-TRY — Agent School',
  description: 'Create, train, and talk to your own AI agent. Personal RAG with memory, powered by Pi Network.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
