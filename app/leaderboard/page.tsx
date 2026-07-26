import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard'
import { CallToAction, SectionHeader, SurfaceCard, StatusBadge } from '@/components/platform/primitives'

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const params = await searchParams
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden border-primary/15 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <StatusBadge label="Competitive intelligence" tone="good" />
              <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground sm:text-6xl">Track progression across every FootballIQ mode.</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">Overall XP sits alongside mode-specific ratings, while daily, weekly, monthly and season boards let you compare short and long-term form without changing the underlying scoring logic.</p>
            </div>
            <Link href="/market/leaderboard" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">Player Market leaderboard</Link>
          </div>
        </SurfaceCard>

        <div className="mt-6">
          <CompetitiveLeaderboard initialBoard={params.board} />
        </div>

        <div className="mt-8">
          <CallToAction
            title="Compare your mode specialty against the wider FootballIQ community."
            copy="Refresh the active board, then jump back into the mode that needs work."
            primary={<Link href="/quizzes" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Back to modes</Link>}
            secondary={<Link href="/profile" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Open profile</Link>}
          />
        </div>
      </section>
    </main>
  )
}
