'use client'

import { refereeQuestions } from '@/lib/game-data'
import { ChoiceQuiz } from '@/components/choice-quiz'

export function RefereeGame() {
  return <ChoiceQuiz quizId="referee-decisions-1" title="Referee Decisions" items={refereeQuestions.map((q) => ({ prompt: q.scenario, options: q.options, answer: q.answer, explanation: q.explanation }))} />
}
