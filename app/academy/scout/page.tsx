import Link from 'next/link'
import { Search } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

export default function ScoutAcademyPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Search className="size-3.5" /> Scout Academy</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Learn to spot a good player</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Read the player notes. Find the good and bad points. Then make your choice.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Start here</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Scout Vision</h2>
            <p className="mt-2 text-sm text-muted-foreground">Read one player report and choose: follow, watch or pass.</p>
            <Link href="/quizzes/would-you-scout-him" className="mt-4 inline-flex rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">Play Scout Vision</Link>
          </article>

            <article className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Free advanced module</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Scout Room: Player Evaluation</h2>
              <p className="mt-2 text-sm text-muted-foreground">Write your own player report, then compare it with our example.</p>
              <Link href="/academy/scout/scout-room-player-evaluation" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open Scout Room</Link>
            </article>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-xl font-black tracking-tight">Future free modules</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Scout Video Lab: frame-by-frame interpretation prompts (coming next)</li>
            <li>• Recruitment Board Decisions: multi-player shortlist balancing (planned later)</li>
          </ul>
        </section>
      </section>
    </main>
  )
}
