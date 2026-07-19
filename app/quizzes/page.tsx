'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Brain,
  Flag,
  GitBranch,
  Search,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { useAuth } from '@/components/auth-provider'
import { duelPacks } from '@/lib/duel-packs'
import {
  careerQuestions,
  higherLowerItems,
  refereeQuestions,
  scoutQuestions,
  whoAmIQuestions,
} from '@/lib/game-data'

type Skill = 'All' | 'Decision-making' | 'Talent ID' | 'Stats' | 'Player knowledge'

type ModeCard = {
  theme: string
  title: string
  description: string
  href: string
  label: string
  icon: React.ElementType
  skill: Exclude<Skill, 'All'>
  count: string
  featured?: boolean
}

const modes: ModeCard[] = [
  {
    theme: 'duels',
    title: 'Football Duels',
    description: 'Fast head-to-head comparisons with timers, combo scoring and instant reveal.',
    href: '/quizzes/football-duels',
    label: 'Flagship',
    icon: Trophy,
    skill: 'Stats',
    count: `${duelPacks.length} packs`,
    featured: true,
  },
  {
    theme: 'higher',
    title: 'Higher or Lower',
    description: 'Rapid stat comparisons built around streak protection and quick decisions.',
    href: '/quizzes/higher-or-lower',
    label: 'Rapid mode',
    icon: TrendingUp,
    skill: 'Stats',
    count: `${higherLowerItems.length - 1} rounds`,
  },
  {
    theme: 'mystery',
    title: 'Who Am I?',
    description: 'Use progressive clues to identify players before your score drops.',
    href: '/quizzes/who-am-i',
    label: 'Mystery mode',
    icon: Search,
    skill: 'Player knowledge',
    count: `${whoAmIQuestions.length} players`,
  },
  {
    theme: 'career',
    title: 'Career Path',
    description: 'Read transfer journeys and match each timeline to the right name.',
    href: '/quizzes/career-path',
    label: 'Timeline mode',
    icon: GitBranch,
    skill: 'Player knowledge',
    count: `${careerQuestions.length} timelines`,
  },
  {
    theme: 'referee',
    title: 'Referee Arena',
    description: 'Judge incidents using law principles, game context and discipline cues.',
    href: '/quizzes/referee-decisions',
    label: 'Law focus',
    icon: Flag,
    skill: 'Decision-making',
    count: `${refereeQuestions.length} scenarios`,
  },
  {
    theme: 'scout',
    title: 'Scout Vision',
    description: 'Evaluate fictional player dossiers and decide follow priority with uncertainty.',
    href: '/quizzes/would-you-scout-him',
    label: 'Scouting mode',
    icon: Brain,
    skill: 'Talent ID',
    count: `${scoutQuestions.length} dossiers`,
  },
]

const filters: Skill[] = ['All', 'Decision-making', 'Talent ID', 'Stats', 'Player knowledge']

export default function QuizzesPage() {
  const [filter, setFilter] = useState<Skill>('All')
  const { user, profile } = useAuth()

  const filtered = useMemo(
    () => modes.filter((mode) => filter === 'All' || mode.skill === filter),
    [filter],
  )

  const completedTotal = profile?.quizzes_completed ?? 0

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Quiz library</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Pick your football challenge</h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              One library, six modes, one shared progression system.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            {user ? (
              <>
                Progress: <strong>{completedTotal}</strong> completed quizzes
              </>
            ) : (
              'Sign in to save mode progress'
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-4 py-2 text-sm ${filter === item ? 'bg-primary font-semibold text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {filtered.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                href={mode.href}
                key={mode.title}
                className={`mode-card mode-card-${mode.theme} group relative overflow-hidden rounded-[2rem] border p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/60 ${mode.featured ? 'border-primary/35 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_55%)] lg:col-span-2' : 'border-border bg-card'}`}
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {mode.count}
                  </span>
                </div>
                <h2 className={`mt-6 font-bold tracking-tight ${mode.featured ? 'text-4xl' : 'text-2xl'}`}>{mode.title}</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{mode.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Skill: {mode.skill}</p>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Play now <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
