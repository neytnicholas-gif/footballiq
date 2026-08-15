import { describe, expect, it } from 'vitest'
import { inferModeFromQuizId } from '@/lib/competitive'
import { quizLabCorrectAnswer, quizLabFormats, quizLabQuestionBank, validateQuizLab } from '@/lib/quiz-lab'
import { verifyQuizReward } from '@/lib/quiz-rules'

const completionKey = 'cqk:quiz-lab-test:run-123456789012345678901234'

describe('Quiz Lab', () => {
  it('ships five distinct mechanics with twelve original challenges each', () => {
    expect(quizLabFormats).toHaveLength(5)
    expect(new Set(quizLabFormats.map((format) => format.id)).size).toBe(5)
    expect(new Set(quizLabFormats.map((format) => format.instruction)).size).toBe(5)
    expect(quizLabFormats.reduce((total, format) => total + quizLabQuestionBank[format.id].length, 0)).toBe(60)
    for (const format of quizLabFormats) expect(quizLabQuestionBank[format.id]).toHaveLength(12)
    expect(validateQuizLab()).toEqual([])
  })

  it.each(quizLabFormats.map((format) => [format.id] as const))('server-verifies perfect and empty runs for %s', (format) => {
    const questions = quizLabQuestionBank[format]
    const correct = questions.map(quizLabCorrectAnswer)
    const perfect = verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: questions.length,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, answers: correct },
    })
    expect(perfect.score).toBe(questions.length)
    expect(perfect.xp).toBe(20 + questions.length * 10 + 40)
    expect(inferModeFromQuizId(perfect.quizId)).toBe('quiz-lab')

    const wrong = verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: 0,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, answers: questions.map(() => '__wrong__') },
    })
    expect(wrong.score).toBe(0)
  })

  it('rejects a browser-fabricated perfect score and a mismatched format', () => {
    const format = quizLabFormats[0]!.id
    const questions = quizLabQuestionBank[format]
    expect(() => verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: questions.length,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, answers: questions.map(() => '__wrong__') },
    })).toThrow('Claimed score')

    expect(() => verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: 0,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format: 'truth-trap', answers: questions.map(() => '__wrong__') },
    })).toThrow('incomplete')
  })
})
