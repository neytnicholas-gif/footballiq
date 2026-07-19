'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'

const links = [
  { label: 'Home', href: '/' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Daily', href: '/daily' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Leaderboard', href: '/leaderboard' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo className="shrink-0" />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${isActive(link.href) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!loading && !user && (
            <Link href="/login" className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
              Sign in
            </Link>
          )}
          {!loading && user && !profile?.username && (
            <Link href="/username" className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
              Choose username
            </Link>
          )}
          {!loading && user && profile?.username && (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="hidden rounded-xl border border-border px-4 py-2 text-sm sm:inline-flex sm:items-center">
                <span className="mr-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">{Math.max(1, Math.floor(profile.xp / 250) + 1)}</span>
                {profile.username}
              </Link>
              <button type="button" onClick={() => void signOut()} className="hidden rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground sm:block">
                Log out
              </button>
            </div>
          )}

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-border px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${isActive(link.href) ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
              >
                {link.label}
              </Link>
            ))}

            {!loading && !user && (
              <Link href="/login" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">
                Sign in
              </Link>
            )}
            {!loading && user && !profile?.username && (
              <Link href="/username" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">
                Choose username
              </Link>
            )}
            {!loading && user && profile?.username && (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="mt-2 rounded-lg border border-border px-3 py-2 text-sm">
                  Profile
                </Link>
                <button type="button" onClick={() => void signOut()} className="rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground">
                  Log out
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
