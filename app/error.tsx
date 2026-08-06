'use client'

import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SurfaceCard } from '@/components/platform/primitives'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <SurfaceCard className="border-destructive/35 bg-destructive/8 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">Error state</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Something went wrong.</h1>
          <p className="mt-3 text-sm text-muted-foreground">The page hit an unexpected issue. You can retry or return to a known working route.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => reset()} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Retry</button>
            <Link href="/" className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">Go home</Link>
          </div>
        </SurfaceCard>
      </section>
    </main>
  )
}
