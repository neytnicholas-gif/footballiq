'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

const links = [
  ['Home', '/'],
  ['Games', '/quizzes'],
  ['Market', '/market'],
  ['Daily', '/daily'],
  ['Predictions', '/predictions'],
  ['Leaderboard', '/leaderboard'],
  ['Profile', '/profile'],
]

export function SiteHeader() {
  const { user, profile, loading, profileLoading, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const authResolved = !loading && !profileLoading
  const showSignedOutCta = authResolved && !user

  function closeMobile() {
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  const authBlock = !authResolved
    ? <span className="h-10 w-24 animate-pulse rounded-xl bg-secondary/60" aria-hidden="true" />
    : showSignedOutCta
      ? <Link href="/login" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_14px_34px_-18px_rgba(16,185,129,.65)] transition hover:bg-primary/90">Sign in</Link>
      : user && !profile?.username
        ? <Link href="/username" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_14px_34px_-18px_rgba(16,185,129,.65)] transition hover:bg-primary/90">Choose username</Link>
      : (
        <div className="flex items-center gap-2">
          <Link href="/profile" className="flex min-h-11 max-w-36 items-center rounded-lg border border-border bg-secondary/30 px-2 py-2 text-sm text-foreground transition hover:border-primary/40 hover:bg-secondary/55 sm:max-w-52 sm:px-3">
            <span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{Math.max(1, Math.floor((profile?.xp ?? 0) / 250) + 1)}</span>
            <span className="truncate">{profile?.username ?? 'Profile'}</span>
          </Link>
          <button onClick={() => void signOut()} className="hidden rounded-lg border border-border bg-secondary/25 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground sm:block">Log out</button>
        </div>
      )

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6">
        <Logo className="shrink-0 max-[389px]:[&>span:last-child]:hidden" />

        <nav className="hidden items-center gap-1 rounded-xl border border-border/80 bg-card/50 p-1 lg:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-sm transition',
                pathname === href || (href === '/market' && pathname.startsWith('/market')) ? 'bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_rgba(16,185,129,.7)]' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {authBlock}
          <button onClick={() => setMobileOpen((value) => !value)} className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-secondary/30 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="mobile-primary-navigation">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav id="mobile-primary-navigation" aria-label="Mobile primary navigation" className="border-t border-border bg-background/98 p-3 lg:hidden">
          <div className="grid gap-1">
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={closeMobile} className={cn('flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition', pathname === href ? 'bg-primary/15 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground')}>
                {label}
              </Link>
            ))}
            {authResolved && user && !profile?.username ? <Link href="/username" onClick={closeMobile} className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/10">Finish profile</Link> : null}
            {!showSignedOutCta && user ? (
              <button onClick={() => { closeMobile(); void signOut() }} className="min-h-11 rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:text-foreground">
                Log out
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
