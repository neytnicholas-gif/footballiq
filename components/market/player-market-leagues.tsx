'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { createFriendLeague, joinFriendLeague, leaveFriendLeague } from '@/lib/market/client'
import { formatFiqCompact } from '@/lib/market/format'
import type { MarketFriendLeague, MarketFriendLeagueLeaderboardRow, MarketFriendLeagueMember } from '@/lib/market/types'

export function PlayerMarketLeagues({
  leagues,
  members,
  leaderboard,
  userId,
  onRefresh,
}: {
  leagues: MarketFriendLeague[]
  members: MarketFriendLeagueMember[]
  leaderboard: MarketFriendLeagueLeaderboardRow[]
  userId: string
  onRefresh: () => Promise<void>
}) {
  const [createName, setCreateName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | 'leave' | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const membershipByLeague = useMemo(() => {
    const map = new Map<number, MarketFriendLeagueMember>()
    for (const member of members) {
      if (member.user_id === userId) {
        map.set(member.league_id, member)
      }
    }
    return map
  }, [members, userId])

  const leaderboardByLeague = useMemo(() => {
    const map = new Map<number, MarketFriendLeagueLeaderboardRow[]>()
    for (const row of leaderboard) {
      const existing = map.get(row.league_id) ?? []
      existing.push(row)
      map.set(row.league_id, existing)
    }
    return map
  }, [leaderboard])

  async function handleCreate() {
    setBusy('create')
    setError('')
    setNotice('')
    const { data, error: createError } = await createFriendLeague(createName)
    if (createError) {
      setError(createError.message)
      setBusy(null)
      return
    }
    setCreateName('')
    setNotice(`League created: ${String(data?.name ?? '')} (${String(data?.league_code ?? '')})`)
    await onRefresh()
    setBusy(null)
  }

  async function handleJoin() {
    setBusy('join')
    setError('')
    setNotice('')
    const { data, error: joinError } = await joinFriendLeague(joinCode)
    if (joinError) {
      setError(joinError.message)
      setBusy(null)
      return
    }
    setJoinCode('')
    setNotice(`Joined league: ${String(data?.name ?? '')}`)
    await onRefresh()
    setBusy(null)
  }

  async function handleLeave(leagueId: number) {
    setBusy('leave')
    setError('')
    setNotice('')
    const { error: leaveError } = await leaveFriendLeague(leagueId)
    if (leaveError) {
      setError(leaveError.message)
      setBusy(null)
      return
    }
    setNotice('League membership removed.')
    await onRefresh()
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 size-5 text-primary" />
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Friends leagues beta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a private league, share the code, and compare total account value with friends.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm font-semibold">Create a league</p>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="League name"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none"
            />
            <button
              disabled={busy !== null || createName.trim().length < 3}
              onClick={() => void handleCreate()}
              className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy === 'create' ? 'Creating...' : 'Create league'}
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm font-semibold">Join by code</p>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Example: A1B2C3D4"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm uppercase outline-none"
            />
            <button
              disabled={busy !== null || joinCode.trim().length < 6}
              onClick={() => void handleJoin()}
              className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {busy === 'join' ? 'Joining...' : 'Join league'}
            </button>
          </div>
        </div>

        {notice ? <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Your leagues</h2>
          <Link href="/market/leaderboard" className="text-sm font-semibold text-primary">Global leaderboard</Link>
        </div>

        {leagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leagues joined yet.</p>
        ) : (
          <div className="space-y-4">
            {leagues.map((league) => {
              const membership = membershipByLeague.get(league.id)
              const rows = leaderboardByLeague.get(league.id) ?? []
              const isOwner = membership?.role === 'owner'

              return (
                <div key={league.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{league.name}</p>
                      <p className="text-xs text-muted-foreground">Code: {league.league_code} · Role: {membership?.role ?? 'member'}</p>
                    </div>
                    {!isOwner ? (
                      <button
                        disabled={busy !== null}
                        onClick={() => void handleLeave(league.id)}
                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                      >
                        {busy === 'leave' ? 'Leaving...' : 'Leave'}
                      </button>
                    ) : (
                      <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Owner</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No ranked members yet.</p>
                    ) : rows.map((row) => (
                      <div key={`${row.league_id}-${row.user_id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">#{row.rank}</span>
                        <span className="truncate font-medium">{row.username ?? 'User'}</span>
                        <span className="font-semibold text-primary">{formatFiqCompact(row.total_account_value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
