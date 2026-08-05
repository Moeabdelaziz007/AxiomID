import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'PAI-NEW — Truth-Scored News',
  description: 'Cross-referenced news with trust scores. Every source rated. Every story verified.',
}

export default function NewLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="antialiased">{children}</body></html>
}
