'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Share2, Trash2, Users } from 'lucide-react'
import { createFriendLeague, deleteFriendLeague, joinFriendLeague, leaveFriendLeague } from '@/lib/market/client'
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
  const [scoreMode, setScoreMode] = useState<'wealth' | 'weekly_gain' | 'realised_profit'>('wealth')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState<'create' | 'join' | 'leave' | 'delete' | null>(null)
  const [deleteIntent, setDeleteIntent] = useState<MarketFriendLeague | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const deleteDialogRef = useRef<HTMLElement>(null)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!deleteIntent) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelDeleteRef.current?.focus()
    const closeDialog = () => {
      setDeleteIntent(null)
      window.setTimeout(() => deleteTriggerRef.current?.focus(), 0)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && busy !== 'delete') closeDialog()
      if (event.key !== 'Tab' || !deleteDialogRef.current) return
      const focusable = Array.from(deleteDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape) }
  }, [busy, deleteIntent])

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('join')?.trim().toUpperCase()
    if (!code) return
    const timeout = window.setTimeout(() => setJoinCode(code), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  async function copyLeagueCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setNotice(`League code ${code} copied.`)
      window.setTimeout(() => setCopiedCode((current) => current === code ? '' : current), 2000)
    } catch {
      setError(`Could not copy automatically. Select this code: ${code}`)
    }
  }

  async function shareLeague(league: MarketFriendLeague) {
    const url = `${window.location.origin}/market/leagues?join=${encodeURIComponent(league.league_code)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join ${league.name} on Early Shout`, text: `Use code ${league.league_code} to join my friends league.`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopiedCode(league.league_code)
      setNotice('Invite link copied. Send it to your friends.')
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      setError(`Could not share automatically. Copy this link: ${url}`)
    }
  }

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
    const { data, error: createError } = await createFriendLeague(createName, scoreMode)
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

  async function handleDelete() {
    if (!deleteIntent) return
    setBusy('delete')
    setError('')
    setNotice('')
    const leagueName = deleteIntent.name
    const { error: deleteError } = await deleteFriendLeague(deleteIntent.id)
    if (deleteError) {
      setError(deleteError.message)
      setBusy(null)
      return
    }
    setDeleteIntent(null)
    setNotice(`${leagueName} was deleted. Player portfolios were not affected.`)
    await onRefresh()
    setBusy(null)
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-900/15 bg-[radial-gradient(circle_at_90%_10%,rgba(250,204,21,.20),transparent_30%),linear-gradient(135deg,#062c24,#0d4b3d)] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-200"><Users className="size-5" /></span>
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Your private league room</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/75">
              Create a private league, choose what wins, then share one code with your friends.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold">Create a league</p>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="League name"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-base text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:text-sm"
            />
            <fieldset className="mt-3">
              <legend className="text-xs font-bold uppercase tracking-[.12em] text-emerald-100/70">What wins?</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([['wealth','Team value'],['weekly_gain','Weekly rise'],['realised_profit','Sale profit']] as const).map(([key,label]) => <button key={key} type="button" aria-pressed={scoreMode===key} onClick={()=>setScoreMode(key)} className={`min-h-10 rounded-lg border px-2 text-xs font-bold ${scoreMode===key?'border-amber-200 bg-amber-200 text-emerald-950':'border-white/15 bg-white/5 text-emerald-50'}`}>{label}</button>)}
              </div>
            </fieldset>
            <button
              disabled={busy !== null || createName.trim().length < 3}
              onClick={() => void handleCreate()}
              className="mt-3 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy === 'create' ? 'Creating...' : 'Create league'}
            </button>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold">Join by code</p>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Example: A1B2C3D4"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-base uppercase text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:text-sm"
            />
            <button
              disabled={busy !== null || joinCode.trim().length < 6}
              onClick={() => void handleJoin()}
              className="mt-3 min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
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
                      <p className="mt-1 text-xs text-muted-foreground">Winner: {league.score_mode === 'weekly_gain' ? 'biggest rise this week' : league.score_mode === 'realised_profit' ? 'most profit from sales' : 'highest total team value'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Code: <strong className="text-foreground">{league.league_code}</strong> · Role: {membership?.role ?? 'member'}</span><button type="button" onClick={() => void copyLeagueCode(league.league_code)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2 py-1 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="sr-only">Copy league code </span>{copiedCode === league.league_code ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copiedCode === league.league_code ? 'Copied' : 'Copy code'}</button><button type="button" onClick={() => void shareLeague(league)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2 py-1 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Share2 className="size-3.5"/>Share invite</button></div>
                    </div>
                    {!isOwner ? (
                      <button
                        disabled={busy !== null}
                        onClick={() => void handleLeave(league.id)}
                        className="min-h-11 rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        {busy === 'leave' ? 'Leaving...' : 'Leave'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Owner</span>
                        <button
                          disabled={busy !== null}
                          ref={(node) => { if (deleteIntent?.id === league.id) deleteTriggerRef.current = node }}
                          onClick={(event) => { deleteTriggerRef.current = event.currentTarget; setDeleteIntent(league) }}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No ranked members yet.</p>
                    ) : rows.map((row) => (
                      <div key={`${row.league_id}-${row.user_id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                        <span className="text-xs font-semibold text-muted-foreground">#{row.rank}</span>
                        <span className="truncate font-medium">{row.username ?? 'User'}</span>
                        <span className="font-semibold text-primary">{formatFiqCompact(row.score_value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {deleteIntent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation">
          <section
            ref={deleteDialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-league-title"
            aria-describedby="delete-league-description"
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 id="delete-league-title" className="text-xl font-black">Delete {deleteIntent.name}?</h2>
            <p id="delete-league-description" className="mt-2 text-sm leading-6 text-muted-foreground">
              This permanently removes the league and its memberships. Player portfolios, balances, and trades are not affected.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button ref={cancelDeleteRef} type="button" disabled={busy === 'delete'} onClick={() => { setDeleteIntent(null); window.setTimeout(() => deleteTriggerRef.current?.focus(), 0) }} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={busy === 'delete'} onClick={() => void handleDelete()} className="min-h-11 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:opacity-50">
                {busy === 'delete' ? 'Deleting...' : 'Delete league'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
