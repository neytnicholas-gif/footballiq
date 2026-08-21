'use client'

import { track } from '@vercel/analytics'
import { ArrowRight, Check, Clipboard, LogIn, RefreshCw, Share2, Sparkles, Trophy, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import {
  assignMakeCallPlayer,
  assignmentIsComplete,
  MAKE_CALL_ACTIONS,
  makeCallPercentages,
  makeCallSampleLabel,
  makeCallShareText,
  makeCallVerdict,
  shuffleMakeCallPlayers,
  type MakeCallAction,
  type MakeCallAssignments,
  type MakeCallPlayer,
  type MakeCallSnapshot,
} from '@/lib/make-call'

const actionMeta: Record<MakeCallAction, { label: string; active: string; dot: string }> = {
  start: { label: 'START', active: 'border-emerald-300 bg-emerald-300 text-[#07131a]', dot: 'bg-emerald-300' },
  bench: { label: 'BENCH', active: 'border-amber-300 bg-amber-300 text-[#171008]', dot: 'bg-amber-300' },
  sell: { label: 'SELL', active: 'border-rose-300 bg-rose-300 text-[#19080d]', dot: 'bg-rose-300' },
}

function assignmentsFromSnapshot(snapshot: MakeCallSnapshot): MakeCallAssignments {
  return snapshot.vote ? {
    start: snapshot.vote.start_player_id,
    bench: snapshot.vote.bench_player_id,
    sell: snapshot.vote.sell_player_id,
  } : {}
}

function randomSeed() {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] ?? 1
}

