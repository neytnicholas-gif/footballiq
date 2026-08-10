import Link from 'next/link'
import { Flag } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'

export default function RefereeAcademyPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Flag className="size-3.5" /> Referee Academy</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Decision quality under pressure</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">Train law interpretation, match control and confidence calibration in staged incidents.</p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Available introductory content</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Referee Arena Standard Scenarios</h2>
            <p className="mt-2 text-sm text-muted-foreground">Free foundational incidents covering laws, restarts and sanctions.</p>
            <Link href="/quizzes/referee-decisions" className="mt-4 inline-flex rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">Open free referee scenarios</Link>
          </article>

            <article className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Free advanced module</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Referee Debrief: Penalty-Area Decision</h2>
              <p className="mt-2 text-sm text-muted-foreground">Complete incident analysis from call selection to match-control learning points.</p>
              <Link href="/academy/referee/referee-debrief-penalty-area" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Launch referee debrief</Link>
            </article>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-xl font-black tracking-tight">Future free modules</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• VAR Intervention Lab: threshold and intervention consistency (coming next)</li>
            <li>• Match Temperature Management: communication and sanction strategy (planned later)</li>
          </ul>
        </section>
      </section>
    </main>
  )
}
