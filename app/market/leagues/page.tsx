'use client'

import { useCallback, useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { PlayerMarketLeagues } from '@/components/market/player-market-leagues'
import { loadMyFriendLeagues } from '@/lib/market/client'
import type { MarketFriendLeague, MarketFriendLeagueLeaderboardRow, MarketFriendLeagueMember } from '@/lib/market/types'
import { friendlyMarketLeagueError } from '@/lib/market/user-errors'

export default function PlayerMarketLeaguesPage() {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<MarketFriendLeague[]>([])
  const [members, setMembers] = useState<MarketFriendLeagueMember[]>([])
  const [leaderboard, setLeaderboard] = useState<MarketFriendLeagueLeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    if (!user) {
      setLeagues([])
      setMembers([])
      setLeaderboard([])
      setLoading(false)
      return
    }

    const { leagues: leagueRows, members: memberRows, leaderboard: leaderboardRows, error: loadError } = await loadMyFriendLeagues()
    if (loadError) {
      setError(friendlyMarketLeagueError(loadError, 'load'))
    }

    setLeagues(leagueRows)
    setMembers(memberRows)
    setLeaderboard(leaderboardRows)
    setLoading(false)
  }, [user])

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timeout)
  }, [load])

  return (
    <main className="market-theme market-shell min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {!user ? (
          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <h1 className="text-3xl font-black">Friends leagues beta</h1>
            <p className="mt-3 text-sm text-muted-foreground">Sign in to create or join a private league.</p>
          </section>
        ) : null}

        {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading leagues...</p> : user ? (
          <PlayerMarketLeagues
            leagues={leagues}
            members={members}
            leaderboard={leaderboard}
            userId={user.id}
            onRefresh={load}
          />
        ) : null}
      </section>
    </main>
  )
}
