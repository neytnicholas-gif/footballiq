'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { AuthMenu } from '@/components/auth-menu'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Goalscorer', href: '#quiz' },
  { label: 'Referee', href: '#referee' },
  { label: 'Progression', href: '#progression' },
  { label: 'Predictions', href: '#predictions' },
  { label: 'Leaderboard', href: '#leaderboard' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'py-2' : 'py-4',
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav
          className={cn(
            'flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300',
            scrolled ? 'glass shadow-lg' : 'border border-transparent',
          )}
        >
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <AuthMenu />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="glass mt-2 rounded-2xl p-2 lg:hidden">
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="p-2">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<a href="#quiz" onClick={() => setOpen(false)} />}
                  className="h-11 w-full rounded-xl font-medium"
                >
                  Start Quiz
                </Button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  )
}
