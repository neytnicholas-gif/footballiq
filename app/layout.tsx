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
    'FootballIQ is a football intelligence platform for quizzes, scouting decisions, predictions, streaks, XP, ratings and leaderboards.',
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
        <AuthProvider>{children}</AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
