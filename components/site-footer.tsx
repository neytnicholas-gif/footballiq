import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Logo } from '@/components/logo'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Daily', href: '/daily' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Profile', href: '/profile' },
]

const socials: Array<{ label: string; href: string; icon: typeof Mail }> = [
  { label: 'Email', href: 'mailto:hello@footballiq.app', icon: Mail },
]

export function SiteFooter() {
  return (
    <footer id="contact" className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />
          <div className="relative">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Ready for your next FootballIQ challenge?</h2>
            <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
              Play a mode, protect your streak, and build your football intelligence profile.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/quizzes" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 font-medium text-primary-foreground">
                Play now
              </Link>
              <a href="mailto:hello@footballiq.app" className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-transparent px-7 font-medium hover:bg-secondary">
                <Mail className="size-4" />
                Contact us
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Football duels, referee scenarios and interactive quizzes designed for football minds who love the detail.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Navigation</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Contact</p>
            <div className="mt-4 flex gap-3">
              {socials.map((social) => (
                <a key={social.label} href={social.href} aria-label={social.label} className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                  <social.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© FootballIQ</p>
          <p>Made for football minds worldwide.</p>
        </div>
      </div>
    </footer>
  )
}
