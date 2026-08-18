import { SiteHeader } from '@/components/site-header'
import { SurfaceCard } from '@/components/platform/primitives'

export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Early Shout</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl" role="status" aria-live="polite">Loading page…</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary/60" aria-hidden="true" />
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary/60" aria-hidden="true" />
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-secondary/60" aria-hidden="true" />
          </div>
        </SurfaceCard>
      </section>
    </main>
  )
}
