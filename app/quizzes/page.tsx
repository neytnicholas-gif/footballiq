import Link from 'next/link'
import { ArrowRight, Brain, Flag, GitBranch, Search, TrendingUp, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { duelPacks } from '@/lib/duel-packs'

const modes = [
  { theme: 'duels', title: 'Football Duels', description: `${duelPacks.length} replayable packs with timers, combos, ties and personal bests.`, href: '/quizzes/football-duels', label: 'Flagship', icon: Trophy, featured: true },
  { theme: 'higher', title: 'Higher or Lower', description: 'Keep the run alive by judging whether the next football stat is higher or lower.', href: '/quizzes/higher-or-lower', label: 'Streak mode', icon: TrendingUp },
  { theme: 'mystery', title: 'Who Am I?', description: 'Identify the player before the clues become obvious. Fewer clues means more points.', href: '/quizzes/who-am-i', label: '10 players', icon: Search },
  { theme: 'career', title: 'Career Path', description: 'Recognise players from their club journeys and career turning points.', href: '/quizzes/career-path', label: '10 careers', icon: GitBranch },
  { theme: 'referee', title: 'Referee Decisions', description: 'Cards, DOGSO, handball and restart decisions based on match scenarios.', href: '/quizzes/referee-decisions', label: '10 scenarios', icon: Flag },
  { theme: 'scout', title: 'Would You Scout Him?', description: 'Judge anonymous evidence, choose a recommendation and compare the reveal.', href: '/quizzes/would-you-scout-him', label: 'Scout mode', icon: Brain },
]

export default function QuizzesPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary">Quiz library</p>
          <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">Pick your football test.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Fast rounds, clear progression and enough variety to make “one more game” dangerous.</p>
        </div>
        <div className="mt-9 grid gap-4 lg:grid-cols-2">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                href={mode.href}
                key={mode.title}
                className={`mode-card mode-card-${mode.theme} group relative overflow-hidden rounded-[2rem] border p-7 transition duration-300 hover:-translate-y-1 hover:border-primary/60 ${mode.featured ? 'border-primary/35 bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_50%)] lg:col-span-2' : 'border-border bg-card'}`}
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {mode.label}
                  </span>
                </div>
                <h2 className={`mt-7 font-bold tracking-tight ${mode.featured ? 'text-4xl' : 'text-2xl'}`}>{mode.title}</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{mode.description}</p>
                <p className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  Play now <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
