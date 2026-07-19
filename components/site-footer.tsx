import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Quizzes', href: '/quizzes' },
  { label: 'Analysis', href: '#blog' },
  { label: 'Predictions', href: '#predictions' },
  { label: 'Leaderboard', href: '#leaderboard' },
  { label: 'About', href: '#about' },
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
  { label: 'Instagram', href: '#', icon: InstagramIcon },
  { label: 'LinkedIn', href: '#', icon: LinkedinIcon },
  { label: 'YouTube', href: '#', icon: YoutubeIcon },
]

export function SiteFooter() {
  return (
    <footer id="contact" className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-card p-8 text-center sm:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />
          <div className="relative">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">Ready to test your football brain?</h2>
            <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
              Step into the premium football IQ hub and experience the full range of football modes in one place.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" nativeButton={false} render={<a href="#quiz" />} className="h-12 rounded-xl px-7 font-medium glow-green">
                Play the duel
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<a href="mailto:hello@refdecision.com" />} className="h-12 rounded-xl border-border bg-transparent px-7 font-medium hover:bg-secondary">
                <Mail className="size-4" />
                Contact us
              </Button>
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
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Follow</p>
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
          <p>© RefDecision</p>
          <p>Made for football minds worldwide.</p>
        </div>
      </div>
    </footer>
  )
}
