'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChoiceQuiz } from '@/components/choice-quiz'
import { QuizDifficultyPicker, useQuizDifficulty } from '@/components/quiz-difficulty-picker'
import { refereeQuestions } from '@/lib/game-data'
import { buildQuizDifficultyIndex, filterQuizDifficulty, quizDifficultyCounts } from '@/lib/quiz-difficulty'
import { createQuizSessionSeed, sampleQuizSession } from '@/lib/quiz-session'

const SESSION_SIZE = 10
const SESSION_STORAGE_KEY = 'early-shout:referee-session-seed'
const difficultyIndex = buildQuizDifficultyIndex(refereeQuestions, {
  id: (question) => question.id!,
  authored: (question) => question.difficulty ?? 'Medium',
  text: (question) => `${question.scenario} ${question.options.join(' ')} ${question.explanation}`,
})
const difficultyCounts = quizDifficultyCounts(difficultyIndex)

export function RefereeGame() {
  const { difficulty, setDifficulty, ready } = useQuizDifficulty('referee-arena')
  const [sessionSeed, setSessionSeed] = useState<number | null>(null)
  const session = useMemo(() => sessionSeed === null ? [] : sampleQuizSession(
    filterQuizDifficulty(refereeQuestions, difficulty, difficultyIndex, (question) => question.id!),
    SESSION_SIZE,
    sessionSeed,
  ), [difficulty, sessionSeed])

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

  function changeDifficulty(nextDifficulty: typeof difficulty) {
    setDifficulty(nextDifficulty)
    newSession()
  }

  if (!ready || sessionSeed === null || !session.length) {
    return <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Building a fresh Referee Arena round…</div>
  }

  const scenarioIds = session.map((question) => question.id!).filter(Boolean)
  return (
    <div className="space-y-5">
      <QuizDifficultyPicker value={difficulty} onChange={changeDifficulty} counts={difficultyCounts} />
      <ChoiceQuiz
      key={`${difficulty}:${sessionSeed}`}
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
      answerProof={(answers) => ({ kind: 'scenario-choice', scenarioIds, answers, difficulty })}
      onRestart={newSession}
      difficulty={difficulty}
    />
    </div>
  )
}
