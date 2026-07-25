'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'

const links = [
  ['Home', '/'],
  ['Market', '/market'],
  ['Quizzes', '/quizzes'],
  ['Predictions', '/predictions'],
  ['Daily', '/daily'],
  ['Leaderboard', '/leaderboard'],
]

export function SiteHeader() {
  const { user, profile, loading, signOut } = useAuth()
  const showSignedOutCta = !loading && !user
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_oklch,var(--background)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {loading && <span className="h-10 w-24 animate-pulse rounded-xl bg-secondary/60" aria-hidden="true" />}
          {showSignedOutCta && <Link href="/login" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_10px_25px_-14px_rgba(50,230,170,.75)]">Sign in</Link>}
          {!loading && user && !profile?.username && <Link href="/username" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_10px_25px_-14px_rgba(50,230,170,.75)]">Choose username</Link>}
          {!loading && user && profile?.username && (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="rounded-xl border border-border bg-card/70 px-4 py-2 text-sm transition hover:border-primary/35"><span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">{Math.max(1, Math.floor(profile.xp / 250) + 1)}</span>{profile.username}</Link>
              <button onClick={() => void signOut()} className="hidden rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:block">Log out</button>
            </div>
          )}
        </div>
      </div>
      <nav className="flex justify-center gap-5 overflow-x-auto border-t border-border px-4 py-3 md:hidden">
        {links.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap text-sm text-muted-foreground transition hover:text-foreground">{label}</Link>)}
        {showSignedOutCta && <Link href="/login" className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">Sign in</Link>}
      </nav>
    </header>
  )
}
