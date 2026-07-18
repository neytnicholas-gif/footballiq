import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20"
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-20">
        <img
          src="/images/hero-pitch.png"
          alt=""
          aria-hidden="true"
          className="size-full object-cover opacity-60"
        />
      </div>
      {/* Overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/60 to-background"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]"
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              Goalscorer mode + referee mode live
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              Build Your Football{' '}
              <span className="text-primary text-glow">IQ Rating</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Play addictive football quizzes without needing clips yet: goalscorer duels, referee scenarios, streaks, ratings and daily challenge ideas ready to expand.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                nativeButton={false}
                render={<a href="#quiz" />}
                className="h-12 rounded-xl px-7 text-base font-medium glow-green"
              >
                Start Goalscorer Quiz
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#referee" />}
                className="h-12 rounded-xl border-border bg-card/40 px-7 text-base font-medium backdrop-blur hover:bg-card"
              >
                <Play className="size-4" />
                Referee Mode
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6">
              {[
                { value: '11', label: 'Goalscorer duels' },
                { value: '5', label: 'Referee scenarios' },
                { value: '1000', label: 'Starting rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
