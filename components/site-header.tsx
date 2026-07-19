'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'

const links = [
  ['Home', '/'],
  ['Quizzes', '/quizzes'],
  ['Predictions', '/predictions'],
  ['Daily', '/daily'],
  ['Leaderboard', '/leaderboard'],
]

export function SiteHeader() {
  const { user, profile, loading, signOut } = useAuth()
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-sm text-muted-foreground hover:text-primary">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {!loading && !user && <Link href="/login" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Sign in</Link>}
          {!loading && user && !profile?.username && <Link href="/username" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Choose username</Link>}
          {!loading && user && profile?.username && (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="rounded-xl border border-border px-4 py-2 text-sm"><span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">{Math.max(1, Math.floor(profile.xp / 250) + 1)}</span>{profile.username}</Link>
              <button onClick={() => void signOut()} className="hidden rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground sm:block">Log out</button>
            </div>
          )}
        </div>
      </div>
      <nav className="flex justify-center gap-5 overflow-x-auto border-t border-border px-4 py-3 md:hidden">
        {links.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap text-sm text-muted-foreground">{label}</Link>)}
      </nav>
    </header>
  )
}
