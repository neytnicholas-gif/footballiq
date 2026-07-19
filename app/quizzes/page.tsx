import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { duelPacks } from '@/lib/duel-packs'

const modes = [
  { title: 'Football Duels', description: `${duelPacks.length} head-to-head packs across goals, assists, tournaments and trophies.`, href: '/quizzes/football-duels', label: '10 packs' },
  { title: 'Higher or Lower', description: 'Build a streak by comparing football statistics.', href: '/quizzes/higher-or-lower', label: 'Playable' },
  { title: 'Who Am I?', description: 'Identify ten players from progressively easier clues.', href: '/quizzes/who-am-i', label: '10 players' },
  { title: 'Career Path', description: 'Recognise players from the clubs in their careers.', href: '/quizzes/career-path', label: '10 careers' },
  { title: 'Referee Decisions', description: 'Apply the Laws of the Game to match scenarios.', href: '/quizzes/referee-decisions', label: '10 scenarios' },
  { title: 'Would You Scout Him?', description: 'Judge anonymous player evidence like a scout.', href: '/quizzes/would-you-scout-him', label: '10 profiles' },
]

export default function QuizzesPage() {
  return <main className="min-h-screen bg-background"><SiteHeader/><section className="mx-auto max-w-7xl px-4 py-14 sm:px-6"><p className="text-sm uppercase tracking-widest text-primary">Quiz library</p><h1 className="mt-3 text-4xl font-semibold">Choose your challenge</h1><p className="mt-3 text-muted-foreground">Six playable modes, shared XP, streaks and leaderboard progression.</p><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{modes.map((mode) => <Link href={mode.href} key={mode.title} className="rounded-3xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-primary/60"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-semibold">{mode.title}</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{mode.label}</span></div><p className="mt-3 text-muted-foreground">{mode.description}</p><p className="mt-6 text-sm font-medium text-primary">Play now →</p></Link>)}</div></section></main>
}
