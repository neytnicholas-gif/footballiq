'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChoiceQuiz } from '@/components/choice-quiz'
import { refereeQuestions } from '@/lib/game-data'
import { createQuizSessionSeed, sampleBalancedQuizSession } from '@/lib/quiz-session'

const SESSION_SIZE = 10
const SESSION_STORAGE_KEY = 'early-shout:referee-session-seed'

export function RefereeGame() {
  const [sessionSeed, setSessionSeed] = useState<number | null>(null)
  const session = useMemo(() => sessionSeed === null ? [] : sampleBalancedQuizSession(
    refereeQuestions,
    SESSION_SIZE,
    sessionSeed,
    (question) => !/^ref-\d{3}$/.test(question.id ?? ''),
  ), [sessionSeed])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.sessionStorage.getItem(SESSION_STORAGE_KEY))
      const nextSeed = Number.isSafeInteger(stored) && stored > 0 ? stored : createQuizSessionSeed()
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(nextSeed))
      setSessionSeed(nextSeed)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  function newSession() {
    const nextSeed = createQuizSessionSeed()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(nextSeed))
    setSessionSeed(nextSeed)
  }

  if (sessionSeed === null || !session.length) {
    return <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Building a fresh Referee Arena round…</div>
  }

  const scenarioIds = session.map((question) => question.id!).filter(Boolean)
  return (
    <ChoiceQuiz
      key={sessionSeed}
      quizId="referee-decisions-1"
      title="Referee Arena"
      labels={{
        unitSingular: 'Scenario',
        unitPlural: 'scenarios',
        nextAction: 'Next scenario',
        finishAction: 'Finish and save Arena XP',
        restartAction: 'Run scenarios again',
      }}
      items={session.map((q) => ({ prompt: q.scenario, options: q.options, answer: q.answer, explanation: q.explanation }))}
      answerProof={(answers) => ({ kind: 'scenario-choice', scenarioIds, answers })}
      onRestart={newSession}
    />
  )
}
