'use client'

import Link from 'next/link'
import { Crown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

const links = [
  ['Home', '/'],
  ['Modes', '/quizzes'],
  ['Daily', '/daily'],
  ['Leaderboard', '/leaderboard'],
  ['Profile', '/profile'],
]

export function SiteHeader() {
  const { user, profile, membership, loading, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const showSignedOutCta = !loading && !user

  function closeMobile() {
    setMobileOpen(false)
  }

  const authBlock = loading
    ? <span className="h-10 w-24 animate-pulse rounded-xl bg-secondary/60" aria-hidden="true" />
    : showSignedOutCta
      ? <Link href="/login" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_-20px_rgba(34,197,94,.7)]">Sign in</Link>
      : (
        <div className="flex items-center gap-2">
          <Link href="/profile" className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition hover:border-primary/35 hover:bg-secondary/40">
            <span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{Math.max(1, Math.floor((profile?.xp ?? 0) / 250) + 1)}</span>
            {profile?.username ?? 'Profile'}
          </Link>
          <button onClick={() => void signOut()} className="hidden rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:block">Log out</button>
        </div>
      )

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[color-mix(in_oklch,var(--background)_88%,white_12%)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 rounded-full border border-border/80 bg-card/90 p-1 md:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition',
                pathname === href ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {membership.plan === 'pro' ? <span className="hidden items-center gap-1 rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 sm:inline-flex"><Crown className="size-3" /> Pro</span> : null}
          {authBlock}
          <button onClick={() => setMobileOpen((value) => !value)} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card md:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-border bg-card/95 p-3 md:hidden">
          <div className="grid gap-1">
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={closeMobile} className={cn('rounded-lg px-3 py-2 text-sm transition', pathname === href ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                {label}
              </Link>
            ))}
            {!showSignedOutCta && !profile?.username ? <Link href="/username" onClick={closeMobile} className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10">Finish profile</Link> : null}
            {!showSignedOutCta && user ? (
              <button onClick={() => { closeMobile(); void signOut() }} className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:text-foreground">
                Log out
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
