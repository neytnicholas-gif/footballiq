import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Sora } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { AccountPrompt } from '@/components/account-prompt'
import { SiteFooter } from '@/components/site-footer'
import { MarketRewardCelebration } from '@/components/market/market-reward-celebration'
import { BetaFeedbackButton } from '@/components/beta-feedback-button'
import { OnboardingTour } from '@/components/onboarding-tour'
import { PlayPathTracker } from '@/components/play-path-tracker'
import { MobileBottomNavigation } from '@/components/mobile-bottom-navigation'
import { MobileExperience } from '@/components/mobile-experience'
import { BRAND } from '@/lib/brand'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  manifest: '/manifest.webmanifest',
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.shortName,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    images: [
      {
        url: BRAND.socialImage,
        width: 1200,
        height: 630,
        alt: 'Early Shout football platform preview',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [BRAND.socialImage],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: BRAND.themeColor,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${plexMono.variable} bg-background font-sans antialiased`}>
        <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-emerald-300 px-4 py-3 font-black text-slate-950 shadow-xl transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white motion-reduce:transition-none">
          Skip to main content
        </a>
        <AuthProvider>
          <PlayPathTracker />
          <MobileExperience />
          <div id="main-content" tabIndex={-1}>{children}</div>
          <OnboardingTour />
          <MarketRewardCelebration />
          <BetaFeedbackButton />
          <AccountPrompt />
          <MobileBottomNavigation />
          <SiteFooter />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
