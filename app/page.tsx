'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  CalendarDays,
  Flag,
  GitBranch,
  Search,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { getRankProgress } from '@/lib/progression'
import { SiteFooter } from '@/components/site-footer'
import { duelPacks } from '@/lib/duel-packs'
import {
  careerQuestions,
  higherLowerItems,
  refereeQuestions,
  scoutQuestions,
  whoAmIQuestions,
} from '@/lib/game-data'

type ModeCard = {
  theme: string
  title: string
  desc: string
  href: string
  icon: React.ElementType
  skill: string
  count: string
}

const modes: ModeCard[] = [
  {
    theme: 'duels',
    title: 'Football Duels',
    desc: 'Head-to-head player comparisons with timers, combos and fast feedback.',
    href: '/quizzes/football-duels',
    icon: Trophy,
    skill: 'Football memory',
    count: `${duelPacks.length} packs`,
  },
  {
    theme: 'referee',
    title: 'Referee Arena',
    desc: 'Read incidents, apply law principles and commit to one decision under pressure.',
    href: '/quizzes/referee-decisions',
    icon: Flag,
    skill: 'Decision-making',
    count: `${refereeQuestions.length} scenarios`,
  },
  {
    theme: 'scout',
    title: 'Scout Vision',
    desc: 'Evaluate youth profiles, balance risk, and choose the right follow-up action.',
    href: '/quizzes/would-you-scout-him',
    icon: Brain,
    skill: 'Talent ID',
    count: `${scoutQuestions.length} dossiers`,
  },
  {
    theme: 'higher',
    title: 'Higher or Lower',
    desc: 'Rapid stat battles built for streak focus and quick rounds on mobile.',
    href: '/quizzes/higher-or-lower',
    icon: TrendingUp,
    skill: 'Stat instinct',
    count: `${higherLowerItems.length - 1} rounds`,
  },
  {
    theme: 'mystery',
    title: 'Who Am I?',
    desc: 'Use progressive clues to identify the player before your points drop.',
    href: '/quizzes/who-am-i',
    icon: Search,
    skill: 'Player deduction',
    count: `${whoAmIQuestions.length} identities`,
  },
  {
    theme: 'career',
    title: 'Career Path',
    desc: 'Read transfer timelines and match each journey to the correct player.',
    href: '/quizzes/career-path',
    icon: GitBranch,
    skill: 'Career recall',
    count: `${careerQuestions.length} timelines`,
  },
]

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = profile?.total_answers
    ? Math.round((profile.correct_answers / profile.total_answers) * 100)
    : 0

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(55,220,130,.16),transparent_30rem),radial-gradient(circle_at_82%_20%,rgba(77,120,255,.13),transparent_28rem)]"
        />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.2fr_.8fr]">
          {!loading && !user ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">FootballIQ</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                  Train football judgement, knowledge and talent identification in one platform.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Play short football challenges, get clear feedback, earn XP, and climb mode and
                  overall rankings.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/quizzes"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground"
                  >
                    Start playing <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/daily"
                    className="inline-flex h-11 items-center rounded-xl border border-border bg-card/80 px-6 font-semibold"
                  >
                    Today&apos;s challenge
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/85 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Guest preview</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  You can play immediately. Create an account to save streaks, XP and rankings.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <QuickStat label="Modes" value="6" />
                  <QuickStat label="Daily run" value="5 Q" />
                  <QuickStat label="Start rating" value="1000" />
                </div>
                <Link href="/signup" className="mt-5 inline-flex text-sm font-semibold text-primary">
                  Create account for saved progress →
                </Link>
              </div>
            </>
          ) : !loading && user && !profile?.username ? (
            <div className="rounded-3xl border border-border bg-card p-8 lg:col-span-2">
              <h1 className="text-3xl font-bold">Finish your FootballIQ profile</h1>
              <p className="mt-3 text-muted-foreground">
                Choose your public username before you start playing.
              </p>
              <Link
                href="/username"
                className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
              >
                Choose username
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-[2rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(55,220,130,.16),transparent_45%),rgba(20,25,28,.8)] p-7 sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Continue playing</p>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                  Welcome back, {profile?.username ?? 'player'}.
                </h1>
                <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                  Keep momentum with a daily run or jump back into your strongest mode.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/daily"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
                  >
                    Play daily challenge <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/quizzes/football-duels"
                    className="inline-flex h-11 items-center rounded-xl border border-border px-5 font-semibold"
                  >
                    Continue duels
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/70 bg-card/85 p-7 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Current status</p>
                <div className="mt-4 space-y-3">
                  <QuickStat label="Rank" value={rank.current.title} />
                  <QuickStat label="XP" value={(profile?.xp ?? 0).toString()} />
                  <QuickStat label="Streak" value={`${profile?.streak ?? 0} days`} />
                  <QuickStat label="Accuracy" value={`${accuracy}%`} />
                </div>
                <Link href="/profile" className="mt-4 inline-flex text-sm font-semibold text-primary">
                  Open full profile →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-orange-400/25 bg-[radial-gradient(circle_at_top_right,rgba(255,145,47,.2),transparent_55%),var(--card)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.24em] text-orange-300">Daily challenge</p>
              <h2 className="mt-2 text-2xl font-bold">One shared test every day</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete today&apos;s five-question run to protect your streak and earn XP.
              </p>
            </div>
            <Link
              href="/daily"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-400 px-5 font-semibold text-black"
            >
              Play today <CalendarDays className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Modes</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Six modes. One progression profile.</h2>
          </div>
          <Link href="/quizzes" className="text-sm font-bold text-primary">
            Open quiz library →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                href={mode.href}
                key={mode.title}
                className={`mode-card mode-card-${mode.theme} group rounded-[1.75rem] border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/45`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {mode.count}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-bold tracking-tight">{mode.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mode.desc}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{mode.skill}</span>
                  <span className="font-semibold text-primary">Play</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<Trophy className="size-5" />}
            title="XP and levels"
            text="Every saved result contributes to your FootballIQ level progression."
          />
          <InfoCard
            icon={<TrendingUp className="size-5" />}
            title="Ratings"
            text="Mode and overall ratings reward consistency, not one isolated run."
          />
          <InfoCard
            icon={<CalendarDays className="size-5" />}
            title="Streaks"
            text="Daily completion builds current and longest streak records."
          />
          <InfoCard
            icon={<ShieldCheck className="size-5" />}
            title="Leaderboards"
            text="Compete across overall, mode-specific, and time-based tables."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </article>
  )
}
