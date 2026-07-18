'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, RotateCcw, Target, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

type Player = {
  name: string
  goals: number
  clubs: string
}

type Question = {
  id: number
  left: Player
  right: Player
  note: string
}

const questions: Question[] = [
  {
    id: 1,
    left: { name: 'Carlos Tevez', goals: 84, clubs: 'West Ham, Man Utd, Man City' },
    right: { name: 'Olivier Giroud', goals: 90, clubs: 'Arsenal, Chelsea' },
    note: 'A close one between two very different striker profiles.',
  },
  {
    id: 2,
    left: { name: 'Raheem Sterling', goals: 123, clubs: 'Liverpool, Man City, Chelsea' },
    right: { name: 'Sadio Mané', goals: 111, clubs: 'Southampton, Liverpool' },
    note: 'Both were elite wide forwards, but one has a clear PL goals edge.',
  },
  {
    id: 3,
    left: { name: 'Fernando Torres', goals: 85, clubs: 'Liverpool, Chelsea' },
    right: { name: 'Dimitar Berbatov', goals: 94, clubs: 'Spurs, Man Utd, Fulham' },
    note: 'Peak Torres felt unstoppable, but career totals tell a different story.',
  },
  {
    id: 4,
    left: { name: 'Harry Kane', goals: 213, clubs: 'Tottenham' },
    right: { name: 'Wayne Rooney', goals: 208, clubs: 'Everton, Man Utd' },
    note: 'Two of the greatest English forwards in Premier League history.',
  },
  {
    id: 5,
    left: { name: 'Cristiano Ronaldo', goals: 103, clubs: 'Man Utd' },
    right: { name: 'Olivier Giroud', goals: 90, clubs: 'Arsenal, Chelsea' },
    note: 'Ronaldo cleared the 100-goal mark in the Premier League.',
  },
  {
    id: 6,
    left: { name: 'David Silva', goals: 60, clubs: 'Man City' },
    right: { name: 'Luis Suárez', goals: 69, clubs: 'Liverpool' },
    note: 'Suárez only needed a short Premier League spell to beat many legends.',
  },
  {
    id: 7,
    left: { name: 'Son Heung-min', goals: 127, clubs: 'Tottenham' },
    right: { name: 'Raheem Sterling', goals: 123, clubs: 'Liverpool, Man City, Chelsea' },
    note: 'A very tight battle between two modern Premier League attackers.',
  },
  {
    id: 8,
    left: { name: 'Thierry Henry', goals: 175, clubs: 'Arsenal' },
    right: { name: 'Frank Lampard', goals: 177, clubs: 'West Ham, Chelsea, Man City' },
    note: 'This is exactly why the quiz is dangerous. Lampard edges Henry.',
  },
  {
    id: 9,
    left: { name: 'Mohamed Salah', goals: 193, clubs: 'Chelsea, Liverpool' },
    right: { name: 'Sergio Agüero', goals: 184, clubs: 'Man City' },
    note: 'Salah moved ahead of Agüero in the all-time Premier League scoring list.',
  },
  {
    id: 10,
    left: { name: 'Kevin De Bruyne', goals: 72, clubs: 'Chelsea, Man City' },
    right: { name: 'Eden Hazard', goals: 85, clubs: 'Chelsea' },
    note: 'Two Belgian icons. Hazard scored more Premier League goals.',
  },
  {
    id: 11,
    left: { name: 'Robin van Persie', goals: 144, clubs: 'Arsenal, Man Utd' },
    right: { name: 'Sadio Mané', goals: 111, clubs: 'Southampton, Liverpool' },
    note: 'Van Persie remains comfortably ahead in Premier League goals.',
  },
]

function getWinner(question: Question) {
  return question.left.goals > question.right.goals ? question.left : question.right
}

