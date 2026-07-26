'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Flame, Gauge, Medal, Sparkles, Target, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { getRankProgress } from '@/lib/progression'
import { supabase, type Profile } from '@/lib/supabase'
import { SectionHeader, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import type { Database } from '@/lib/supabase/types'

type PublicProfile = Database['public']['Views']['public_leaderboard_profiles']['Row']

function formatDays(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
}

export default function PublicPlayerPage() {
  const params = useParams<{ username: string }>()
  const username = decodeURIComponent(params.username)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accuracy, setAccuracy] = useState<number | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      let resolved: PublicProfile | null = null

      const { data, error } = await supabase
        .from('public_leaderboard_profiles')
        .select('id,username,rating,xp,quizzes_completed,correct_answers,total_answers,perfect_quizzes,current_streak,longest_streak,created_at')
        .eq('username', username)
        .maybeSingle()

      resolved = (data as PublicProfile | null) ?? null

      if (error) {
        const fallback = await supabase
          .from('profiles')
          .select('id,username,rating,xp,quizzes_completed,correct_answers,total_answers,perfect_quizzes,current_streak,longest_streak,created_at')
          .eq('username', username)
          .maybeSingle()

        const fallbackData = fallback.data as (PublicProfile & { username: string | null }) | null
        resolved = fallbackData?.username ? (fallbackData as PublicProfile) : null
      }

      if (!active) return
      setProfile((resolved as PublicProfile | null) as Profile | null)

      if (resolved?.id) {
        const { data: results } = await supabase
          .from('quiz_results')
          .select('score,total')
          .eq('user_id', resolved.id)

        if (!active) return
        const totals = (results ?? []).reduce((accumulator, row) => {
          accumulator.correct += row.score
          accumulator.total += row.total
          return accumulator
        }, { correct: 0, total: 0 })
        setAccuracy(totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : null)
      }

      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [username])

  const rank = getRankProgress(profile?.xp ?? 0)
  const resolvedAccuracy = accuracy ?? (profile?.total_answers ? Math.round(profile.correct_answers / profile.total_answers * 100) : null)

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {loading ? <p className="text-muted-foreground">Loading player…</p> : !profile ? <SurfaceCard className="p-8"><h1 className="text-3xl font-black tracking-tight text-foreground">Player not found</h1><Link href="/leaderboard" className="mt-5 inline-block text-primary">Return to leaderboard →</Link></SurfaceCard> : <>
          <SurfaceCard className="overflow-hidden">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(54,206,163,.16),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(56,123,255,.12),transparent_42%)] p-8 sm:p-10">
              <StatusBadge label="Public FootballIQ profile" tone="good" />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl">{profile.username}</h1>
                  <p className="mt-3 text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card/90 px-6 py-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p>
                  <p className="mt-2 text-2xl font-black text-foreground">{rank.current.emoji} {rank.current.title}</p>
                </div>
              </div>
              <div className="mt-8">
                <div className="flex justify-between text-sm text-foreground"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank'}</span></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${rank.percent}%` }} /></div>
              </div>
            </div>
          </SurfaceCard>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Rating" value={profile.rating.toLocaleString()} />
            <StatCard label="Accuracy" value={resolvedAccuracy === null ? '—' : `${resolvedAccuracy}%`} hint={resolvedAccuracy === null ? 'No completed answers yet' : 'Derived from completed results'} />
            <StatCard label="Current streak" value={formatDays(profile.current_streak)} />
            <StatCard label="Longest streak" value={formatDays(profile.longest_streak)} />
            <StatCard label="Quizzes" value={profile.quizzes_completed.toLocaleString()} />
            <StatCard label="Perfect quizzes" value={profile.perfect_quizzes.toLocaleString()} />
          </div>

          <div className="mt-8">
            <SectionHeader eyebrow="Profile snapshot" title="What this player has actually built" copy="XP, rating, streaks and accuracy all roll up from completed FootballIQ runs." />
          </div>

          <Link href="/leaderboard" className="mt-8 inline-flex rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">← Back to leaderboard</Link>
        </>}
      </section>
    </main>
  )
}
