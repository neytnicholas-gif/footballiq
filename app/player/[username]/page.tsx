'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Flame, Gauge, Medal, Sparkles, Target, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { getRankProgress } from '@/lib/progression'
import { supabase, type Profile } from '@/lib/supabase'

export default function PublicPlayerPage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modeStats, setModeStats] = useState<Array<{ mode: string; rating: number; quizzes_completed: number }>>([])

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error: profileError } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
      if (active) {
        if (profileError) setError(profileError.message)
        setProfile((data as Profile | null) ?? null)
        setLoading(false)
      }

      if (!data || !active) return
      const { data: categoryData } = await supabase
        .from('mode_stats')
        .select('mode,rating,quizzes_completed')
        .eq('user_id', (data as Profile).id)
        .order('rating', { ascending: false })
      if (active) setModeStats((categoryData as Array<{ mode: string; rating: number; quizzes_completed: number }>) ?? [])
    }
    void load()
    return () => { active = false }
  }, [username])

  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = profile?.total_answers ? Math.round(profile.correct_answers / profile.total_answers * 100) : 0

  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    {loading ? <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">Loading player profile…</p> : error ? <div className="rounded-3xl border border-border bg-card p-8"><h1 className="text-3xl font-bold">Could not load player</h1><p className="mt-3 text-sm text-muted-foreground">{error}</p><Link href="/leaderboard" className="mt-5 inline-block text-primary">Return to leaderboard →</Link></div> : !profile ? <div className="rounded-3xl border border-border bg-card p-8"><h1 className="text-3xl font-bold">Player not found</h1><Link href="/leaderboard" className="mt-5 inline-block text-primary">Return to leaderboard →</Link></div> : <>
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card"><div className="bg-[radial-gradient(circle_at_top_left,var(--primary),transparent_55%)] p-8 sm:p-12"><p className="text-xs font-semibold uppercase tracking-[.28em] text-primary">Public FootballIQ profile</p><div className="mt-4 flex flex-wrap items-end justify-between gap-6"><div><h1 className="text-4xl font-black sm:text-6xl">{profile.username}</h1><p className="mt-3 text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p></div><div className="rounded-3xl border border-primary/25 bg-background/75 px-6 py-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p><p className="mt-2 text-2xl font-bold">{rank.current.emoji} {rank.current.title}</p></div></div><div className="mt-8"><div className="flex justify-between text-sm"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank'}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:`${rank.percent}%`}}/></div></div></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Stat icon={<Gauge className="size-5"/>} label="Rating" value={profile.rating.toLocaleString()}/><Stat icon={<Target className="size-5"/>} label="Accuracy" value={`${accuracy}%`}/><Stat icon={<Flame className="size-5"/>} label="Current streak" value={`${profile.current_streak} days`}/><Stat icon={<Trophy className="size-5"/>} label="Longest streak" value={`${profile.longest_streak} days`}/><Stat icon={<Sparkles className="size-5"/>} label="Quizzes" value={profile.quizzes_completed.toLocaleString()}/><Stat icon={<Medal className="size-5"/>} label="Perfect quizzes" value={profile.perfect_quizzes.toLocaleString()}/></div>
      <div className="mt-6 rounded-3xl border border-border bg-card p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Category performance</p>{modeStats.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No category stats available.</p> : <div className="mt-3 space-y-2">{modeStats.slice(0, 5).map((item) => <div key={item.mode} className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-3 py-2 text-sm"><span className="capitalize">{item.mode.replaceAll('-', ' ')}</span><span className="text-muted-foreground">{item.rating} rating • {item.quizzes_completed} quizzes</span></div>)}</div>}</div>
      <Link href="/leaderboard" className="mt-8 inline-block rounded-xl border border-border px-5 py-3 font-semibold">← Back to leaderboard</Link>
    </>}
  </section></main>
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p></div><p className="mt-4 text-3xl font-bold">{value}</p></div> }
