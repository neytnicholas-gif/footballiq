import Link from 'next/link'
import { Logo } from '@/components/logo'
import { BRAND } from '@/lib/brand'

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <article className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <Logo />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Legal &amp; trust</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: 9 August 2026</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-3 [&_a]:font-semibold [&_a]:text-primary [&_a:hover]:underline">
          {children}
        </div>
        <div className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm">
          <Link href="/terms" className="font-semibold text-primary hover:underline">Terms</Link>
          <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy</Link>
          <Link href="/game-rules" className="font-semibold text-primary hover:underline">Game rules</Link>
          <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold text-primary hover:underline">Contact</a>
          <Link href="/" className="font-semibold text-primary hover:underline">Return home</Link>
        </div>
      </article>
    </main>
  )
}
