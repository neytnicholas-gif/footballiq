import { ArrowRight, Play, Sparkles, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

export function Hero() {
  return (
    <section id="home" className="relative flex min-h-screen items-center overflow-hidden pb-20 pt-28">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <img src="/images/hero-pitch.png" alt="" aria-hidden="true" className="size-full object-cover opacity-40" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(20,176,111,0.2),_transparent_30%),linear-gradient(120deg,_rgba(5,8,16,0.72),_rgba(3,6,12,0.92))]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[560px] -translate-x-1/2 rounded-full bg-primary/15 blur-[170px]" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-xs font-medium tracking-[0.3em] text-white/80 backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary" />
                Premium football IQ hub
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
                Train like a football{' '}
                <span className="text-primary text-glow">architect</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
                Move from goalscorer duels to referee decision rooms, scouting dossiers and live predictions in one premium football gaming experience.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" nativeButton={false} render={<a href="#quiz" />} className="h-12 rounded-xl px-7 text-base font-medium glow-green">
                  Enter Football Duels
                  <ArrowRight className="size-4" />
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<a href="#referee" />} className="h-12 rounded-xl border-white/10 bg-white/8 px-7 text-base font-medium text-white backdrop-blur hover:bg-white/12">
                  <Play className="size-4" />
                  Referee Arena
                </Button>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 sm:gap-6">
                {[
                  { value: '6', label: 'distinct modes' },
                  { value: '1000', label: 'starting rating' },
                  { value: '24/7', label: 'matchday energy' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 backdrop-blur">
                    <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">{stat.value}</dt>
                    <dd className="mt-1 text-sm text-white/60">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={220} className="lg:justify-self-end">
            <div className="football-panel rounded-[32px] border border-white/10 bg-black/20 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                <Sparkles className="size-4 text-primary" />
                Matchday intelligence
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { icon: Trophy, title: 'XP climbs', text: 'Earn momentum through accurate answers and streaks.' },
                  { icon: Zap, title: 'Daily challenge', text: 'A streak-first loop designed to keep the habit alive.' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="font-semibold tracking-tight text-white">{item.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-white/60">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