export function StartBenchSellGame() {
  const { session, user, loading: authLoading, refreshProfile } = useAuth()
  const [snapshot, setSnapshot] = useState<MakeCallSnapshot | null>(null)
  const [assignments, setAssignments] = useState<MakeCallAssignments>({})
  const [orderedPlayers, setOrderedPlayers] = useState<MakeCallPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const viewedRef = useRef<string | null>(null)
  const accessToken = session?.access_token

  const requestHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken])

  const acceptSnapshot = useCallback((next: MakeCallSnapshot) => {
    setSnapshot(next)
    if (next.matchup) {
      setOrderedPlayers(shuffleMakeCallPlayers(next.matchup.players, randomSeed()))
      setAssignments(assignmentsFromSnapshot(next))
      if (viewedRef.current !== next.matchup.id) {
        viewedRef.current = next.matchup.id
        track('start_bench_sell_viewed', { matchup_id: next.matchup.id })
      }
    } else {
      setOrderedPlayers([])
      setAssignments({})
    }
    setEditing(false)
  }, [])

  const loadRound = useCallback(async (exclude?: string) => {
    setLoading(true)
    setError(null)
    try {
      const query = exclude ? `?exclude=${encodeURIComponent(exclude)}` : ''
      const response = await fetch(`/api/quizzes/start-bench-sell${query}`, {
        headers: requestHeaders,
        cache: 'no-store',
      })
      const body = await response.json() as MakeCallSnapshot & { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'The next call could not be loaded.')
      acceptSnapshot(body)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The next call could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [acceptSnapshot, requestHeaders])

  useEffect(() => {
    if (authLoading) return
    const loadTimer = window.setTimeout(() => void loadRound(), 0)
    return () => window.clearTimeout(loadTimer)
  }, [authLoading, loadRound])

  const makeAssignment = (action: MakeCallAction, player: MakeCallPlayer) => {
    if (snapshot?.results && !editing) return
    setAssignments((current) => assignMakeCallPlayer(current, action, player.id))
    setAnnouncement(`${player.display_name} assigned to ${action}.`)
    track('player_assignment_changed', {
      matchup_id: snapshot?.matchup?.id ?? 'unknown',
      player_id: player.id,
      action,
    })
  }

  const submit = async () => {
    if (!snapshot?.matchup || !assignmentIsComplete(assignments)) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/quizzes/start-bench-sell', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          matchupId: snapshot.matchup.id,
          start: assignments.start,
          bench: assignments.bench,
          sell: assignments.sell,
        }),
      })
      const body = await response.json() as MakeCallSnapshot & { error?: string }
      if (!response.ok) throw new Error(body.error ?? 'Your call could not be saved safely.')
      acceptSnapshot(body)
      track('start_bench_sell_submitted', { matchup_id: snapshot.matchup.id, signed_in: Boolean(user) })
      track('results_revealed', { matchup_id: snapshot.matchup.id, sample_size: body.results?.sample_size ?? 0 })
      if ((body.xp_awarded_now ?? 0) > 0) {
        track('xp_awarded', { matchup_id: snapshot.matchup.id, xp: body.xp_awarded_now ?? 0 })
        await refreshProfile()
      }
      setAnnouncement(`Call saved. Community results revealed.${body.xp_awarded_now ? ` You earned ${body.xp_awarded_now} XP.` : ''}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your call could not be saved safely.')
    } finally {
      setSubmitting(false)
    }
  }

  const share = async () => {
    if (!snapshot?.matchup) return
    const url = `${window.location.origin}/quizzes/start-bench-sell`
    const clipboardText = makeCallShareText(assignments, snapshot.matchup.players, url)
    const nativeText = makeCallShareText(assignments, snapshot.matchup.players, '')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Make the Call | Early Shout', text: nativeText, url })
        track('share_clicked', { matchup_id: snapshot.matchup.id, method: 'web-share' })
      }
      else {
        await navigator.clipboard.writeText(clipboardText)
        setShareStatus('Copied your call.')
        track('share_clicked', { matchup_id: snapshot.matchup.id, method: 'clipboard' })
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(clipboardText)
        setShareStatus('Copied your call.')
        track('share_clicked', { matchup_id: snapshot.matchup.id, method: 'clipboard-fallback' })
      } catch {
        setShareStatus('Sharing is not available on this browser.')
      }
    }
  }

  if (loading && !snapshot) return <LoadingState />
  if (error && !snapshot) return <ErrorState message={error} onRetry={() => void loadRound()} />
  if (!snapshot?.matchup) return <NoRoundState onRetry={() => void loadRound()} />

  const matchup = snapshot.matchup
  const resultsVisible = Boolean(snapshot.results) && !editing
  const percentages = snapshot.results ? makeCallPercentages(snapshot.results, matchup.players) : null
  const verdict = snapshot.results ? makeCallVerdict({ assignments, results: snapshot.results, players: matchup.players }) : null

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-700/80 bg-[#0a1524]/95 shadow-[0_34px_100px_-48px_rgba(52,211,153,.38)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,.13),transparent_27rem),radial-gradient(circle_at_92%_18%,rgba(96,165,250,.12),transparent_24rem)]" />
      <div className="relative p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[.25em] text-emerald-300">10-second football decision</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">{matchup.prompt}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Give each player one job. We hide the crowd until your call is locked in.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {orderedPlayers.map((player) => {
            const selectedAction = MAKE_CALL_ACTIONS.find((action) => assignments[action] === player.id)
            return (
              <article key={player.id} className={`relative overflow-hidden rounded-[1.45rem] border bg-slate-900/85 p-3 transition duration-200 sm:p-4 ${selectedAction ? 'border-white/35 shadow-[0_18px_50px_-28px_rgba(255,255,255,.45)]' : 'border-slate-700 hover:border-slate-500'}`}>
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 opacity-45" style={{ background: `linear-gradient(135deg, ${player.accent_from}, ${player.accent_to})` }} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full border border-white/15 bg-slate-950/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.16em] text-slate-200">{player.position_label}</span>
                    {selectedAction ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${actionMeta[selectedAction].active}`}>{actionMeta[selectedAction].label}</span> : null}
                  </div>
                  <div role="img" aria-label={`Illustrated player card placeholder for ${player.display_name}`} className="mx-auto mt-5 grid size-24 place-items-center rounded-[2rem] border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,.18),rgba(2,6,23,.82))] shadow-[0_18px_36px_-18px_rgba(0,0,0,.9)] sm:size-28">
                    <UserRound className="size-12 text-white/85" aria-hidden="true" />
                    <span className="sr-only">No licensed player photograph is used.</span>
                  </div>
                  <h3 className="mt-4 truncate text-center text-lg font-black text-white">{player.display_name}</h3>
                  <p className="mt-1 truncate text-center text-xs font-semibold text-slate-400">{player.club_name}</p>
                  <div aria-label={`Assign an action to ${player.display_name}`} className="mt-4 grid grid-cols-3 gap-1.5">
                    {MAKE_CALL_ACTIONS.map((action) => {
                      const active = assignments[action] === player.id
                      return <button key={action} type="button" aria-pressed={active} onClick={() => makeAssignment(action, player)} disabled={resultsVisible} className={`min-h-11 rounded-xl border px-1 text-[10px] font-black tracking-wide outline-none transition focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-default ${active ? actionMeta[action].active : 'border-slate-600 bg-slate-950/55 text-slate-300 hover:border-slate-400 hover:bg-slate-800'}`}>{active ? <Check className="mx-auto mb-0.5 size-3" aria-hidden="true" /> : null}{actionMeta[action].label}</button>
                    })}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        {error ? <div role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error} Your choices are still here.</div> : null}

        {!resultsVisible ? (
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/45 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <p className="text-center text-xs leading-5 text-slate-400 sm:text-left">{assignmentIsComplete(assignments) ? 'Your three choices are ready.' : `Choose ${3 - Object.keys(assignments).length} more ${3 - Object.keys(assignments).length === 1 ? 'action' : 'actions'}.`}</p>
            <button type="button" onClick={() => void submit()} disabled={!assignmentIsComplete(assignments) || submitting} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 text-sm font-black text-slate-950 shadow-[0_16px_38px_-18px_rgba(110,231,183,.8)] transition hover:-translate-y-0.5 hover:bg-emerald-200 focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45 sm:mt-0 sm:w-auto">
              {submitting ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{submitting ? 'Saving your call…' : editing ? 'Update my call' : 'Make the Call'}
            </button>
          </div>
        ) : snapshot.results && percentages && verdict ? (
          <ResultsPanel
            snapshot={snapshot}
            assignments={assignments}
            percentages={percentages}
            verdict={verdict}
            signedIn={Boolean(user)}
            shareStatus={shareStatus}
            onEdit={() => setEditing(true)}
            onShare={() => void share()}
            onAnother={() => { track('another_round_clicked', { matchup_id: matchup.id }); void loadRound(matchup.id) }}
          />
        ) : null}
      </div>
    </div>
  )
}

