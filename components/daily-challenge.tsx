'use client'

import { ChoiceQuiz } from '@/components/choice-quiz'
import { refereeQuestions } from '@/lib/game-data'

function dayNumber() {
  const now = new Date()
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000)
}

export function DailyChallenge() {
  const seed = dayNumber()
  const items = Array.from({ length: 5 }, (_, i) => refereeQuestions[(seed + i * 3) % refereeQuestions.length]).map((q) => ({ prompt: q.scenario, options: q.options, answer: q.answer, explanation: q.explanation }))
  const date = new Date().toISOString().slice(0, 10)
  return <ChoiceQuiz quizId={`daily-${date}`} title="Today’s FootballIQ" items={items} />
}
