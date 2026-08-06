import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SurfaceCard } from '@/components/platform/primitives'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">404</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">That page is not available.</h1>
          <p className="mt-3 text-sm text-muted-foreground">The route may have moved, or the URL is incorrect.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Back to homepage</Link>
            <Link href="/quizzes" className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">Browse modes</Link>
          </div>
        </SurfaceCard>
      </section>
    </main>
  )
}
