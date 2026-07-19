import { SiteHeader } from '@/components/site-header'
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard'

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const params = await searchParams
  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><CompetitiveLeaderboard initialBoard={params.board}/></section></main>
}
