import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { ScoutGame } from '@/components/scout-game'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Scout Vision</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Would you scout this player?</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Read the player notes. Choose follow, watch or pass. We show what a scout should notice. There are 150 players to judge.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
          <div>
            <h2 className="mb-3 text-xl font-black tracking-tight">Scout Vision · 150 scenarios</h2>
            <ScoutGame />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Free advanced module</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">Scout Room</h3>
              <p className="mt-2 text-sm text-muted-foreground">Write your own player report, then compare it with our example.</p>
              <Link href="/academy/scout/scout-room-player-evaluation" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open module</Link>
            </div>
            <Link href="/academy/scout" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Open Scout Academy pathway</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
