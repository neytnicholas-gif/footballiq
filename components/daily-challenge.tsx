'use client'

import { ChoiceQuiz } from '@/components/choice-quiz'
import { refereeQuestions } from '@/lib/game-data'
import { getBrusselsDateISO } from '@/lib/brussels-time'

function seedFromIsoDate(isoDate: string) {
  return Number(isoDate.replaceAll('-', ''))
}

export function DailyChallenge() {
  const date = getBrusselsDateISO()
  const seed = seedFromIsoDate(date)
  const items = Array.from({ length: 5 }, (_, i) => refereeQuestions[(seed + i * 3) % refereeQuestions.length]).map((q) => ({ prompt: q.scenario, options: q.options, answer: q.answer, explanation: q.explanation }))
  return <ChoiceQuiz quizId={`daily-${date}`} title="Today’s FootballIQ" items={items} />
}
