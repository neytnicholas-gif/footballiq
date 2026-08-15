'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Clock3, Coins, Gauge, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Swords, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { cancelMarketArenaQueue, joinMarketArena, loadMyMarketArena } from '@/lib/market/client'
import { EMPTY_MARKET_ARENA, type MarketArenaState } from '@/lib/market/arena'

export function MarketArena() {
  const { user } = useAuth()
  const [arena, setArena] = useState<MarketArenaState>(EMPTY_MARKET_ARENA)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const result = await loadMyMarketArena()
    setArena(result.data)
    setError(result.error ? friendlyArenaError(result.error.message) : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timer)
  }, [reload, user])

  async function join() {
    setBusy(true); setMessage(''); setError('')
    const result = await joinMarketArena()
    if (result.error) setError(friendlyArenaError(result.error.message))
    else setMessage(result.data?.matched ? 'Opponent found. Your gameweek duel is live.' : 'You are in the queue. We will match you as soon as a suitable player joins.')
    await reload()
    setBusy(false)
  }

  async function cancel() {
    setBusy(true); setMessage(''); setError('')
    const result = await cancelMarketArenaQueue()
    if (result.error) setError(friendlyArenaError(result.error.message))
    else setMessage('You left the matchmaking queue. Nothing was spent.')
    await reload()
    setBusy(false)
  }

  if (!user) return <SignedOutArena />

  const activeMatch = arena.matches.find((match) => match.status === 'pending') ?? null

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-emerald-900/15 bg-[radial-gradient(circle_at_80%_10%,rgba(250,204,21,.22),transparent_33%),linear-gradient(135deg,#071d18,#123b31)] p-7 text-white shadow-xl sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.24em] text-amber-300">Gameweek Arena</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Your XI against theirs.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/80">Get matched with another real player. When the gameweek ends, the squad with the better percentage price movement wins.</p></div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur"><p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Skill rating</p><p className="mt-2 text-4xl font-black">{arena.profile.skill_rating}</p><p className="mt-1 text-xs text-emerald-100/70">Matchmaking starts near your level</p></div>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><DarkMetric label="Played" value={arena.profile.matches_played}/><DarkMetric label="Wins" value={arena.profile.wins}/><DarkMetric label="Draws" value={arena.profile.draws}/><DarkMetric label="Losses" value={arena.profile.losses}/><DarkMetric label="Win streak" value={arena.profile.current_streak}/><DarkMetric label="Best streak" value={arena.profile.best_streak}/></div>
    </section>

    {message ? <p role="status" className="rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">{message}</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p> : null}

    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Find a match</p><h2 className="mt-2 text-3xl font-black">Ready for the next gameweek?</h2>
        <div className="mt-5 space-y-3"><Requirement done={arena.has_pass} title="Own the permanent Arena Pass" copy="Unlock it once in the Clubhouse reward shop."/><Requirement done={arena.has_full_xi} title="Have a complete starting XI" copy="A fair duel needs all 11 roster places filled."/><Requirement done={!activeMatch} title="No other duel in progress" copy="One live matchup at a time keeps results clear."/></div>
        {loading ? <p className="mt-5 text-sm text-muted-foreground">Checking your Arena status…</p> : arena.queue ? <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-50 p-5"><p className="flex items-center gap-2 font-black text-amber-950"><Clock3 className="size-5"/>Searching for an opponent</p><p className="mt-1 text-sm text-amber-900/75">Queued for {arena.queue.gameweek_label}. The search widens gradually if nobody near your rating is available.</p><button disabled={busy} onClick={()=>void cancel()} className="mt-4 min-h-11 rounded-xl border border-amber-700/25 bg-white px-4 py-2 text-sm font-bold text-amber-950 disabled:opacity-50">Leave queue</button></div>
          : activeMatch ? <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-5"><p className="flex items-center gap-2 font-black text-primary"><Swords className="size-5"/>Duel live against {activeMatch.opponent_name}</p><p className="mt-1 text-sm text-muted-foreground">{activeMatch.gameweek_label} decides it. Come back after The Reveal to see the result.</p></div>
          : <button disabled={busy||!arena.has_pass||!arena.has_full_xi} onClick={()=>void join()} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-black text-primary-foreground disabled:opacity-45"><Users className="size-5"/>{busy?'Checking…':'Find my opponent'}</button>}
        {!arena.has_pass ? <p className="mt-4 text-sm"><Link href="/market/rewards#reward-shop" className="font-bold text-primary underline underline-offset-4">Go to the Clubhouse shop</Link> to work towards your Arena Pass.</p> : null}
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,.18),transparent_45%),linear-gradient(145deg,#ffffff,#f5f7ff)] p-6 sm:p-8"><ShieldCheck className="size-8 text-indigo-700"/><h2 className="mt-4 text-2xl font-black">Clear rules. No surprises.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The database uses these exact rules for every player.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Rule icon={<Gauge className="size-5"/>} title="Closest skill first" copy="The search starts within 200 rating points. It widens by 25 each minute and stops at 500."/><Rule icon={<Trophy className="size-5"/>} title="One fair score" copy="Your XI’s percentage value change is compared with your opponent’s. The higher return wins."/><Rule icon={<Coins className="size-5"/>} title="Credits for everyone" copy="Win: 75. Draw: 35 each. Loss: 15. Your VX and existing credits are never at risk."/><Rule icon={<Sparkles className="size-5"/>} title="Skill moves after results" copy="A result can move your skill rating by up to 32 points. Beating a stronger opponent moves it more."/></div></div>
    </section>

    <section className="rounded-[2rem] border border-amber-300/70 bg-[linear-gradient(135deg,#fffbeb,#ffffff)] p-6 sm:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[.22em] text-amber-800">When does it start?</p><h2 className="mt-2 text-2xl font-black text-amber-950">Queue during an open gameweek.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-amber-950/75">Join once your XI is full. The matchup locks to that gameweek, then settles after both players receive The Reveal. You can prepare before the first league matches and come back after the final result is processed.</p></div><Link href="/market/leagues" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-700/20 bg-white px-5 py-2.5 text-sm font-black text-amber-950">Create a friends league</Link></div></section>

    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Match history</p><h2 className="mt-2 text-3xl font-black">Your Arena story</h2></div><button disabled={busy} onClick={()=>void reload()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"><RefreshCw className="size-4"/>Refresh</button></div>
      {!arena.matches.length ? <p className="mt-5 rounded-xl bg-secondary/50 p-5 text-sm text-muted-foreground">No Arena matches yet. Complete your XI, unlock the pass and become somebody’s first opponent.</p> : <div className="mt-5 grid gap-3">{arena.matches.map((match)=><article key={match.id} className="grid gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-black">vs {match.opponent_name}</p><p className="mt-1 text-xs text-muted-foreground">{match.gameweek_label} · rating {match.rating_before}</p></div><div className="sm:text-right"><ResultPill status={match.status} won={match.won} draw={match.draw}/>{match.status==='completed'?<p className="mt-2 text-xs text-muted-foreground">You {formatPct(match.my_return_pct)} · Opponent {formatPct(match.opponent_return_pct)}</p>:null}</div></article>)}</div>}
    </section>
  </div>
}

function SignedOutArena(){return <section className="rounded-[2rem] border border-border bg-card p-7 sm:p-10"><Swords className="size-10 text-primary"/><h1 className="mt-4 text-4xl font-black">Gameweek Arena</h1><p className="mt-3 max-w-2xl text-muted-foreground">Sign in, build a full XI and unlock the Arena Pass to face another real player.</p><div className="mt-6 flex gap-3"><Link href="/login" className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Sign in</Link><Link href="/market/players" className="rounded-xl border border-border px-5 py-3 font-bold">Build a team</Link></div></section>}
function Requirement({done,title,copy}:{done:boolean;title:string;copy:string}){return <div className="flex items-start gap-3 rounded-xl border border-border bg-background/70 p-4"><span className={`mt-0.5 rounded-full p-1 ${done?'bg-emerald-600 text-white':'bg-secondary text-muted-foreground'}`}>{done?<Check className="size-4"/>:<LockKeyhole className="size-4"/>}</span><div><p className="font-bold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{copy}</p></div></div>}
function Rule({icon,title,copy}:{icon:ReactNode;title:string;copy:string}){return <div className="rounded-2xl border border-indigo-200/80 bg-white/80 p-4"><span className="grid size-10 place-items-center rounded-xl bg-indigo-100 text-indigo-800">{icon}</span><p className="mt-3 font-black text-indigo-950">{title}</p><p className="mt-1 text-xs leading-5 text-indigo-950/70">{copy}</p></div>}
function DarkMetric({label,value}:{label:string;value:number}){return <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs text-emerald-50/65">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}
function ResultPill({status,won,draw}:{status:string;won:boolean|null;draw:boolean}){const label=status==='pending'?'Live':draw?'Draw':won?'Win':'Loss';const tone=status==='pending'?'bg-sky-100 text-sky-800':draw?'bg-amber-100 text-amber-800':won?'bg-emerald-100 text-emerald-800':'bg-rose-100 text-rose-800';return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tone}`}>{label}</span>}
function formatPct(value:number|null){return value===null?'Waiting':`${value>=0?'+':''}${value.toFixed(2)}%`}
function friendlyArenaError(message:string){if(/ARENA_PASS_REQUIRED/i.test(message))return 'Unlock the Arena Pass in the Clubhouse first.';if(/FULL_XI_REQUIRED/i.test(message))return 'Fill all 11 starting places before entering the Arena.';if(/MATCH_ALREADY_ACTIVE/i.test(message))return 'You already have a duel waiting for this gameweek.';if(/NO_OPEN_GAMEWEEK/i.test(message))return 'Matchmaking opens when the next gameweek opens.';if(/timeout|temporarily busy/i.test(message))return 'The Arena is busy. Nothing changed—please try once more.';return 'The Arena could not complete that action. Nothing was spent.'}
