'use client'

import Link from 'next/link'
import { ArrowRight, Brain, Flag, GitBranch, Search, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { ModeShowcase } from '@/components/mode-showcase'
import { GoalscorerQuiz } from '@/components/goalscorer-quiz'
import { RefereeDecisionQuiz } from '@/components/referee-decision-quiz'
import { PlatformLoop } from '@/components/platform-loop'
import { BlogPreview } from '@/components/blog-preview'
import { Predictions } from '@/components/predictions'
import { Leaderboard } from '@/components/leaderboard'
import { About } from '@/components/about'
import { SiteFooter } from '@/components/site-footer'

const modes = [
  { theme: 'duels', title: 'Football Duels', desc: 'Head-to-head battles with timers, combos and dramatic reveals.', href: '/quizzes/football-duels', icon: Trophy, tag: 'Flagship' },
  { theme: 'referee', title: 'Referee Arena', desc: 'Make the call under floodlights, pressure and VAR-level scrutiny.', href: '/quizzes/referee-decisions', icon: Flag, tag: 'Judgement' },
  { theme: 'scout', title: 'Scout Vision', desc: 'Read player evidence, heat-map style signals and hidden potential.', href: '/quizzes/would-you-scout-him', icon: Brain, tag: 'Talent ID' },
  { theme: 'higher', title: 'Higher or Lower', desc: 'Back your football memory and keep the stat streak alive.', href: '/quizzes/higher-or-lower', icon: TrendingUp, tag: 'Streak' },
  { theme: 'mystery', title: 'Who Am I?', desc: 'Solve the football identity before the clues become obvious.', href: '/quizzes/who-am-i', icon: Search, tag: 'Mystery' },
  { theme: 'career', title: 'Career Path', desc: 'Track clubs, loans and defining moves across a player journey.', href: '/quizzes/career-path', icon: GitBranch, tag: 'History' },
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
          {!loading && !user ? (
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary">
                <Sparkles className="size-4" />
                The football brain game
              </div>
              <h1 className="mt-6 text-5xl font-black tracking-[-.05em] sm:text-7xl lg:text-8xl">
                Every mode tests a <span className="text-primary text-glow">different football mind.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Referee judgement. Scouting instinct. Player knowledge. Prediction skill. Build your identity, protect your streak and climb every leaderboard.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/quizzes" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground">
                  Enter FootballIQ <ArrowRight className="size-4" />
                </Link>
                <Link href="/signup" className="inline-flex h-12 items-center rounded-xl border border-border bg-card/70 px-6 font-semibold">
                  Create account
                </Link>
              </div>
            </div>
          ) : !loading && user && !profile?.username ? (
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
                <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                  Keep the streak alive, check your current rank and jump straight back into the mode that suits your mood.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/quizzes" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground">
                    Enter FootballIQ <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/profile" className="inline-flex h-12 items-center rounded-xl border border-border bg-card/70 px-6 font-semibold">
                    Open profile
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/70 bg-card/80 p-8 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Current status</p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rank</span>
                      <span className="font-semibold text-foreground">{rank.current.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rank.percent}% to {rank.next?.title ?? 'max rank'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">XP</span>
                      <span className="font-semibold text-foreground">{profile?.xp ?? 0}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{profile?.streak ?? 0} day streak</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-semibold text-foreground">{accuracy}%</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{profile?.correct_answers ?? 0} correct answers saved</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Choose your speciality</p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">Six modes. Six identities.</h2>
          </div>
          <Link href="/leaderboard" className="text-sm font-bold text-primary">See competitive hub →</Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <Link href={mode.href} key={mode.title} className="group rounded-[2rem] border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/40">
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                    <Icon className="size-6" />
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {mode.tag}
                  </span>
                </div>
                <h3 className="mt-7 text-2xl font-black">{mode.title}</h3>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted-foreground">{mode.desc}</p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Enter mode <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <Hero />
      <Features />
      <ModeShowcase />
      <GoalscorerQuiz />
      <RefereeDecisionQuiz />
      <PlatformLoop />
      <BlogPreview />
      <Predictions />
      <Leaderboard />
      <About />
      <SiteFooter />
    </main>
  )
}
