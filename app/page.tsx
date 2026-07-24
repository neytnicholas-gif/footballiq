'use client'

import Link from 'next/link'
import { ArrowRight, Brain, Flag, GitBranch, Search, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'

const featuredModes = [
  {
    theme: 'scout',
    title: 'Scout Vision',
    desc: 'Think like a scout. Review evidence, balance potential and risk, and compare your decision with structured scouting reasoning.',
    href: '/quizzes/would-you-scout-him',
    icon: Brain,
    tag: 'Flagship',
  },
  {
    theme: 'referee',
    title: 'Referee Arena',
    desc: 'Professional judgement under pressure: laws, context, and decision quality.',
    href: '/quizzes/referee-decisions',
    icon: Flag,
    tag: 'Pro Mode',
  },
]

const modes = [
  {
    theme: 'duels',
    title: 'Football Duels',
    desc: 'Head-to-head battles with timers, combos and dramatic reveals.',
    href: '/quizzes/football-duels',
    icon: Trophy,
    tag: 'Competitive',
  },
  {
    theme: 'higher',
    title: 'Higher or Lower',
    desc: 'Back your football memory and keep the stat streak alive.',
    href: '/quizzes/higher-or-lower',
    icon: TrendingUp,
    tag: 'Streak',
  },
  {
    theme: 'mystery',
    title: 'Who Am I?',
    desc: 'Solve the football identity before the clues become obvious.',
    href: '/quizzes/who-am-i',
    icon: Search,
    tag: 'Mystery',
  },
  {
    theme: 'career',
    title: 'Career Path',
    desc: 'Track clubs, loans and defining moves across a player journey.',
    href: '/quizzes/career-path',
    icon: GitBranch,
    tag: 'History',
  },
]

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = profile?.total_answers ? Math.round((profile.correct_answers / profile.total_answers) * 100) : 0

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(55,220,130,.16),transparent_30rem),radial-gradient(circle_at_82%_20%,rgba(77,120,255,.13),transparent_28rem)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          {loading ? (
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary">
                <Sparkles className="size-4" />
                The football brain game
              </div>
              <h1 className="mt-6 text-5xl font-black tracking-[-.05em] sm:text-7xl lg:text-8xl">
                Train football knowledge and <span className="text-primary text-glow">judgement.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Scout Vision leads the platform: analyse evidence like a professional scout. Then sharpen your edge in Referee Arena, Duels, predictions and specialist quiz modes.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/quizzes/would-you-scout-him" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground">
                  Think like a scout
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/quizzes" className="inline-flex h-12 items-center rounded-xl border border-border bg-card/70 px-6 font-semibold">
                  Explore all modes
                </Link>
              </div>
            </div>
          ) : !user ? (
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary">
                <Sparkles className="size-4" />
                The football brain game
              </div>
              <h1 className="mt-6 text-5xl font-black tracking-[-.05em] sm:text-7xl lg:text-8xl">
                Train football knowledge and <span className="text-primary text-glow">judgement.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Scout Vision leads the platform: analyse evidence like a professional scout. Then sharpen your edge in Referee Arena, Duels, predictions and specialist quiz modes.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/quizzes/would-you-scout-him" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground">
                  Think like a scout
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/quizzes" className="inline-flex h-12 items-center rounded-xl border border-border bg-card/70 px-6 font-semibold">
                  Explore all modes
                </Link>
              </div>
            </div>
          ) : user && !profile?.username ? (
            <div className="rounded-3xl border border-border bg-card p-8">
              <h1 className="text-3xl font-bold">Finish your FootballIQ profile</h1>
              <p className="mt-3 text-muted-foreground">Choose your public username before you start playing.</p>
              <Link href="/username" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
                Choose username
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.45fr_.55fr]">
              <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(55,220,130,.16),transparent_45%),rgba(20,25,28,.8)] p-8 sm:p-11">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Your football hub</p>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Welcome back, {profile?.username ?? 'player'}.</h1>
                <p className="mt-4 max-w-xl text-lg text-muted-foreground">Start with today&rsquo;s scout judgement dossier or defend your streak in the daily challenge.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/quizzes/would-you-scout-him" className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
                    Open Scout Vision
                  </Link>
                  <Link href="/daily" className="rounded-xl border border-border bg-background/40 px-6 py-3 font-semibold">
                    Play today&apos;s challenge
                  </Link>
                </div>
              </div>
              <div className="rounded-[2rem] border border-border bg-card p-7">
                <div className="flex justify-between gap-3">
                  <p className="font-bold">{rank.current.emoji} {rank.current.title}</p>
                  <p className="text-sm text-muted-foreground">{profile?.xp ?? 0} XP</p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${rank.percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{rank.next ? `${rank.remaining} XP to ${rank.next.title}` : 'Maximum rank reached'}</p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Rating" value={profile?.rating ?? 1000} />
                  <Stat label="Completed" value={profile?.quizzes_completed ?? 0} />
                  <Stat label="Streak" value={profile?.current_streak ?? 0} />
                  <Stat label="Accuracy" value={`${accuracy}%`} />
                </div>
                <Link href="/leaderboard" className="mt-5 block text-sm font-bold text-primary">Explore all leaderboards &rarr;</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Flagship judgement modes</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">Think like a scout. Judge like a referee.</h2>
          </div>
          <Link href="/leaderboard" className="text-sm font-bold text-primary">See competitive hub &rarr;</Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {featuredModes.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                href={mode.href}
                key={mode.title}
                className={`mode-card mode-card-${mode.theme} group rounded-[2rem] border border-border bg-card p-7 transition duration-300 hover:-translate-y-1 hover:border-primary/40`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                    <Icon className="size-6" />
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{mode.tag}</span>
                </div>
                <h3 className="mt-7 text-3xl font-black">{mode.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{mode.desc}</p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">Enter mode <ArrowRight className="size-4 transition group-hover:translate-x-1" /></p>
              </Link>
            )
          })}
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Support modes</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {modes.map((mode) => {
              const Icon = mode.icon
              return (
                <Link
                  href={mode.href}
                  key={mode.title}
                  className={`mode-card mode-card-${mode.theme} group rounded-[2rem] border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/40`}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary">
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{mode.tag}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-black">{mode.title}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{mode.desc}</p>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link href="/daily" className="mode-card rounded-[2rem] border border-orange-400/20 bg-[radial-gradient(circle_at_top_right,rgba(255,145,47,.2),transparent_50%),var(--card)] p-7">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Daily Challenge</p>
            <h3 className="mt-3 text-2xl font-black">Protect the flame.</h3>
            <p className="mt-2 text-muted-foreground">Five mixed questions. One shared daily key in Europe/Brussels. One account reward per day.</p>
          </Link>
          <Link href="/predictions" className="mode-card rounded-[2rem] border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(64,190,255,.18),transparent_50%),var(--card)] p-7">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-300">Prediction Centre</p>
            <h3 className="mt-3 text-2xl font-black">Make the call before kickoff.</h3>
            <p className="mt-2 text-muted-foreground">Lock in picks and build your prediction record.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/60 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-lg">{value}</strong>
    </div>
  )
}
