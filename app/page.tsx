'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Compass,
  Flag,
  Gamepad2,
  GitBranch,
  Goal,
  Shield,
  Trophy,
  Users,
  Wallet,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { formatAccuracy, formatDayCount } from '@/lib/player-metrics'
import { getRankProgress } from '@/lib/progression'
import { SiteFooter } from '@/components/site-footer'
import { Reveal } from '@/components/reveal'
import { REFEREE_ARENA_SCENARIO_COUNT } from '@/components/referee-decision-quiz'
import { duelPacks } from '@/lib/duel-packs'
import {
  careerQuestions,
  higherLowerItems,
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

type FeatureCard = {
  title: string
  desc: string
  href: string
  icon: React.ElementType
  label: string
}

type PillarCard = {
  title: string
  desc: string
  icon: React.ElementType
}

type WhyCard = {
  title: string
  desc: string
  href: string
  icon: React.ElementType
  kicker: string
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
    count: `${REFEREE_ARENA_SCENARIO_COUNT} scenarios`,
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

const priorityFeatures: FeatureCard[] = [
  {
    title: 'Scout Vision',
    desc: 'Evaluate youth profiles, balance risk and choose the right follow-up action.',
    href: '/quizzes/would-you-scout-him',
    icon: Brain,
    label: 'Talent ID',
  },
  {
    title: 'Referee Arena',
    desc: 'Read incidents, apply law principles and commit to one decision under pressure.',
    href: '/quizzes/referee-decisions',
    icon: Flag,
    label: 'Decision-making',
  },
  {
    title: 'Player Market',
    desc: 'Follow player values, build a portfolio and track the market with confidence.',
    href: '/market',
    icon: TrendingUp,
    label: 'Portfolio play',
  },
  {
    title: 'Daily Challenge',
    desc: 'Protect your streak with a shared daily run built for fast sessions.',
    href: '/daily',
    icon: CalendarDays,
    label: 'Daily rhythm',
  },
  {
    title: 'Quizzes',
    desc: 'Jump into the full library of football challenges across different skills.',
    href: '/quizzes',
    icon: Trophy,
    label: 'Quiz library',
  },
]

const pillars: PillarCard[] = [
  {
    title: 'LEARN',
    desc: 'Improve football knowledge through quizzes, challenges and AI-powered explanations.',
    icon: BookOpen,
  },
  {
    title: 'COMPETE',
    desc: 'Earn XP, climb leaderboards and improve your rating.',
    icon: Trophy,
  },
  {
    title: 'PLAY',
    desc: 'Enjoy unique football game modes and daily challenges.',
    icon: Gamepad2,
  },
  {
    title: 'INVEST',
    desc: 'Build and manage your football player portfolio.',
    icon: Wallet,
  },
  {
    title: 'PROGRESS',
    desc: 'Track your achievements and grow your football journey over time.',
    icon: BarChart3,
  },
]

const whyCards: WhyCard[] = [
  {
    title: 'Football Knowledge',
    desc: 'Build real football understanding through varied quiz formats and practical challenge loops.',
    href: '/quizzes',
    icon: BookOpen,
    kicker: 'Learn faster',
  },
  {
    title: 'Real Football Decisions',
    desc: 'Referee Arena and Scout Vision train decision quality under pressure, not just trivia memory.',
    href: '/quizzes/referee-decisions',
    icon: Shield,
    kicker: 'Think clearly',
  },
  {
    title: 'Long-Term Progression',
    desc: 'XP, streaks, ratings and rank progression reward consistency over time.',
    href: '/profile',
    icon: Compass,
    kicker: 'Progress daily',
  },
  {
    title: 'Competitive Community',
    desc: 'Compete on leaderboards and measure your football intelligence against other players.',
    href: '/leaderboard',
    icon: Users,
    kicker: 'Compete globally',
  },
  {
    title: 'Player Market Strategy',
    desc: 'Build and manage a virtual football player portfolio with transparent value rules and risk decisions.',
    href: '/market',
    icon: Goal,
    kicker: 'Invest smarter',
  },
]

export default function HomePage() {
  const { user, profile, loading, profileLoading } = useAuth()
  const authResolved = !loading && !profileLoading
  const rank = getRankProgress(profile?.xp ?? 0)
  const accuracy = formatAccuracy(profile?.correct_answers ?? 0, profile?.total_answers ?? 0)

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_15%_18%,rgba(55,220,130,.16),transparent_28rem),radial-gradient(circle_at_80%_14%,rgba(76,119,255,.14),transparent_26rem),linear-gradient(180deg,rgba(5,8,12,.9),rgba(5,8,12,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[7%] top-24 hidden size-64 rounded-full bg-primary/10 blur-[130px] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[10%] top-[26rem] hidden size-72 rounded-full bg-blue-500/10 blur-[150px] lg:block"
      />

      <SiteHeader />

      <Reveal as="section" className="relative isolate overflow-hidden border-b border-border/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,15,20,.56),rgba(11,15,20,.86)),radial-gradient(circle_at_16%_16%,rgba(55,220,130,.14),transparent_28rem),radial-gradient(circle_at_82%_18%,rgba(77,120,255,.13),transparent_26rem)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 right-[-8%] h-[34rem] w-[34rem] rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,.16),rgba(255,255,255,0)_64%)] opacity-45 blur-[2px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-14 right-[-18%] hidden w-[52%] rounded-[3rem] border border-primary/15 bg-[repeating-linear-gradient(90deg,transparent_0_12%,rgba(255,255,255,.03)_12%_24%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0))] opacity-70 [transform:perspective(820px)_rotateX(60deg)_rotateZ(-11deg)] lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
        <div className="relative mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
          {!authResolved ? (
            <div className="football-panel rounded-[2rem] p-8 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">FootballIQ</p>
              <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-full bg-secondary/80" />
              <div className="mt-5 h-5 w-[34rem] max-w-full animate-pulse rounded-full bg-secondary/60" />
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
                <div className="h-24 rounded-2xl border border-border/70 bg-card/60" />
              </div>
            </div>
          ) : !user ? (
            <>
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <HeroBadge icon={<Sparkles className="size-3.5" />}>Premium football platform</HeroBadge>
                  <HeroBadge>Ranked progression</HeroBadge>
                  <HeroBadge>Mobile-first challenges</HeroBadge>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[.3em] text-primary/90">FootballIQ</p>
                <h1 className="mt-3 max-w-4xl text-balance text-[2.1rem] font-black tracking-tight text-white leading-[0.93] sm:mt-4 sm:text-6xl lg:text-7xl lg:leading-[0.95]">
                  Play Football.
                  <span className="block text-primary">Learn Football.</span>
                  <span className="block">Build Your Football Journey.</span>
                </h1>
                <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  FootballIQ is where football fans, referees, scouts, coaches, analysts and players develop their football knowledge, compete with others and build their football journey.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/quizzes"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklch,var(--primary)_70%,transparent)] transition hover:-translate-y-0.5"
                  >
                    Start Playing <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border/80 bg-card/70 px-6 font-semibold text-foreground backdrop-blur transition hover:border-primary/40 hover:bg-secondary/20"
                  >
                    Discover FootballIQ
                  </Link>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <HeroMetric label="Strongest play" value="5" detail="Priority experiences" />
                  <HeroMetric label="Daily" value="5 Q" detail="Shared every day" />
                  <HeroMetric label="Start rating" value="1000" detail="Fresh profiles included" />
                </div>
              </div>

              <div className="football-panel rounded-[2rem] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Featured experiences</p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      The homepage puts the strongest playable experiences first.
                    </p>
                  </div>
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <BadgeCheck className="size-5" />
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {priorityFeatures.slice(0, 3).map((feature) => {
                    const Icon = feature.icon
                    return (
                      <Link
                        key={feature.title}
                        href={feature.href}
                        className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 transition hover:border-primary/35 hover:bg-secondary/15"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{feature.title}</p>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {feature.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <Link
                  href="/market"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-2.5"
                >
                  Explore the Player Market <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          ) : user && !profile?.username ? (
            <div className="football-panel rounded-[2rem] p-8 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Profile setup</p>
              <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">
                Finish your FootballIQ profile
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
                Choose your public username before you start playing.
              </p>
              <Link
                href="/username"
                className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklch,var(--primary)_70%,transparent)] transition hover:-translate-y-0.5"
              >
                Choose username
              </Link>
            </div>
          ) : (
            <>
              <div className="football-panel rounded-[2rem] p-7 sm:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <HeroBadge icon={<Sparkles className="size-3.5" />}>Continue playing</HeroBadge>
                  <HeroBadge>Keep streaks alive</HeroBadge>
                </div>
                <h1 className="mt-5 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Welcome back, {profile?.username ?? 'player'}.
                </h1>
                <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
                  Keep momentum with a daily run or jump back into your strongest mode.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/daily"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklch,var(--primary)_70%,transparent)] transition hover:-translate-y-0.5"
                  >
                    Play daily challenge <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/quizzes/football-duels"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border/80 bg-card/60 px-5 font-semibold backdrop-blur transition hover:border-primary/40 hover:bg-secondary/20"
                  >
                    Continue duels
                  </Link>
                </div>
              </div>

              <div className="football-panel rounded-[2rem] p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Current status</p>
                    <p className="mt-2 text-sm text-muted-foreground">Your FootballIQ profile at a glance.</p>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Live profile
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <HeroMetric label="Rank" value={rank.current.title} detail="Overall standing" />
                  <HeroMetric label="XP" value={(profile?.xp ?? 0).toString()} detail="Progress banked" />
                  <HeroMetric label="Streak" value={formatDayCount(profile?.streak ?? 0)} detail="Protect today" />
                  <HeroMetric label="Accuracy" value={accuracy} detail="Across all modes" />
                </div>
                <Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-2.5">
                  Open full profile <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Why FootballIQ</p>
            <h2 className="mt-2 text-balance text-3xl font-black sm:text-4xl">Built to make football progression measurable and motivating.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            FootballIQ combines football knowledge, pressure decisions, and long-term progression into one platform.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {whyCards.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group football-panel rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_-38px_rgba(0,0,0,.85)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.kicker}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-foreground sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:gap-1.5">
                  Learn more <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
              </Link>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 rounded-[2rem] border border-orange-400/25 bg-[radial-gradient(circle_at_top_right,rgba(255,145,47,.2),transparent_55%),linear-gradient(180deg,rgba(255,145,47,.12),rgba(255,145,47,.04)),var(--card)] p-6 shadow-[0_24px_80px_-50px_rgba(255,145,47,.55)] sm:p-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-orange-300">Daily challenge</p>
            <h2 className="mt-2 text-balance text-2xl font-black tracking-tight sm:text-3xl">
              One shared test every day
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Complete today&apos;s five-question run to protect your streak and earn XP.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <DailyBadge label="Questions" value="5" />
              <DailyBadge label="Time" value="Fast" />
              <DailyBadge label="Reward" value="XP + streak" />
            </div>
            <div>
              <Link
                href="/daily"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-orange-400 px-5 font-semibold text-black shadow-[0_18px_40px_-20px_rgba(255,145,47,.85)] transition hover:-translate-y-0.5"
              >
                Play today <CalendarDays className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Five pillars</p>
            <h2 className="mt-2 text-balance text-3xl font-black sm:text-4xl">FootballIQ is built around five core pillars.</h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A clearer product story for new visitors, with the platform&apos;s strongest value propositions surfaced immediately.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {pillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div key={pillar.title} className="football-panel rounded-[2rem] p-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="size-5" />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-primary">{pillar.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.desc}</p>
              </div>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Feature priority</p>
            <h2 className="mt-2 text-balance text-3xl font-black sm:text-4xl">The homepage should push the best playable experiences first.</h2>
          </div>
          <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-2.5">
            Open quiz library <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {priorityFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Link
                href={feature.href}
                key={feature.title}
                className="group football-panel rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_-38px_rgba(0,0,0,.85)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {feature.label}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:gap-1.5">
                  Explore <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
              </Link>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-primary">Modes</p>
            <h2 className="mt-2 text-balance text-3xl font-black sm:text-4xl">Six modes. One progression profile.</h2>
          </div>
          <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-2.5">
            Open quiz library <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                href={mode.href}
                key={mode.title}
                className={`mode-card mode-card-${mode.theme} football-panel group rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_60px_-38px_rgba(0,0,0,.85)]`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {mode.count}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{mode.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mode.desc}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{mode.skill}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    Play <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<Trophy className="size-5" />}
            title="XP and levels"
            text="Every saved result contributes to your FootballIQ level progression."
            href="/profile#progression"
            actionLabel="View progression →"
          />
          <InfoCard
            icon={<TrendingUp className="size-5" />}
            title="Ratings"
            text="Mode and overall ratings reward consistency, not one isolated run."
            href="/profile#ratings"
            actionLabel="View ratings →"
          />
          <InfoCard
            icon={<CalendarDays className="size-5" />}
            title="Streaks"
            text="Daily completion builds current and longest streak records."
            href="/daily"
            actionLabel="Protect streak →"
          />
          <InfoCard
            icon={<ShieldCheck className="size-5" />}
            title="Leaderboards"
            text="Compete across overall, mode-specific, and time-based tables."
            href="/leaderboard"
            actionLabel="View rankings →"
          />
        </div>
      </Reveal>

      <SiteFooter />
    </main>
  )
}

function HeroBadge({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
      {icon}
      {children}
    </span>
  )
}

function HeroMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function DailyBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
  href,
  actionLabel,
}: {
  icon: React.ReactNode
  title: string
  text: string
  href: string
  actionLabel: string
}) {
  return (
    <Link
      href={href}
      aria-label={`${title}. ${actionLabel.replace(' →', '')}`}
      className="group block rounded-[1.75rem] border border-border/70 bg-card/75 p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:bg-secondary/15 hover:shadow-[0_20px_45px_-30px_rgba(0,0,0,.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="flex items-center gap-3 text-primary">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-xs uppercase tracking-[.22em] text-muted-foreground">FootballIQ</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:gap-1.5">
        {actionLabel}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  )
}
