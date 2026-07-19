'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Crown, Flame, Medal, RefreshCw, Trophy } from 'lucide-react'
import { supabase, type Profile } from '@/lib/supabase'
import { formatLeaderboardValue, leaderboardModes, seasonMeta, type RankedPlayer } from '@/lib/competitive'

type Board = 'overall' | 'daily' | 'weekly' | 'monthly' | 'season' | string
type ModeStat = { user_id: string; mode: string; rating: number; xp: number; quizzes_completed: number; correct_answers: number; total_answers: number }
type QuizResult = { user_id: string; score: number; total: number; xp_earned: number; completed_at: string }
type SeasonStat = { user_id: string; season_id: string; rating: number; xp: number; quizzes_completed: number; correct_answers: number; total_answers: number }

const periodBoards = [
  { id: 'daily', label: 'Today', emoji: '☀️' },
  { id: 'weekly', label: 'This week', emoji: '📅' },
  { id: 'monthly', label: 'This month', emoji: '🗓️' },
  { id: 'season', label: 'Season', emoji: '👑' },
]

export function CompetitiveLeaderboard({ initialBoard = 'overall' }: { initialBoard?: string }) {
  const validBoards = new Set(['overall', 'daily', 'weekly', 'monthly', 'season', ...leaderboardModes.map((mode) => mode.id)])
  const [board, setBoard] = useState<Board>(validBoards.has(initialBoard) ? initialBoard : 'overall')
  const [players, setPlayers] = useState<RankedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const season = useMemo(() => seasonMeta(), [])

  useEffect(() => { void loadBoard(board) }, [board])

  async function usernamesFor(ids: string[]) {
    if (!ids.length) return new Map<string, string>()
    const { data } = await supabase.from('profiles').select('id,username').in('id', ids)
    return new Map((data ?? []).map((profile) => [profile.id as string, (profile.username as string | null) ?? 'Anonymous']))
  }

  async function loadBoard(selected: Board) {
    setLoading(true)
    setError('')
    try {
      if (selected === 'overall') {
        const { data, error: queryError } = await supabase.from('profiles').select('*').not('username', 'is', null).order('xp', { ascending: false }).limit(100)
        if (queryError) throw queryError
        setPlayers(((data as Profile[]) ?? []).map((profile) => ({
          id: profile.id,
          username: profile.username ?? 'Anonymous',
          value: profile.xp,
          secondary: `${profile.quizzes_completed} quizzes · ${profile.rating} overall rating`,
          accuracy: profile.total_answers ? Math.round(profile.correct_answers / profile.total_answers * 100) : 0,
          quizzes: profile.quizzes_completed,
        })))
      } else if (selected === 'daily' || selected === 'weekly' || selected === 'monthly') {
        const now = new Date()
        const start = new Date(now)
        if (selected === 'daily') start.setHours(0, 0, 0, 0)
        if (selected === 'weekly') { const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0) }
        if (selected === 'monthly') { start.setDate(1); start.setHours(0, 0, 0, 0) }
        const { data, error: queryError } = await supabase.from('quiz_results').select('user_id,score,total,xp_earned,completed_at').gte('completed_at', start.toISOString()).limit(2000)
        if (queryError) throw queryError
        const totals = new Map<string, { xp: number; correct: number; total: number; quizzes: number }>()
        for (const result of (data as QuizResult[]) ?? []) {
          const current = totals.get(result.user_id) ?? { xp: 0, correct: 0, total: 0, quizzes: 0 }
          current.xp += result.xp_earned
          current.correct += result.score
          current.total += result.total
          current.quizzes += 1
          totals.set(result.user_id, current)
        }
        const names = await usernamesFor([...totals.keys()])
        setPlayers([...totals.entries()].map(([id, stat]) => ({
          id,
          username: names.get(id) ?? 'Anonymous',
          value: stat.xp,
          secondary: `${stat.quizzes} games · ${stat.total ? Math.round(stat.correct / stat.total * 100) : 0}% accuracy`,
          accuracy: stat.total ? Math.round(stat.correct / stat.total * 100) : 0,
          quizzes: stat.quizzes,
        })).sort((a, b) => b.value - a.value || (b.accuracy ?? 0) - (a.accuracy ?? 0)).slice(0, 100))
      } else if (selected === 'season') {
        const { data, error: queryError } = await supabase.from('season_stats').select('*').eq('season_id', season.id).order('rating', { ascending: false }).limit(100)
        if (queryError) throw queryError
        const rows = (data as SeasonStat[]) ?? []
        const names = await usernamesFor(rows.map((row) => row.user_id))
        setPlayers(rows.map((row) => ({
          id: row.user_id,
          username: names.get(row.user_id) ?? 'Anonymous',
          value: row.rating,
          secondary: `${row.xp.toLocaleString()} season XP · ${row.quizzes_completed} games`,
          accuracy: row.total_answers ? Math.round(row.correct_answers / row.total_answers * 100) : 0,
          quizzes: row.quizzes_completed,
        })))
      } else {
        const { data, error: queryError } = await supabase.from('mode_stats').select('*').eq('mode', selected).order('rating', { ascending: false }).limit(100)
        if (queryError) throw queryError
        const rows = (data as ModeStat[]) ?? []
        const names = await usernamesFor(rows.map((row) => row.user_id))
        setPlayers(rows.map((row) => ({
          id: row.user_id,
          username: names.get(row.user_id) ?? 'Anonymous',
          value: row.rating,
          secondary: `${row.xp.toLocaleString()} XP · ${row.quizzes_completed} games`,
          accuracy: row.total_answers ? Math.round(row.correct_answers / row.total_answers * 100) : 0,
          quizzes: row.quizzes_completed,
        })))
      }
    } catch (caught) {
      setPlayers([])
      setError(caught instanceof Error ? caught.message : 'Could not load this leaderboard.')
    } finally {
      setLoading(false)
    }
  }

  const activeLabel = leaderboardModes.find((mode) => mode.id === board)?.label ?? periodBoards.find((item) => item.id === board)?.label ?? 'Leaderboard'

  return <div>
    <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Competitive hub</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">More ways to become #1</h1><p className="mt-3 max-w-2xl text-muted-foreground">Every football brain has a speciality. Climb overall, dominate one game mode, or win a fresh weekly race.</p></div>
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-5 py-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{season.label}</p><p className="mt-1 font-bold text-primary">{season.daysLeft} days remaining</p></div>
      </div>
    </div>

    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2"><Trophy className="size-5 text-primary"/><h2 className="text-xl font-bold">Career leaderboards</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leaderboardModes.map((mode) => <button key={mode.id} onClick={() => setBoard(mode.id)} className={`rounded-2xl border p-5 text-left transition ${board === mode.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}><div className="flex items-start justify-between gap-3"><span className="text-2xl">{mode.emoji}</span><ChevronRight className="size-4 text-muted-foreground"/></div><p className="mt-4 font-bold">{mode.label}</p><p className="mt-1 text-sm text-muted-foreground">{mode.description}</p></button>)}
      </div>
    </section>

    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2"><CalendarDays className="size-5 text-primary"/><h2 className="text-xl font-bold">Fresh-start leaderboards</h2></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{periodBoards.map((item) => <button key={item.id} onClick={() => setBoard(item.id)} className={`rounded-2xl border p-4 text-left ${board === item.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}><span className="text-xl">{item.emoji}</span><p className="mt-2 font-semibold">{item.label}</p></button>)}</div>
    </section>

    <section className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Live standings</p><h2 className="mt-1 text-2xl font-bold">{activeLabel}</h2></div><button onClick={() => void loadBoard(board)} className="rounded-xl border border-border p-3" aria-label="Refresh"><RefreshCw className="size-4"/></button></div>
      {loading ? <p className="p-8 text-muted-foreground">Loading the table…</p> : error ? <div className="p-8"><p className="font-semibold">Leaderboard setup required</p><p className="mt-2 text-sm text-muted-foreground">{error}</p><p className="mt-3 text-sm text-primary">Run the included competitive-platform SQL in Supabase, then refresh.</p></div> : players.length === 0 ? <p className="p-8 text-muted-foreground">No results on this board yet. The first player can take the top spot.</p> : <div>{players.map((player, index) => <Link href={`/player/${encodeURIComponent(player.username)}`} key={`${player.id}-${index}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-border p-4 transition hover:bg-secondary/30 last:border-0 sm:grid-cols-[60px_1fr_auto_auto] sm:p-5"><Rank rank={index + 1}/><div className="min-w-0"><p className="truncate font-bold">{player.username}</p><p className="truncate text-xs text-muted-foreground">{player.secondary}</p></div><div className="hidden text-right sm:block"><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-semibold">{player.accuracy ?? 0}%</p></div><div className="text-right"><p className="font-bold text-primary">{formatLeaderboardValue(player.value, board)}</p><p className="text-xs text-muted-foreground">View profile</p></div></Link>)}</div>}
    </section>
  </div>
}

function Rank({ rank }: { rank: number }) {
  if (rank === 1) return <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Crown className="size-5"/></div>
  if (rank === 2) return <div className="flex size-10 items-center justify-center rounded-xl bg-secondary"><Medal className="size-5"/></div>
  if (rank === 3) return <div className="flex size-10 items-center justify-center rounded-xl bg-secondary"><Flame className="size-5"/></div>
  return <span className="pl-3 text-sm font-semibold text-muted-foreground">#{rank}</span>
}
