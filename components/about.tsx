import { Reveal } from '@/components/reveal'

const audience = ['Fans', 'Referees', 'Scouts', 'Analysts']

export function About() {
  return (
    <section id="about" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-14">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-[120px]"
        />
        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="text-sm font-medium uppercase tracking-widest text-primary">
              About RefDecision
            </span>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for everyone who loves the details of the game
            </h2>
            <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
              RefDecision is an educational football platform built for people who want to
              understand the game better. Through short decision quizzes, football analysis and
              community voting, users can test their judgement and improve how they read match
              situations.
            </p>
          </Reveal>

          <Reveal delay={140} className="grid grid-cols-2 gap-4">
            {audience.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-background/50 p-6 text-center"
              >
                <p className="text-lg font-semibold tracking-tight">{item}</p>
                <p className="mt-1 text-xs text-muted-foreground">Welcome here</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
