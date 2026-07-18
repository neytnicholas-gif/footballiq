import { BarChart3, BookOpen, Trophy, Zap } from 'lucide-react'
import { BallIcon } from '@/components/logo'
import { Reveal } from '@/components/reveal'

const features = [
  {
    icon: BallIcon,
    title: 'Football Duels',
    description:
      'Fast one-v-one questions: who scored more, who assisted more, who had the better record?',
  },
  {
    icon: Zap,
    title: 'Decision Scenarios',
    description:
      'Text-based referee situations for fouls, cards, handballs, DOGSO, advantage and restarts.',
  },
  {
    icon: Trophy,
    title: 'Prediction Challenges',
    description:
      'Predict fixtures, build streaks and test your football instincts against friends and users.',
  },
  {
    icon: BarChart3,
    title: 'Ratings & Streaks',
    description:
      'Turn quizzes into a habit with scores, accuracy, streaks, badges and future leaderboards.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="max-w-2xl">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple quizzes first. Bigger platform later.
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          RefDecision starts with addictive football questions that do not need media. Then it can grow into referee clips, scouting puzzles and prediction games.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <Reveal
            key={feature.title}
            as="article"
            delay={i * 90}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:glow-green"
          >
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/5 blur-2xl transition-opacity duration-300 group-hover:bg-primary/15"
            />
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <feature.icon className="size-6" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
