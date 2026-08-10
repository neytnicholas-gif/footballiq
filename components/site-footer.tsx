import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { BRAND } from '@/lib/brand'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Player Market', href: '/market' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Academy', href: '/academy' },
  { label: 'Access & roadmap', href: '/pro' },
  { label: 'Daily Challenge', href: '/daily' },
  { label: 'Predictions', href: '/predictions' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Sign in', href: '/login' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Game rules', href: '/game-rules' },
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

          <div className="max-w-xs">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Launch approach</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">All quizzes and current Academy learning experiences are free. Player Market access is also free during product testing; no payment is being collected.</p>
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
