import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard'
import { CallToAction, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { ArrowRight, Globe2, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Leaderboards',
  description: 'Compare Early Shout quiz, prediction and Player Market scores.',
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const params = await searchParams
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden border-primary/15 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <StatusBadge label="Leaderboard" tone="good" />
              <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground sm:text-6xl">See how you rank.</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">Choose a game and a time period. Then see your score beside other players.</p>
            </div>
            <Link href="/market/leaderboard" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">Player Market leaderboard</Link>
          </div>
        </SurfaceCard>

        <Link href="/predictions" className="group mt-6 flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-sky-300/25 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,.2),transparent_38%),linear-gradient(135deg,#071827,#0d2731)] p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:border-sky-300/45 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-300/15 text-sky-200"><Globe2 className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Match predictions</p><h2 className="mt-1 text-xl font-black">Global, country, continent and friend tables</h2><p className="mt-1 text-sm text-slate-300"><Users className="mr-1 inline size-3.5" />Compare today, this week, this month, this season or all time.</p></div></div>
          <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 text-sm font-black text-slate-950">Open prediction tables <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
        </Link>

        <div className="mt-6">
          <CompetitiveLeaderboard initialBoard={params.board} />
        </div>

        <div className="mt-8">
          <CallToAction
            title="Want to move up the table?"
            copy="Play another game, earn XP and come back to check your place."
            primary={<Link href="/games" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Back to games</Link>}
            secondary={<Link href="/profile" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Open profile</Link>}
          />
        </div>
      </section>
    </main>
  )
}
