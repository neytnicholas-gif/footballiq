import Link from 'next/link'
import { Brain, Flag, GitBranch, Search, TrendingUp, Trophy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { CallToAction, ModeCard, SectionHeader, StatCard, SurfaceCard, StatusBadge } from '@/components/platform/primitives'
import { duelPacks } from '@/lib/duel-packs'
import { careerQuestions, higherLowerItems, refereeQuestions, scoutQuestions, whoAmIQuestions } from '@/lib/game-data'

const modes = [
  {
    title: 'Scout Vision',
    description: 'Evaluate dossiers, weigh risks and write a recommendation from the evidence in front of you.',
    href: '/quizzes/would-you-scout-him',
    icon: <Brain className="size-5" />,
    accent: 'scout' as const,
    meta: [`${scoutQuestions.length} dossiers`, '10-15 min', 'Playable now'],
  },
  {
    title: 'Referee Arena',
    description: 'Decide fouls, sanctions and restarts in law-led match incidents with clear debriefs.',
    href: '/quizzes/referee-decisions',
    icon: <Flag className="size-5" />,
    accent: 'referee' as const,
    meta: [`${refereeQuestions.length} scenarios`, '8-12 min', 'Playable now'],
  },
  {
    title: 'Football Duels',
    description: 'Fast stat battles across leagues, trophies and international records. Replayable pack selection and instant results.',
    href: '/quizzes/football-duels',
    icon: <Trophy className="size-5" />,
    accent: 'duels' as const,
    meta: [`${duelPacks.length} packs`, '5-10 min', 'Playable now'],
  },
  {
    title: 'Daily Challenge',
    description: 'Five questions in a shared Brussels daily key. One completion per day keeps the streak alive.',
    href: '/daily',
    icon: <TrendingUp className="size-5" />,
    accent: 'daily' as const,
    meta: ['5 questions', 'Daily', 'Playable now'],
  },
  {
    title: 'Higher or Lower',
    description: 'Keep a stat streak alive by judging which player record is higher or lower next.',
    href: '/quizzes/higher-or-lower',
    icon: <TrendingUp className="size-5" />,
    accent: 'higher' as const,
    meta: [`${higherLowerItems.length} players`, 'short run', 'Playable now'],
  },
  {
    title: 'Who Am I?',
    description: 'Solve a hidden player identity from clues and decide when to risk another clue.',
    href: '/quizzes/who-am-i',
    icon: <Search className="size-5" />,
    accent: 'mystery' as const,
    meta: [`${whoAmIQuestions.length} players`, 'deduction', 'Playable now'],
  },
  {
    title: 'Career Path',
    description: 'Recognise players from the sequence of clubs and the route their careers took.',
    href: '/quizzes/career-path',
    icon: <GitBranch className="size-5" />,
    accent: 'career' as const,
    meta: [`${careerQuestions.length} careers`, 'pattern recognition', 'Playable now'],
  },
]

export default function QuizzesPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <SurfaceCard className="overflow-hidden border-primary/15 p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <StatusBadge label="FootballIQ mode selection" tone="good" />
              <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground sm:text-6xl">Pick the mode that matches the football skill you want to train.</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">Each card below is a real playable mode. Session length, scenario count and training focus are shown explicitly so the library feels like a product selector, not a loose quiz list.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label="Playable modes" value={`${modes.length}`} hint="All cards route to live experiences" />
              <StatCard label="Core packs" value={`${duelPacks.length}`} hint="Replayable stat duels" />
              <StatCard label="Daily challenge" value="5 Qs" hint="One shared key per day" />
              <StatCard label="Skill focus" value="Evidence first" hint="Decision-making, not trivia alone" />
            </div>
          </div>
        </SurfaceCard>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modes.map((mode) => <ModeCard key={mode.title} {...mode} playable />)}
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <SurfaceCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">How to start</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">Start with a mode, then sign in if you want the progress to persist.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Anonymous users can still play the core experiences. Signed-in users get XP, ratings, streaks and leaderboard tracking.</p>
          </SurfaceCard>
          <SurfaceCard className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Product notes</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• No playable mode is marked as coming soon</li>
              <li>• Scenario counts and pack counts are derived from live data</li>
              <li>• The visual system is shared across the product</li>
            </ul>
          </SurfaceCard>
        </section>

        <div className="mt-8">
          <CallToAction
            title="Choose a mode and start a real run."
            copy="Scout, referee, duel or daily challenge. Each route opens a distinct FootballIQ experience with immediate feedback."
            primary={<Link href="/quizzes/would-you-scout-him" className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Start Scout Vision</Link>}
            secondary={<Link href="/leaderboard" className="inline-flex rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">Open leaderboard</Link>}
          />
        </div>
      </section>
    </main>
  )
}
