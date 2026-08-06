import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SurfaceCard, StatusBadge } from '@/components/platform/primitives'

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <SurfaceCard className="p-6 sm:p-8">
          <StatusBadge label="Access denied" tone="warn" />
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">You do not have access to this page.</h1>
          <p className="mt-3 text-sm text-muted-foreground">If you expected access, sign in with the correct account or return to a public route.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Go to sign in</Link>
            <Link href="/" className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">Back home</Link>
          </div>
        </SurfaceCard>
      </section>
    </main>
  )
}
