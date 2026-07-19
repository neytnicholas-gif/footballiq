'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, Gauge, Medal, Sparkles, Target, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'
import { supabase } from '@/lib/supabase'

type ModeStat = {
  mode: string
  rating: number
  quizzes_completed: number
  xp: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()
  const [modeStats, setModeStats] = useState<ModeStat[]>([])

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const { data } = await supabase
        .from('mode_stats')
        .select('mode,rating,quizzes_completed,xp')
        .eq('user_id', user.id)
        .order('rating', { ascending: false })
      setModeStats((data as ModeStat[]) ?? [])
    })()
  }, [user])

  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = profile?.total_answers ? Math.round((profile.correct_answers / profile.total_answers) * 100) : 0
  const achievements = useMemo(() => {
    if (!profile) return []
    return [
      { title: 'First Steps', unlocked: profile.quizzes_completed >= 1, requirement: 'Complete 1 quiz' },
      { title: 'On Fire', unlocked: profile.longest_streak >= 7, requirement: 'Reach a 7-day streak' },
      { title: 'Centurion', unlocked: profile.correct_answers >= 100, requirement: '100 correct answers' },
      { title: 'Perfectionist', unlocked: profile.perfect_quizzes >= 5, requirement: '5 perfect quizzes' },
      { title: 'Elite Accuracy', unlocked: accuracy >= 80 && profile.total_answers >= 25, requirement: '80% accuracy (25+ answers)' },
    ]
  }, [profile, accuracy])

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {loading ? <p>Loading…</p> : !profile?.username ? (
          <div className="rounded-3xl border border-border bg-card p-8"><h1 className="text-3xl font-semibold">Finish your profile</h1><Link href="/username" className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground">Choose username</Link></div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
              <div className="bg-[radial-gradient(circle_at_top_left,var(--primary),transparent_55%)] p-8 sm:p-12">
                <p className="text-xs font-semibold uppercase tracking-[.28em] text-primary">FootballIQ identity</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                  <div><h1 className="text-4xl font-bold sm:text-6xl">{profile.username}</h1><p className="mt-3 text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p></div>
                  <div className="rounded-3xl border border-primary/25 bg-background/75 px-6 py-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Current rank</p><p className="mt-2 text-2xl font-bold">{rank.current.emoji} {rank.current.title}</p></div>
                </div>
                <div className="mt-8"><div className="flex justify-between text-sm"><span>{profile.xp.toLocaleString()} XP</span><span>{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank'}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${rank.percent}%` }} /></div></div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat icon={<Gauge className="size-5" />} label="Rating" value={profile.rating.toLocaleString()} />
              <Stat icon={<Target className="size-5" />} label="Accuracy" value={`${accuracy}%`} />
              <Stat icon={<Flame className="size-5" />} label="Current streak" value={`${profile.current_streak} days`} />
              <Stat icon={<Trophy className="size-5" />} label="Longest streak" value={`${profile.longest_streak} days`} />
              <Stat icon={<Sparkles className="size-5" />} label="Quizzes completed" value={profile.quizzes_completed.toLocaleString()} />
              <Stat icon={<Medal className="size-5" />} label="Perfect quizzes" value={profile.perfect_quizzes.toLocaleString()} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-7"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Career totals</p><div className="mt-5 grid grid-cols-2 gap-3"><Mini label="Correct answers" value={profile.correct_answers} /><Mini label="Total answers" value={profile.total_answers} /><Mini label="XP" value={profile.xp} /><Mini label="Level" value={Math.max(1, Math.floor(profile.xp / 250) + 1)} /></div></div>
              <div className="rounded-3xl border border-border bg-card p-7"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Next mission</p><h2 className="mt-3 text-2xl font-bold">Keep climbing</h2><p className="mt-2 text-muted-foreground">Play today’s quick challenge, protect your streak and chase your next title.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/quizzes/football-duels" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Play quick duel</Link><Link href="/daily" className="rounded-xl border border-border px-5 py-3 font-semibold">Daily challenge</Link></div></div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Category performance</p>
                {modeStats.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No mode-specific results saved yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {modeStats.slice(0, 6).map((row) => (
                      <div key={row.mode} className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-3 py-2 text-sm">
                        <span className="capitalize">{row.mode.replaceAll('-', ' ')}</span>
                        <span className="text-muted-foreground">{row.rating} rating • {row.quizzes_completed} quizzes</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card p-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Achievements</p>
                <div className="mt-4 space-y-2">
                  {achievements.map((achievement) => (
                    <div key={achievement.title} className={`rounded-xl border px-3 py-2 text-sm ${achievement.unlocked ? 'border-primary/35 bg-primary/10' : 'border-border bg-background/70 text-muted-foreground'}`}>
                      <p className="font-semibold">{achievement.title}</p>
                      <p className="text-xs">{achievement.requirement}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/username" className="rounded-xl border border-border px-5 py-3">Edit username</Link>
              {profile.username ? <Link href={`/player/${encodeURIComponent(profile.username)}`} className="rounded-xl border border-border px-5 py-3">View public profile</Link> : null}
              <button type="button" onClick={() => void signOut()} className="rounded-xl border border-border px-5 py-3 text-muted-foreground">Sign out</button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p></div><p className="mt-4 text-3xl font-bold">{value}</p></div>
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-secondary p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold">{value.toLocaleString()}</p></div>
}
