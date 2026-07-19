'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { AuthMenu } from '@/components/auth-menu'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Home', href: '#home' },
  { label: 'Duels', href: '#quiz' },
  { label: 'Arena', href: '#referee' },
  { label: 'Progress', href: '#progression' },
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
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'py-2' : 'py-4')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className={cn('flex items-center justify-between rounded-[24px] px-4 py-2.5 transition-all duration-300', scrolled ? 'glass shadow-[0_10px_50px_-18px_rgba(0,0,0,0.7)]' : 'border border-white/10 bg-black/10 backdrop-blur')}>
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
<<<<<<< HEAD
            <AuthMenu />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground lg:hidden"
            >
=======
            <Button size="lg" nativeButton={false} render={<Link href="/quizzes" className="relative z-10 pointer-events-auto" />} className="hidden h-10 rounded-xl px-5 font-medium glow-green sm:inline-flex">
              Explore modes
            </Button>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-foreground lg:hidden">
>>>>>>> 378e2c9 (Redesign FootballIQ and fix mode navigation)
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="glass mt-2 rounded-2xl p-2 lg:hidden">
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-sm text-white/70 transition-colors hover:bg-secondary hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="p-2">
                <Button size="lg" nativeButton={false} render={<Link href="/quizzes" className="relative z-10 pointer-events-auto" onClick={() => setOpen(false)} />} className="h-11 w-full rounded-xl font-medium">
                  Explore modes
                </Button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  )
}
