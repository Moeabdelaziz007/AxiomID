import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { WalletProvider } from "./context/wallet-context";
import { SandboxProvider } from "./context/sandbox-provider";

// Preload fonts for better performance
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "AxiomID - The Human Authorization Protocol",
    template: "%s | AxiomID"
  },
  description: "Prove human intent behind AI actions with decentralized identity verification. Built by Mohamed Abdelaziz.",
  keywords: [
    "decentralized identity",
    "human verification",
    "AI authorization",
    "blockchain identity",
    "sybil resistance",
    "trust score",
    "web3 identity"
  ],
  authors: [{ name: "Mohamed Abdelaziz", url: "https://github.com/Moeabdelaziz007" }],
  creator: "Mohamed Abdelaziz",
  publisher: "AxiomID",
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://axiomid.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "AxiomID - The Human Authorization Protocol",
    description: "Prove human intent behind AI actions with decentralized identity verification",
    url: 'https://axiomid.app',
    siteName: 'AxiomID',
    images: [
      {
        url: '/axiomid-banner.png',
        width: 640,
        height: 640,
        alt: 'AxiomID - Human Authorization Protocol',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "AxiomID - The Human Authorization Protocol",
    description: "Prove human intent behind AI actions with decentralized identity verification",
    images: ['/axiomid-banner.png'],
    creator: '@Moeabdelaziz007',
  },
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
  verification: {
    google: 'your-google-site-verification',
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'AxiomID',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen overflow-x-hidden`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black">
          Skip to content
        </a>
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <SandboxProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </SandboxProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
