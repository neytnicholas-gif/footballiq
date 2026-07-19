'use client'

import { scoutQuestions } from '@/lib/game-data'
import { ChoiceQuiz } from '@/components/choice-quiz'

export function ScoutGame() {
  return <ChoiceQuiz quizId="would-you-scout-1" title="Would You Scout Him?" items={scoutQuestions.map((q) => ({ prompt: `${q.title}\n\n${q.profile.join(' • ')}`, options: q.options, answer: q.answer, explanation: q.explanation }))} />
}
