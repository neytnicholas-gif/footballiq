import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FootballIQ',
    template: '%s | FootballIQ',
  },
  description:
    'FootballIQ is a football intelligence platform for quizzes, scouting decisions, predictions, Player Market portfolios, streaks, XP, ratings and leaderboards.',
  openGraph: {
    title: 'FootballIQ',
    description:
      'Play football knowledge and decision challenges, improve your profile, and compete on FootballIQ leaderboards.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0d10',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background font-sans antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-xl transition focus:translate-y-0"
        >
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1}>
          <AuthProvider>{children}</AuthProvider>
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
