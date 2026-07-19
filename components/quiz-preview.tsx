'use client'

import { useState } from 'react'
import { Check, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

const options = ['No Foul', 'Foul', 'Yellow Card', 'Red Card', 'Play On', 'VAR Review']

const correctAnswer = 'Yellow Card'

const communityVotes: Record<string, number> = {
  'No Foul': 6,
  Foul: 21,
  'Yellow Card': 48,
  'Red Card': 14,
  'Play On': 4,
  'VAR Review': 7,
}

export function QuizPreview() {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  return (
    <section id="quiz" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          Referee Quiz
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          You&apos;re the referee. Make the call.
        </h2>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          {/* Video placeholder */}
          <div className="relative aspect-video w-full overflow-hidden bg-secondary">
            <img
              src="/images/blog-mistakes.png"
              alt="Match situation clip"
              className="size-full object-cover opacity-70"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40">
              <button
                type="button"
                aria-label="Play clip"
                className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 hover:scale-105 glow-green"
              >
                <Play className="size-8 translate-x-0.5" fill="currentColor" />
              </button>
            </div>
            <div className="absolute left-4 top-4 rounded-full bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur">
              Clip #148 · Premier League
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h3 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
              What is the correct decision?
            </h3>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map((option) => {
                const isSelected = selected === option
                const isCorrect = submitted && option === correctAnswer
                const isWrongPick = submitted && isSelected && option !== correctAnswer
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelected(option)}
                    className={cn(
                      'flex items-center justify-center rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200',
                      'disabled:cursor-not-allowed',
                      isSelected && !submitted && 'border-primary bg-primary/10 text-foreground',
                      !isSelected && !submitted &&
                        'border-border bg-secondary/50 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      isCorrect && 'border-primary bg-primary text-primary-foreground',
                      isWrongPick && 'border-destructive/60 bg-destructive/15 text-foreground',
                      submitted && !isCorrect && !isWrongPick &&
                        'border-border bg-secondary/30 text-muted-foreground opacity-60',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            <Button
              size="lg"
              disabled={!selected || submitted}
              onClick={() => setSubmitted(true)}
              className="mt-6 h-12 w-full rounded-xl text-base font-medium glow-green disabled:opacity-50 disabled:glow-green"
            >
              {submitted ? 'Answer revealed' : 'Submit decision'}
            </Button>

            {/* Answer reveal */}
            <div
              className={cn(
                'grid transition-all duration-500 ease-out',
                submitted ? 'mt-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" />
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">
                      Correct decision:{' '}
                      <span className="font-semibold text-primary">{correctAnswer}</span>
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    The defender uses excessive force in a reckless challenge but without
                    endangering the opponent&apos;s safety. Under Law 12, this constitutes an
                    act of unsporting behaviour and must be sanctioned with a caution.
                  </p>

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      How the community voted
                    </p>
                    {options
                      .slice()
                      .sort((a, b) => communityVotes[b] - communityVotes[a])
                      .map((option) => (
                        <div key={option}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span
                              className={cn(
                                option === correctAnswer
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {option}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {communityVotes[option]}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-1000 ease-out',
                                option === correctAnswer ? 'bg-primary' : 'bg-muted-foreground/50',
                              )}
                              style={{ width: submitted ? `${communityVotes[option]}%` : '0%' }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
