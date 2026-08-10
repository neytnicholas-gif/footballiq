'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'
import { academyExperiences, computeAcademyProgress, loadAcademyCompletions, type AcademyCompletion } from '@/lib/academy'
import { LoadingState, ProgressCard, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { supabase } from '@/lib/supabase'

function formatDays(value: number) {
  return `${value} day${value === 1 ? '' : 's'}`
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, membership, loading, signOut } = useAuth()
  const [academyLoading, setAcademyLoading] = useState(true)
  const [completions, setCompletions] = useState<AcademyCompletion[]>([])
  const [derivedAccuracy, setDerivedAccuracy] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  useEffect(() => {
    let active = true

    if (!user) return

    void (async () => {
      setAcademyLoading(true)
      const result = await loadAcademyCompletions()
      if (!active) return
      setCompletions(result.data)
      setAcademyLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    let active = true

    if (!user) return

    if (profile?.total_answers && profile.total_answers > 0) return

    void (async () => {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('score,total')
        .eq('user_id', user.id)

      if (!active || error) return
      const totals = (data ?? []).reduce((accumulator, row) => {
        accumulator.correct += row.score
        accumulator.total += row.total
        return accumulator
      }, { correct: 0, total: 0 })
      setDerivedAccuracy(totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : null)
    })()

    return () => {
      active = false
    }
  }, [profile?.correct_answers, profile?.total_answers, user])

  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = derivedAccuracy ?? (profile?.total_answers ? Math.round((profile.correct_answers / profile.total_answers) * 100) : null)
  const academy = computeAcademyProgress(completions)
  const advancedCompleted = completions.filter((item) => item.experience_key.includes('scout-room') || item.experience_key.includes('referee-debrief')).length

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {loading ? <LoadingState label="Loading profile…" /> : !profile?.username ? (
          <SurfaceCard className="p-8">
            <StatusBadge label="Profile setup" tone="warn" />
            <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">Finish your profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pick a name other players will see beside your scores.</p>
            <Link href="/username" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Choose username</Link>
          </SurfaceCard>
        ) : (
          <>
            <SurfaceCard className="overflow-hidden">
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(54,206,163,.16),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(56,123,255,.12),transparent_42%)] p-8 sm:p-10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <StatusBadge label="Player profile" tone="neutral" />
                    <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground sm:text-6xl">{profile.username}</h1>
                    <p className="mt-2 text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-card/90 px-6 py-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{rank.current.emoji} {rank.current.title}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <StatusBadge label="Quizzes and Academy free" tone="neutral" />
                  {membership.source === 'dev-local-override' ? <StatusBadge label="Local dev override" tone="warn" /> : null}
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-foreground"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank'}</span></div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${rank.percent}%` }} /></div>
                </div>
              </div>
            </SurfaceCard>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Rating" value={profile.rating.toLocaleString()} />
              <StatCard label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} hint={accuracy === null ? 'No completed answers yet' : 'Based on completed quiz results'} />
              <StatCard label="Current streak" value={formatDays(profile.current_streak)} />
              <StatCard label="Longest streak" value={formatDays(profile.longest_streak)} />
              <StatCard label="Quizzes completed" value={profile.quizzes_completed.toLocaleString()} />
              <StatCard label="Perfect quizzes" value={profile.perfect_quizzes.toLocaleString()} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <SurfaceCard className="p-6">
                <div className="flex items-center gap-2 text-primary"><BookOpen className="size-4" /><p className="text-xs font-semibold uppercase tracking-[0.22em]">Academy progress</p></div>
                {academyLoading ? <div className="mt-3"><LoadingState label="Loading Academy progress…" /></div> : (
                  <div className="mt-4 space-y-4">
                    <ProgressCard label="Scout Academy" value={`${academy.scout.completed}/${academy.scout.total}`} percent={academy.scout.percent} />
                    <ProgressCard label="Referee Academy" value={`${academy.referee.completed}/${academy.referee.total}`} percent={academy.referee.percent} />
                    <SurfaceCard className="bg-background/70 p-4">
                      <p className="text-sm font-semibold text-foreground">Completed advanced experiences</p>
                      <p className="mt-1 text-2xl font-black text-foreground">{advancedCompleted}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Scout Room and Referee Debrief completions saved on your profile.</p>
                    </SurfaceCard>
                    <Link href="/academy" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">Open Academy</Link>
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Progression overview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">What the profile already tells you</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>• XP, rating and streaks are live and persist across sessions</li>
                  <li>• Accuracy now falls back to completed result data if counters are empty</li>
                  <li>• Academy completions and advanced progress remain visible</li>
                  {academyExperiences.filter((item) => item.status !== 'available').slice(0, 2).map((item) => <li key={item.key}>• {item.title} · {item.status === 'coming-next' ? 'Coming next' : 'Planned later'}</li>)}
                </ul>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/username" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">Edit username</Link>
                  <button onClick={() => void signOut()} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/35 hover:bg-secondary/40">Log out</button>
                </div>
              </SurfaceCard>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
