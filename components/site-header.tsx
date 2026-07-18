'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { LevelBadge } from '@/components/level-badge'
import { getLevelFromXp } from '@/lib/progression'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Daily', href: '/daily' },
  { label: 'Leaderboard', href: '/leaderboard' },
]

function isRouteActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const currentLevel = getLevelFromXp(profile?.xp ?? 0)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    onScroll()

    window.addEventListener('scroll', onScroll, {
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-border bg-background/95 backdrop-blur-md'
          : 'border-transparent bg-background/90 backdrop-blur-md'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="flex min-h-20 items-center justify-between gap-4">
          <Link
            href="/"
            className="shrink-0 text-xl font-bold tracking-tight"
          >
            Football<span className="text-primary">IQ</span>
          </Link>

          <ul className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const isActive = isRouteActive(pathname, link.href)

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-10 w-28 animate-pulse rounded-xl bg-secondary/60" />
            ) : user && profile ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <LevelBadge
                    level={currentLevel}
                    size="sm"
                    showLabel={false}
                  />

                  <span className="max-w-36 truncate">
                    {profile.username || 'Profile'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-border bg-card p-2 shadow-2xl">
                    <div className="border-b border-border px-3 py-3">
                      <div className="flex items-center gap-2">
                        <LevelBadge
                          level={currentLevel}
                          size="sm"
                          showLabel
                        />

                        <p className="truncate font-semibold">
                          {profile.username || 'Player'}
                        </p>
                      </div>

                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {user.email || ''}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      className="mt-1 block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      View profile
                    </Link>

                    <Link
                      href="/username"
                      className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      Edit username
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        void signOut()
                      }}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-xl bg-primary px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:block"
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              className="rounded-xl border border-border p-2 transition-colors hover:bg-secondary md:hidden"
            >
              {mobileOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-2 shadow-2xl md:hidden">
            {user && profile && (
              <div className="mb-2 border-b border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <LevelBadge
                    level={currentLevel}
                    size="sm"
                    showLabel
                  />

                  <p className="truncate font-semibold">
                    {profile.username || 'Player'}
                  </p>
                </div>
              </div>
            )}

            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = isRouteActive(pathname, link.href)

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'block rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {user && profile ? (
              <div className="mt-2 border-t border-border pt-2">
                <Link
                  href="/profile"
                  className="block rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  View profile
                </Link>

                <Link
                  href="/username"
                  className="block rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Edit username
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    void signOut()
                  }}
                  className="w-full rounded-xl px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-background"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}