import { Award, CalendarDays, Flame, Gauge, Medal, Users } from 'lucide-react'
import { Reveal } from '@/components/reveal'

const loops = [
  {
    icon: Gauge,
    title: 'Football IQ Rating',
    text: 'Start at 1000. Correct answers move you up. Mistakes pull you down. Simple, addictive, clear.',
  },
  {
    icon: Flame,
    title: 'Streaks',
    text: 'Daily streaks create the habit. Users come back because they do not want to lose progress.',
  },
  {
    icon: Medal,
    title: 'Levels',
    text: 'Grassroots, Regional, National, Professional and FIFA-style levels make improvement visible.',
  },
  {
    icon: CalendarDays,
    title: 'Daily Challenge',
    text: 'One shared question every day. Perfect for Instagram stories and football WhatsApp groups.',
  },
  {
    icon: Award,
    title: 'Badges',
    text: 'Penalty Specialist, Law 12 Expert, Streak Master and Goalscorer Brain can all become unlocks.',
  },
  {
    icon: Users,
    title: 'Community Vote',
    text: 'Later: compare your answer with the public, referees, scouts and coaches separately.',
  },
]

export function PlatformLoop() {
  return (
    <section id="progression" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">Progression system</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          The part that makes people come back
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          RefDecision should not feel like a school test. It should feel like Chess.com or Duolingo for football judgement.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loops.map((item, index) => (
          <Reveal
            key={item.title}
            delay={index * 70}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:glow-green"
          >
            <div aria-hidden="true" className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/15" />
            <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <item.icon className="size-6" />
            </span>
            <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
