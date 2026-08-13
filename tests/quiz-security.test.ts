import { describe, expect, it } from 'vitest'
import { duelPacks } from '@/lib/duel-packs'
import { refereeQuestions } from '@/lib/game-data'
import { verifyQuizReward } from '@/lib/quiz-rules'

const completionKey = 'cqk:security-test:run-123456789012345678901234'

describe('server-owned quiz rewards', () => {
  it('recalculates the referee score and reward from submitted answers', () => {
    const total = refereeQuestions.length
    const result = verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: total,
      total,
      completionKey,
      proof: { kind: 'choice', answers: refereeQuestions.map((question) => question.answer) },
    })

    expect(result.xp).toBe(20 + total * 10 + 40)
  })

  it('rejects a fabricated perfect score, unknown quizzes and fabricated lengths', () => {
    const wrongAnswers = refereeQuestions.map((question) => (question.answer + 1) % question.options.length)
    expect(() => verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: refereeQuestions.length,
      total: refereeQuestions.length,
      completionKey,
      proof: { kind: 'choice', answers: wrongAnswers },
    })).toThrow('Claimed score')

    expect(() => verifyQuizReward({
      quizId: 'made-up-perfect-score',
      score: 1,
      total: 1,
      completionKey,
      proof: { kind: 'choice', answers: [0] },
    })).toThrow('Unknown quiz')

    expect(() => verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: 1,
      total: 1,
      completionKey,
      proof: { kind: 'choice', answers: [0] },
    })).toThrow('Quiz length')
  })

  it('rejects impossible duel timing instead of trusting browser points', () => {
    const pack = duelPacks[0]!
    const answers = pack.questions.map((question) => ({
      left: question.left.name,
      right: question.right.name,
      choice: (question.left.value === question.right.value ? 'same' : question.left.value > question.right.value ? 'left' : 'right') as 'left' | 'right' | 'same',
      speed: 'timed' as const,
      timeLeft: 16,
    }))
    expect(() => verifyQuizReward({
      quizId: pack.id,
      score: pack.questions.length,
      total: pack.questions.length,
      completionKey,
      metrics: { bestCombo: 999, points: 999_999 },
      proof: { kind: 'duel', packId: pack.id, answers },
    })).toThrow('time proof')
  })
})
