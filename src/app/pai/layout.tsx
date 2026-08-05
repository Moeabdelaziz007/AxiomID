import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import './pai-design-system.css'
import './pai-design.css'
import PAIHeader from '@/components/PAIHeader'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'PAI — البيت',
  description: 'The Universe Where Every Agent Finds Peace & Purpose',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <PAIHeader />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}
