import { SiteHeader } from '@/components/site-header'
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard'
import Link from 'next/link'

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const params = await searchParams
  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><div className="mb-6 rounded-3xl border border-primary/20 bg-primary/10 p-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">New flagship rankings</p><h2 className="mt-2 text-2xl font-bold">Player Market leaderboard is live</h2><p className="mt-2 text-sm text-muted-foreground">Track daily, weekly, monthly, season and all-time portfolio growth with return percentages.</p><Link href="/market/leaderboard" className="mt-3 inline-block rounded-xl border border-primary/35 bg-background/60 px-4 py-2 text-sm font-semibold text-primary">Open Player Market leaderboard</Link></div><CompetitiveLeaderboard initialBoard={params.board}/></section></main>
}
