import { Award, CalendarDays, Flame, Gauge, Medal, Users } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const loops = [
  {
    icon: Gauge,
    title: 'Football IQ Rating',
    text: 'Start at 1000. Correct answers move you up and mistakes pull you down.',
  },
  {
    icon: Flame,
    title: 'Streaks',
    text: 'Daily streaks reward consistency across modes and challenges.',
  },
  {
    icon: Medal,
    title: 'Levels',
    text: 'Level titles show long-term progression as your XP grows.',
  },
  {
    icon: CalendarDays,
    title: 'Daily Challenge',
    text: 'A shared daily run gives everyone the same test and reward window.',
  },
  {
    icon: Award,
    title: 'Badges',
    text: 'Milestones are based on your real profile stats and quiz performance.',
  },
  {
    icon: Users,
    title: 'Leaderboards',
    text: 'Compete on overall, mode-specific and time-window boards.',
  },
]

export function PlatformLoop() {
  return (
    <section id="progression" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Progression</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          A progression loop that rewards good decisions
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
          FootballIQ combines XP, ratings, levels, streaks and leaderboard positions into one
          clear feedback system.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loops.map((item, index) => (
          <Reveal key={item.title} delay={index * 70} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-[28px] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:glow-green">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/15" />
              <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <item.icon className="size-6" />
              </span>
              <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
