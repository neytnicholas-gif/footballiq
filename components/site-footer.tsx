import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { BRAND } from '@/lib/brand'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Player Market', href: '/market' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Academy', href: '/academy' },
  { label: 'FootballIQ Pro', href: '/pro' },
  { label: 'Daily Challenge', href: '/daily' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Sign in', href: '/login' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Game rules', href: '/game-rules' },
]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0ZM3.4 8.5h3.1V21H3.4V8.5Zm5.06 0h2.97v1.7h.04c.41-.78 1.42-1.6 2.92-1.6 3.12 0 3.7 2.05 3.7 4.72V21h-3.1v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H8.46V8.5Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 9.2v5.6l4.8-2.8-4.8-2.8Z" fill="currentColor" />
    </svg>
  )
}

const socials = [
  { label: 'Instagram', href: 'mailto:hello@footballiq.app?subject=FootballIQ%20Instagram', icon: InstagramIcon },
  { label: 'LinkedIn', href: 'mailto:hello@footballiq.app?subject=FootballIQ%20LinkedIn', icon: LinkedinIcon },
  { label: 'YouTube', href: 'mailto:hello@footballiq.app?subject=FootballIQ%20YouTube', icon: YoutubeIcon },
]

export function SiteFooter() {
  return (
    <footer id="contact" className="relative border-t border-border bg-background/95">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Football quizzes and judgement challenges built for people who care about the details of the game.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`mailto:${BRAND.supportEmail}`} />}
              className="mt-5 h-10 rounded-lg border-border bg-secondary/30 px-4 text-sm font-semibold text-foreground hover:bg-secondary/60"
            >
              <Mail className="size-4" />
              Contact
            </Button>
          </div>

          <nav aria-label="Footer">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Follow
            </p>
            <div className="mt-4 flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
                >
                  <social.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row">
          <p>© FootballIQ</p>
          <p>Free game credits only. No cash value, withdrawals or official league affiliation.</p>
        </div>
      </div>
    </footer>
  )
}
