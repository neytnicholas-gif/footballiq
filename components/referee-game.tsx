'use client'

import { useMemo, useState } from 'react'
import { ChoiceQuiz } from '@/components/choice-quiz'
import { refereeQuestions } from '@/lib/game-data'

const SESSION_SIZE = 10

export function RefereeGame() {
  const [offset, setOffset] = useState(0)
  const session = useMemo(() => Array.from({ length: SESSION_SIZE }, (_, index) => refereeQuestions[(offset + index * 7) % refereeQuestions.length]!), [offset])
  const scenarioIds = session.map((question) => question.id!).filter(Boolean)
  return (
    <ChoiceQuiz
      key={offset}
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
      onRestart={() => setOffset((current) => (current + SESSION_SIZE) % refereeQuestions.length)}
    />
  )
}
