'use client'

import { refereeQuestions } from '@/lib/game-data'
import { ChoiceQuiz } from '@/components/choice-quiz'

export function RefereeGame() {
  return (
    <ChoiceQuiz
      quizId="referee-decisions-1"
      title="Referee Arena"
      labels={{
        unitSingular: 'Scenario',
        unitPlural: 'scenarios',
        nextAction: 'Next scenario',
        finishAction: 'Finish and save Arena XP',
        restartAction: 'Run scenarios again',
      }}
      items={refereeQuestions.map((q) => ({ prompt: q.scenario, options: q.options, answer: q.answer, explanation: q.explanation }))}
    />
  )
}
