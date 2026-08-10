import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { RefereeGame } from '@/components/referee-game'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Referee Arena</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Apply law with match context, not just instinct.</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Train with 50 validated match scenarios, then use the complete Referee Debrief—everything on this learning pathway is free.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
          <div>
            <h2 className="mb-3 text-xl font-black tracking-tight">Referee Arena · 50 scenarios</h2>
            <RefereeGame />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Free advanced module</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">Referee Debrief</h3>
              <p className="mt-2 text-sm text-muted-foreground">Complete a staged penalty-area incident with foul, restart, sanction, VAR and match-control analysis.</p>
              <Link href="/academy/referee/referee-debrief-penalty-area" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open module</Link>
            </div>
            <Link href="/academy/referee" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open Referee Academy pathway</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