export function GoalscorerQuiz() {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const question = questions[index]
  const winner = useMemo(() => getWinner(question), [question])
  const finished = index === questions.length - 1 && answered
  const isCorrect = selected === winner.name
  const progress = Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)

  function answer(playerName: string) {
    if (answered) return
    const correct = playerName === winner.name
    setSelected(playerName)
    setAnswered(true)
    if (correct) {
      setScore((current) => current + 1)
      setStreak((current) => {
        const next = current + 1
        setBestStreak((best) => Math.max(best, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }

  function nextQuestion() {
    if (index < questions.length - 1) {
      setIndex((current) => current + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
  }

  return (
    <section id="quiz" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-3xl text-center">
        <span className="text-sm font-medium uppercase tracking-widest text-primary">
          First playable quiz
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Who scored more Premier League goals?
        </h2>
        <p className="mt-4 text-pretty text-muted-foreground">
          No clips needed. Just football memory, instinct and a little bit of pain when the
          numbers reveal the truth.
        </p>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-12 max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border bg-background/40 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Question {index + 1} of {questions.length}
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  Pick the player with the higher Premier League goal total.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="text-xl font-semibold text-primary">{score}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="text-xl font-semibold">{streak}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Best</p>
                  <p className="text-xl font-semibold">{bestStreak}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              {[question.left, question.right].map((player) => {
                const picked = selected === player.name
                const playerIsWinner = answered && player.name === winner.name
                const wrongPick = answered && picked && player.name !== winner.name

                return (
                  <button
                    key={player.name}
                    type="button"
                    onClick={() => answer(player.name)}
                    disabled={answered}
                    className={cn(
                      'group relative min-h-56 overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300',
                      !answered &&
                        'border-border bg-secondary/40 hover:-translate-y-1 hover:border-primary/50 hover:bg-secondary/70',
                      playerIsWinner && 'border-primary bg-primary/10 glow-green',
                      wrongPick && 'border-destructive/70 bg-destructive/10',
                      answered && !playerIsWinner && !wrongPick && 'border-border bg-secondary/20 opacity-60',
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute -right-16 -top-16 size-44 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:bg-primary/20"
                    />
                    <div className="relative flex h-full flex-col justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                          Player option
                        </p>
                        <h3 className="mt-4 text-balance text-3xl font-semibold tracking-tight">
                          {player.name}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {player.clubs}
                        </p>
                      </div>

                      <div className="mt-8 flex items-end justify-between">
                        <span className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                          Tap to choose
                        </span>
                        {answered && (
                          <div className="text-right">
                            <p className="text-4xl font-semibold tracking-tight text-primary">
                              {player.goals}
                            </p>
                            <p className="text-xs text-muted-foreground">PL goals</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              <div className="flex items-center justify-center">
                <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-muted-foreground">
                  VS
                </div>
              </div>
            </div>

            <div
              className={cn(
                'grid transition-all duration-500 ease-out',
                answered ? 'mt-6 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    'rounded-2xl border p-6',
                    isCorrect ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/10',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                        isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white',
                      )}
                    >
                      {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                    </span>
                    <div>
                      <p className="font-semibold tracking-tight">
                        {isCorrect ? 'Correct.' : 'Wrong one.'} {winner.name} has more.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {question.note} Final answer: {question.left.name} {question.left.goals} —{' '}
                        {question.right.name} {question.right.goals}.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="size-4 text-primary" />
                      <span>Data set: Premier League all-time goals, updated after 2025/26.</span>
                    </div>
                    {finished ? (
                      <Button onClick={restart} className="rounded-xl glow-green">
                        <RotateCcw className="size-4" />
                        Play again
                      </Button>
                    ) : (
                      <Button onClick={nextQuestion} className="rounded-xl glow-green">
                        Next question
                        <ArrowRight className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {finished && (
              <div className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
                <Trophy className="mx-auto size-9 text-primary" />
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  Final score: {score}/{questions.length}
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  This is the first RefDecision format that can launch without images or videos:
                  fast, shareable and easy to expand with hundreds of football duels.
                </p>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
