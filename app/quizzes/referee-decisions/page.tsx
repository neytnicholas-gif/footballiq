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
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">What should the referee do?</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Read what happened and pick the right call. We explain the rule after you answer. There are 150 situations to play.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
          <div>
            <h2 className="mb-3 text-xl font-black tracking-tight">Referee Arena · 150 scenarios</h2>
            <RefereeGame />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Free extra lesson</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">Referee Debrief</h3>
              <p className="mt-2 text-sm text-muted-foreground">Make every call in one penalty-box moment: foul, card, restart and VAR.</p>
              <Link href="/academy/referee/referee-debrief-penalty-area" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Start lesson</Link>
            </div>
            <Link href="/academy/referee" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">See all referee lessons</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
