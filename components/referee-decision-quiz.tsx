'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, Flame, RotateCcw, ShieldCheck, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/reveal'
import { cn } from '@/lib/utils'

type Scenario = {
  id: number
  category: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  title: string
  situation: string
  options: string[]
  answer: string
  explanation: string
}

const scenarios: Scenario[] = [
  {
    id: 1,
    category: 'Restart',
    difficulty: 'Easy',
    title: 'Goalkeeper handles a deliberate pass',
    situation:
      'A defender deliberately kicks the ball back to his goalkeeper. The goalkeeper picks it up inside the penalty area.',
    options: ['Play on', 'Indirect free kick', 'Direct free kick', 'Dropped ball'],
    answer: 'Indirect free kick',
    explanation:
      'When a goalkeeper handles a deliberate kick from a teammate, the restart is an indirect free kick from where the handling occurred, subject to the goal-area exception.',
  },
  {
    id: 2,
    category: 'Disciplinary',
    difficulty: 'Medium',
    title: 'Stopping a promising attack',
    situation:
      'An attacker breaks through midfield with two teammates ahead. A defender pulls his shirt and stops the attack before he can release the pass.',
    options: ['No card', 'Yellow card', 'Red card', 'Second whistle only'],
    answer: 'Yellow card',
    explanation:
      'This is normally SPA: stopping a promising attack. It is usually a caution unless the criteria for DOGSO are clearly present.',
  },
  {
    id: 3,
    category: 'DOGSO',
    difficulty: 'Hard',
    title: 'Penalty plus card decision',
    situation:
      'A striker is one-on-one with the goalkeeper inside the penalty area. A defender makes no attempt to play the ball and pulls him down from behind.',
    options: ['Penalty only', 'Penalty + yellow', 'Penalty + red', 'Indirect free kick + yellow'],
    answer: 'Penalty + red',
    explanation:
      'If DOGSO occurs in the penalty area and there is no genuine attempt to play the ball, the punishment remains a red card plus penalty.',
  },
  {
    id: 4,
    category: 'Advantage',
    difficulty: 'Medium',
    title: 'Advantage or whistle?',
    situation:
      'A midfielder is fouled, but the ball immediately rolls to his teammate who has space to attack with numbers forward.',
    options: ['Stop play immediately', 'Play advantage', 'Dropped ball', 'Book the fouled player'],
    answer: 'Play advantage',
    explanation:
      'If the non-offending team has a clear attacking benefit, playing advantage is usually the better decision. The referee can still return to caution the offender later if needed.',
  },
  {
    id: 5,
    category: 'Handball',
    difficulty: 'Hard',
    title: 'Arm above shoulder',
    situation:
      'A defender jumps to block a cross. The ball hits his arm, which is raised clearly above shoulder height and makes his body bigger.',
    options: ['No handball', 'Handball', 'Indirect free kick', 'Only handball if intentional'],
    answer: 'Handball',
    explanation:
      'An arm above shoulder height that makes the body bigger is usually punishable unless the player has a very clear footballing justification for that movement.',
  },
]

function getLevel(rating: number) {
  if (rating >= 1250) return 'Professional Referee'
  if (rating >= 1150) return 'National Referee'
  if (rating >= 1060) return 'Regional Referee'
  return 'Grassroots Referee'
}

export function RefereeDecisionQuiz() {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [rating, setRating] = useState(1000)
  const [correct, setCorrect] = useState(0)
  const [played, setPlayed] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

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
        <span className="text-sm font-medium uppercase tracking-[0.32em] text-primary">
          Referee Arena
        </span>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Night-stadium decisions with VAR energy.
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
          The match-day atmosphere is dramatic, but the decision loop stays clear: read, choose, learn and climb.
        </p>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[32px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(247,212,75,0.16),_transparent_30%),linear-gradient(135deg,_rgba(7,9,18,0.98),_rgba(16,24,42,0.95))] shadow-[0_25px_80px_-36px_rgba(247,212,75,0.55)]">
          <div className="border-b border-white/10 bg-black/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-white/60">
                  <span>{scenario.category}</span>
                  <span className="text-primary">•</span>
                  <span>{scenario.difficulty}</span>
                  <span className="text-primary">•</span>
                  <span>Question {index + 1}/{scenarios.length}</span>
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{scenario.title}</h3>
              </div>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Rating</p>
                <p className="text-2xl font-semibold text-amber-300">{rating}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-base leading-relaxed text-white/75">
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
                      'rounded-[20px] border p-4 text-left font-medium text-white transition-all duration-300',
                      !answered && 'border-white/10 bg-white/8 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/12',
                      correctAnswer && 'border-primary bg-primary/10 text-primary',
                      wrongPick && 'border-destructive/70 bg-destructive/10 text-destructive',
                      answered && !correctAnswer && !wrongPick && 'border-white/10 bg-white/6 opacity-60',
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {answered && (
              <div className={cn('mt-6 rounded-[24px] border p-5', isCorrect ? 'border-primary/40 bg-primary/10' : 'border-destructive/40 bg-destructive/10')}>
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', isCorrect ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white')}>
                    {isCorrect ? <BadgeCheck className="size-4" /> : <X className="size-4" />}
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight text-white">
                      {isCorrect ? 'Correct decision.' : 'Not the best decision.'} Answer: {scenario.answer}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{scenario.explanation}</p>
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
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm text-white/60">Current level</p>
                <p className="font-semibold tracking-tight text-white">{level}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Accuracy</p>
                <p className="text-xl font-semibold text-primary">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Streak</p>
                <p className="text-xl font-semibold text-white">{streak}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Best</p>
                <p className="text-xl font-semibold text-white">{bestStreak}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-6 backdrop-blur">
            <div className="flex items-center gap-2">
              <Flame className="size-5 text-primary" />
              <h3 className="font-semibold tracking-tight text-white">Addictive loop</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Every answer updates your rating, streak and level instantly. Later this can become accounts, daily challenges and real leaderboards.
            </p>
          </div>

          <div className="rounded-[28px] border border-primary/30 bg-primary/10 p-6">
            <Trophy className="size-6 text-primary" />
            <h3 className="mt-3 font-semibold tracking-tight text-white">Daily Challenge idea</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              One scenario per day. Everyone gets the same question. Keep your streak alive and compare the community vote.
            </p>
          </div>
        </aside>
      </Reveal>
    </section>
  )
}
