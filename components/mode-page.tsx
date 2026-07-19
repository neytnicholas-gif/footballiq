import { SiteHeader } from '@/components/site-header'

export function ModePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><p className="text-sm uppercase tracking-widest text-primary">{eyebrow}</p><h1 className="mt-3 text-4xl font-semibold">{title}</h1><p className="mt-3 max-w-3xl text-muted-foreground">{description}</p><div className="mt-8">{children}</div></section></main>
}
