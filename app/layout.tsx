import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/auth-provider'
import { AccountPrompt } from '@/components/account-prompt'
import { BRAND } from '@/lib/brand'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: {
    default: 'FootballIQ - Train football knowledge and judgement',
    template: '%s | FootballIQ',
  },
  description: BRAND.description,
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'FootballIQ - Train football knowledge and judgement',
    description: BRAND.description,
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    images: [
      {
        url: BRAND.socialImage,
        width: 1200,
        height: 630,
        alt: 'FootballIQ platform preview',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FootballIQ - Train football knowledge and judgement',
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
    <html lang="en" className="dark">
      <body className="bg-background font-sans antialiased">
        <AuthProvider>
          {children}
          <AccountPrompt />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
