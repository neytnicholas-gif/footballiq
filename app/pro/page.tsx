import Link from 'next/link'
import { CheckCircle2, Compass, ShieldCheck } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SurfaceCard } from '@/components/platform/primitives'

const freeNow = [
  'All current quizzes and three 150-question football games',
  'Scout and Referee Academy learning experiences',
  'XP, ranks, streaks, profiles and leaderboards',
  'Daily Challenge and predictions',
  'Player Market testing with free, non-withdrawable credits',
]

export default function AccessRoadmapPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden">
          <div className="bg-[linear-gradient(135deg,rgba(34,197,94,.18),rgba(59,130,246,.12),rgba(8,14,26,.96))] p-7 text-white sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200"><Compass className="size-3.5" /> Access & roadmap</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Quality first. No payment until the game proves it deserves one.</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">All current learning experiences are free. Player Market access is also free during testing. Verdict XI is not collecting a subscription or one-off game payment today.</p>
          </div>
        </SurfaceCard>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <SurfaceCard className="p-6">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight"><CheckCircle2 className="size-6 text-primary" /> Free now</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {freeNow.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span><span>{item}</span></li>)}
            </ul>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight"><ShieldCheck className="size-6 text-primary" /> Before any paid launch</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A possible low annual price for Player Market is only a future idea. It will require successful public testing, reliable weekly valuation runs, capacity evidence, clear consumer terms, data-licence confirmation, support and an easy cancellation/refund process before implementation.</p>
            <p className="mt-3 rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-sm">No checkout, card collection or paid access gate is active.</p>
          </SurfaceCard>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/quizzes" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Play free games</Link>
          <Link href="/market" className="inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold">Test Player Market</Link>
        </div>
      </section>
    </main>
  )
}
