import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { LEGAL_EFFECTIVE_DATE, LEGAL_CONTACT_EMAIL, legalLinks } from '@/lib/legal'

type LegalPageShellProps = {
  title: string
  summary: string
  children: React.ReactNode
}

export function LegalPageShell({ title, summary, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">FootballIQ legal</p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-muted-foreground">{summary}</p>
          <p className="mt-4 text-sm text-muted-foreground">Effective date: {LEGAL_EFFECTIVE_DATE}</p>

          <nav aria-label="Legal pages" className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
            <ul className="flex flex-wrap items-center gap-3 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/about" className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                  About
                </Link>
              </li>
              <li>
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          <article className="prose prose-invert mt-8 max-w-none prose-headings:scroll-mt-24 prose-p:leading-relaxed prose-li:leading-relaxed">
            {children}
          </article>
        </div>
      </section>
      <SiteFooter compact />
    </main>
  )
}
