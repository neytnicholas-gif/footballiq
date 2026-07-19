import { BarChart3, Radar, Trophy, Zap } from 'lucide-react'
import { BallIcon } from '@/components/logo'
import { Reveal } from '@/components/reveal'

const features = [
  {
    icon: BallIcon,
    title: 'Football Duels',
    description: 'Fast one-v-one questions with a big-card battle frame, sharp reveal state and gold-violet energy.',
    tint: 'from-fuchsia-500/20 via-violet-500/10 to-transparent',
  },
  {
    icon: Zap,
    title: 'Referee Arena',
    description: 'Text-based match scenarios delivered like a night-stadium review desk with yellow/red accents.',
    tint: 'from-amber-400/20 via-orange-400/10 to-transparent',
  },
  {
    icon: Trophy,
    title: 'Predictions',
    description: 'Broadcast-style fixture cards, probability bars and a polished match-centre presentation.',
    tint: 'from-sky-400/20 via-blue-500/10 to-transparent',
  },
  {
    icon: Radar,
    title: 'Scout Vision',
    description: 'Professional scouting panels with tactical lines, analytics mood and dossier-inspired styling.',
    tint: 'from-cyan-400/20 via-emerald-400/10 to-transparent',
  },
]

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="max-w-3xl">
        <span className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Scout Vision</span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          A premium football IQ platform with six distinct flavours.
        </h2>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          The experience feels cinematic at every turn, but the gameplay stays familiar: answer, learn, progress and grow your rating.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <Reveal key={feature.title} as="article" delay={i * 90} className="h-full">
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:glow-green">
                <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.tint}`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="size-6" />
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      Analytics
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  <div className="mt-5 flex items-center gap-2 text-sm text-primary">
                    <BarChart3 className="size-4" />
                    <span>Live scouting-ready presentation</span>
                  </div>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
