import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard'
import { CallToAction, SurfaceCard, StatusBadge } from '@/components/platform/primitives'

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

        <div className="mt-6">
          <CompetitiveLeaderboard initialBoard={params.board} />
        </div>

        <div className="mt-8">
          <CallToAction
            title="Want to move up the table?"
            copy="Play another game, earn XP and come back to check your place."
            primary={<Link href="/quizzes" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Back to modes</Link>}
            secondary={<Link href="/profile" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Open profile</Link>}
          />
        </div>
      </section>
    </main>
  )
}
