import { describe, expect, it } from 'vitest'
import { duelPacks } from '@/lib/duel-packs'
import { refereeQuestions } from '@/lib/game-data'
import { verifyQuizReward } from '@/lib/quiz-rules'
import { tacticalScenarios } from '@/lib/tactical-scenarios'
import { sampleQuizSession } from '@/lib/quiz-session'

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

  it('verifies a short referee session by scenario id', () => {
    const session = refereeQuestions.slice(0, 10)
    const result = verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: session.length,
      total: session.length,
      completionKey,
      proof: { kind: 'scenario-choice', scenarioIds: session.map((question) => question.id!), answers: session.map((question) => question.answer) },
    })
    expect(result.score).toBe(10)
    expect(result.xp).toBe(160)
  })

  it('rejects abbreviated sessions that could farm completion bonuses', () => {
    const refereeSession = refereeQuestions.slice(0, 9)
    expect(() => verifyQuizReward({
      quizId: 'referee-decisions-1', score: 9, total: 9, completionKey,
      proof: { kind: 'scenario-choice', scenarioIds: refereeSession.map((question) => question.id!), answers: refereeSession.map((question) => question.answer) },
    })).toThrow('Referee session proof is invalid')

    expect(() => verifyQuizReward({
      quizId: 'quiz-lab-odd-one-out', score: 1, total: 1, completionKey,
      proof: { kind: 'quiz-lab', format: 'odd-one-out', round: 1, questionIds: ['odd-001'], answers: ['placeholder'] },
    })).toThrow('Quiz Lab answer proof is incomplete')
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

  it('recalculates Tactical Lab rewards from ten unique server-known scenarios', () => {
    const session = tacticalScenarios.slice(0, 10)
    const result = verifyQuizReward({
      quizId: 'tactical-lab-1',
      score: 10,
      total: 10,
      completionKey,
      proof: {
        kind: 'tactical-choice',
        scenarioIds: session.map((scenario) => scenario.id),
        answers: session.map((scenario) => scenario.answer),
      },
    })

    expect(result.score).toBe(10)
    expect(result.xp).toBe(160)
  })

  it('rejects a forged Tactical Lab score', () => {
    const session = tacticalScenarios.slice(0, 10)
    expect(() => verifyQuizReward({
      quizId: 'tactical-lab-1',
      score: 10,
      total: 10,
      completionKey,
      proof: {
        kind: 'tactical-choice',
        scenarioIds: session.map((scenario) => scenario.id),
        answers: session.map((scenario) => (scenario.answer + 1) % scenario.options.length),
      },
    })).toThrow('Claimed score')
  })

  it('samples deterministic, unique quiz sessions without repeating a fixed stride', () => {
    const items = Array.from({ length: 50 }, (_, index) => index)
    const first = sampleQuizSession(items, 10, 12345)
    const repeat = sampleQuizSession(items, 10, 12345)
    const fresh = sampleQuizSession(items, 10, 54321)

    expect(first).toEqual(repeat)
    expect(new Set(first).size).toBe(10)
    expect(fresh).not.toEqual(first)
  })
})
