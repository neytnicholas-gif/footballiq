'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, Flame, RotateCcw, ShieldCheck, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'
import { refereeScenarios } from '@/lib/referee-scenarios'

const SESSION_SIZE = 10

function refereeSession(offset: number) {
  return Array.from({ length: SESSION_SIZE }, (_, index) => refereeScenarios[(offset + index * 7) % refereeScenarios.length])
}

function getLevel(rating: number) {
  if (rating >= 1250) return 'Professional Referee'
  if (rating >= 1150) return 'National Referee'
  if (rating >= 1060) return 'Regional Referee'
  return 'Grassroots Referee'
}

export function RefereeDecisionQuiz() {
  const [sessionOffset, setSessionOffset] = useState(0)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [rating, setRating] = useState(1000)
  const [correct, setCorrect] = useState(0)
  const [played, setPlayed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const scenarios = useMemo(() => refereeSession(sessionOffset), [sessionOffset])

  const scenario = scenarios[index]
  const isCorrect = selected === scenario.answer
  const level = useMemo(() => getLevel(rating), [rating])
  const accuracy = played === 0 ? 0 : Math.round((correct / played) * 100)
  const progress = Math.round(((index + (answered ? 1 : 0)) / scenarios.length) * 100)

  function choose(option: string) {
    if (answered) return
    const right = option === scenario.answer
    setSelected(option)
    setAnswered(true)
    setPlayed((current) => current + 1)
    if (right) {
      setCorrect((current) => current + 1)
      setRating((current) => current + 14)
      setStreak((current) => {
        const next = current + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setRating((current) => Math.max(700, current - 8))
      setStreak(0)
    }
  }

  function next() {
    if (index < scenarios.length - 1) {
      setIndex((current) => current + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  function restart() {
    setSessionOffset((current) => (current + SESSION_SIZE) % refereeScenarios.length)
    setIndex(0)
    setSelected(null)
    setAnswered(false)
    setRating(1000)
    setCorrect(0)
    setPlayed(0)
    setStreak(0)
    setBestStreak(0)
  }

  return (
    <section id="referee" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          Referee mode
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Read it. Make the call. Learn the rule.
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          Read what happened and choose an answer. We show the right call and explain the rule.
        </p>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border bg-background/40 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <span>{scenario.category}</span>
                  <span className="text-primary">•</span>
                  <span>{scenario.difficulty}</span>
                  <span className="text-primary">•</span>
                  <span>Question {index + 1}/{scenarios.length}</span>
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">{scenario.title}</h3>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-2xl font-semibold text-primary">{rating}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-base leading-relaxed text-muted-foreground">
              {scenario.situation}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {scenario.options.map((option) => {
                const picked = selected === option
                const correctAnswer = answered && option === scenario.answer
                const wrongPick = answered && picked && option !== scenario.answer
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(option)}
                    disabled={answered}
                    className={cn(
                      'rounded-2xl border p-4 text-left font-medium transition-all duration-300',
                      !answered && 'border-border bg-background/50 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-secondary/60',
                      correctAnswer && 'border-primary bg-primary/10 text-primary',
                      wrongPick && 'border-destructive/70 bg-destructive/10 text-destructive',
                      answered && !correctAnswer && !wrongPick && 'border-border bg-secondary/20 opacity-60',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={cn('mt-6 rounded-2xl border p-5', isCorrect ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/10')}>
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white')}>
                    {isCorrect ? <BadgeCheck className="size-4" /> : <X className="size-4" />}
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight">
                      {isCorrect ? 'Correct!' : 'Not quite.'} The answer is: {scenario.answer}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{scenario.explanation}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">The rule:</strong> {scenario.principle}</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  {index === scenarios.length - 1 ? (
                    <Button onClick={restart} className="rounded-xl glow-green">
                      <RotateCcw className="size-4" /> Restart mode
                    </Button>
                  ) : (
                    <Button onClick={next} className="rounded-xl glow-green">
                      Next scenario <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Current level</p>
                <p className="font-semibold tracking-tight">{level}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-border bg-secondary/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="text-xl font-semibold text-primary">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-xl font-semibold">{streak}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/30 px-3 py-3">
                <p className="text-xs text-muted-foreground">Best</p>
                <p className="text-xl font-semibold">{bestStreak}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-primary" />
              <h3 className="font-semibold tracking-tight">Addictive loop</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every answer updates your rating, streak and level instantly. Later this can become accounts, daily challenges and real leaderboards.
            </p>
          </div>

          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
            <Trophy className="size-6 text-primary" />
            <h3 className="mt-3 font-semibold tracking-tight">Daily Challenge idea</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              One question each day. Everyone gets the same one. Come back tomorrow to keep your streak.
            </p>
          </div>
        </aside>
      </Reveal>
    </section>
  )
}