function ResultsPanel(props: {
  snapshot: MakeCallSnapshot
  assignments: MakeCallAssignments
  percentages: ReturnType<typeof makeCallPercentages>
  verdict: ReturnType<typeof makeCallVerdict>
  signedIn: boolean
  shareStatus: string | null
  onEdit: () => void
  onShare: () => void
  onAnother: () => void
}) {
  const { snapshot, assignments, percentages, verdict } = props
  const matchup = snapshot.matchup!
  const results = snapshot.results!
  const chosen = (action: MakeCallAction) => matchup.players.find((player) => player.id === assignments[action])!
  return (
    <section className="mt-6 border-t border-slate-700 pt-6" aria-labelledby="make-call-results-title">
      <div className="grid gap-4 lg:grid-cols-[.86fr_1.14fr]">
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-5">
          <div className="flex items-center gap-2 text-emerald-200"><Trophy className="size-5" aria-hidden="true" /><p className="text-xs font-black uppercase tracking-[.18em]">Your verdict</p></div>
          <h3 id="make-call-results-title" className="mt-3 text-2xl font-black text-white">{verdict.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{verdict.copy}</p>
          <div className="mt-4 grid gap-2 text-sm">
            {MAKE_CALL_ACTIONS.map((action) => <p key={action} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2"><span className="font-black text-white">{actionMeta[action].label}</span><span className="text-slate-300"> {chosen(action).short_name}</span><span className="float-right font-bold text-emerald-200">{percentages[action][chosen(action).id]}% agreed</span></p>)}
          </div>
          <p className="mt-4 text-sm font-bold text-white">{percentages.exact}% made your exact full call.</p>
          <p className="mt-1 text-xs text-slate-400">{makeCallSampleLabel(results.sample_size)}</p>
          {(snapshot.xp_awarded_now ?? 0) > 0 ? <p role="status" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-200">+{snapshot.xp_awarded_now} XP — first call on this matchup</p> : null}
          {!props.signedIn ? <Link href="/login" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-950/50 px-4 text-sm font-bold text-white hover:border-emerald-300/50"><LogIn className="size-4" aria-hidden="true" />Sign in to earn and save XP</Link> : snapshot.xp && snapshot.xp.daily_total >= snapshot.xp.daily_cap ? <p className="mt-4 text-xs font-semibold text-amber-200">You reached today’s 15 XP Make the Call limit. Keep playing for fun.</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/35 p-4 sm:p-5">
          <h3 className="text-lg font-black text-white">How every call split</h3>
          <p className="mt-1 text-xs text-slate-400">Each row is rounded to total exactly 100%.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {MAKE_CALL_ACTIONS.map((action) => <div key={action}><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${actionMeta[action].dot}`} /><h4 className="text-xs font-black tracking-[.12em] text-white">{actionMeta[action].label}</h4></div><div className="mt-2 grid gap-1.5">{matchup.players.slice().sort((a, b) => (percentages[action][b.id] ?? 0) - (percentages[action][a.id] ?? 0)).map((player) => <div key={player.id} className="rounded-lg border border-white/8 bg-white/[.035] px-2.5 py-2 text-xs"><span className="text-slate-300">{player.short_name}</span><strong className="float-right text-white">{percentages[action][player.id]}%</strong></div>)}</div></div>)}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={props.onAnother} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 hover:bg-emerald-200">Play another<ArrowRight className="size-4" aria-hidden="true" /></button>
        <button type="button" onClick={props.onShare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm font-bold text-white hover:border-slate-400"><Share2 className="size-4" aria-hidden="true" />Share your call</button>
        <button type="button" onClick={props.onEdit} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-300 hover:border-slate-500 hover:text-white">Change my call</button>
      </div>
      {props.shareStatus ? <p role="status" className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-200"><Clipboard className="size-3.5" aria-hidden="true" />{props.shareStatus}</p> : null}
    </section>
  )
}

function LoadingState() {
  return <div role="status" className="rounded-[1.75rem] border border-slate-700 bg-slate-900/70 p-8 text-center"><div className="mx-auto size-12 animate-pulse rounded-2xl bg-emerald-300/20" /><p className="mt-4 font-black text-white">Preparing the call…</p><p className="mt-1 text-sm text-slate-400">Keeping the community vote hidden.</p></div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-[1.75rem] border border-rose-300/25 bg-rose-300/10 p-8 text-center"><p className="font-black text-white">The call did not load.</p><p className="mt-2 text-sm text-rose-100">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950"><RefreshCw className="size-4" />Try again</button></div>
}

function NoRoundState({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-[1.75rem] border border-slate-700 bg-slate-900/70 p-8 text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">You are up to date</p><h2 className="mt-2 text-2xl font-black text-white">No other call is open yet.</h2><p className="mt-2 text-sm text-slate-400">New three-player decisions will appear here when they go live.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-bold text-white"><RefreshCw className="size-4" />Check again</button><Link href="/quizzes" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950">Explore games</Link></div></div>
}
