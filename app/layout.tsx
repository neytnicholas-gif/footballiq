import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Sora } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { AccountPrompt } from '@/components/account-prompt'
import { SiteFooter } from '@/components/site-footer'
import { MarketRewardCelebration } from '@/components/market/market-reward-celebration'
import { BetaFeedbackButton } from '@/components/beta-feedback-button'
import { OnboardingTour } from '@/components/onboarding-tour'
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
        <AuthProvider>
          {children}
          <OnboardingTour />
          <MarketRewardCelebration />
          <BetaFeedbackButton />
          <AccountPrompt />
          <SiteFooter />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
