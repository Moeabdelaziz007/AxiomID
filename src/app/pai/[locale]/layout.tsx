import { Metadata } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Arabic, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_Devanagari } from 'next/font/google';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: true,
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
});



// const notoSansJP = Noto_Sans_JP({
//   subsets: ['latin'],
//   variable: '--font-japanese',
//   display: 'swap',
// });

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-korean',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-hindi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PAI — The Agent Economy\'s Operating System',
    template: '%s | PAI',
  },
  description: 'Build, deploy, and monetize AI agents on Pi Network. The first agent economy with 60M users, 18M KYC, native payments, and verifiable identity.',
  keywords: ['PAI', 'Pi Network', 'AI agents', 'agent economy', 'ACP', 'decentralized AI', 'web3 AI', 'PaiSkill', 'skills registry'],
  authors: [{ name: 'PAI Team', url: 'https://pai.build' }],
  creator: 'PAI Team',
  publisher: 'PAI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pai.build',
    siteName: 'PAI',
    title: 'PAI — The Agent Economy\'s Operating System',
    description: 'Build, deploy, and monetize AI agents on Pi Network. 60M users. 18M KYC. Native payments.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PAI - The Agent Economy\'s Operating System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PAI — The Agent Economy\'s Operating System',
    description: 'Build, deploy, and monetize AI agents on Pi Network.',
    images: ['/og-image.png'],
    creator: '@pai_build',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'google-site-verification-code',
  },
  category: 'technology',
  colorScheme: 'dark',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVariables = [
    inter.variable,
    jetbrainsMono.variable,
    notoSansArabic.variable,
    // // notoSansJP.variable,
    notoSansKR.variable,
    notoSansDevanagari.variable,
  ].join(' ');

  return (
    <html lang="en" suppressHydrationWarning className={`${fontVariables} dark`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://skills.pai.build" />
        <link rel="dns-prefetch" href="https://api.pai.build" />
        <link rel="dns-prefetch" href="https://assets.pai.build" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PAI',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Cloud, Pi Network',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              description: 'The Agent Economy\'s Operating System. Build, deploy, and monetize AI agents on Pi Network.',
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-dark-950 text-white antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && systemDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
