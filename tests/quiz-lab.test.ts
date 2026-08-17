import { describe, expect, it } from 'vitest'
import { inferModeFromQuizId } from '@/lib/competitive'
import {
  getQuizLabRound,
  quizLabCorrectAnswer,
  quizLabFormats,
  quizLabQuestionBank,
  quizLabRoundCount,
  quizLabRoundName,
  type QuizLabChoiceQuestion,
  validateQuizLab,
} from '@/lib/quiz-lab'
import { verifyQuizReward } from '@/lib/quiz-rules'

const completionKey = 'cqk:quiz-lab-test:run-123456789012345678901234'

describe('Quiz Lab', () => {
  it('ships five distinct mechanics with 240 questions in every bank', () => {
    expect(quizLabFormats).toHaveLength(5)
    expect(new Set(quizLabFormats.map((format) => format.id)).size).toBe(5)
    expect(new Set(quizLabFormats.map((format) => format.instruction)).size).toBe(5)
    expect(quizLabQuestionBank['odd-one-out']).toHaveLength(240)
    expect(quizLabFormats.reduce((total, format) => total + quizLabQuestionBank[format.id].length, 0)).toBe(1200)
    for (const format of quizLabFormats) expect(quizLabQuestionBank[format.id]).toHaveLength(240)
    expect(validateQuizLab()).toEqual([])
  })

  it('keeps every bank and round short, distinct and difficulty-balanced', () => {
    for (const format of quizLabFormats) {
      const bank = quizLabQuestionBank[format.id]
      expect(quizLabRoundCount(format.id)).toBe(20)
      expect(new Set(bank.map((question) => question.id)).size).toBe(240)
      expect(bank.filter((question) => question.difficulty === 'Starter')).toHaveLength(48)
      expect(bank.filter((question) => question.difficulty === 'Sharp')).toHaveLength(128)
      expect(bank.filter((question) => question.difficulty === 'Expert')).toHaveLength(64)
      if (format.id === 'odd-one-out' || format.id === 'truth-trap' || format.id === 'formation-fix') {
        const choiceBank = bank as QuizLabChoiceQuestion[]
        expect(choiceBank.reduce((positions, question) => {
          positions[question.options.indexOf(question.answer)] += 1
          return positions
        }, [0, 0, 0, 0])).toEqual([60, 60, 60, 60])
      }
      for (let round = 1; round <= 20; round += 1) {
        const questions = getQuizLabRound(format.id, round)
        expect(questions).toHaveLength(12)
        expect(new Set(questions.map((question) => question.id)).size).toBe(12)
        expect(quizLabRoundName(format.id, round)).not.toMatch(/ Round \d+$/)
      }
    }
  })

  const formatRounds = quizLabFormats.flatMap((format) => (
    Array.from({ length: quizLabRoundCount(format.id) }, (_, roundIndex) => [format.id, roundIndex + 1] as const)
  ))

  it.each(formatRounds)('server-verifies perfect and empty runs for %s round %s', (format, round) => {
    const questions = getQuizLabRound(format, round)
    const correct = questions.map(quizLabCorrectAnswer)
    const perfect = verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: questions.length,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, round, answers: correct },
    })
    expect(perfect.score).toBe(questions.length)
    expect(perfect.xp).toBe(20 + questions.length * 10 + 40)
    expect(inferModeFromQuizId(perfect.quizId)).toBe('quiz-lab')

    const wrong = verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: 0,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, round, answers: questions.map(() => '__wrong__') },
    })
    expect(wrong.score).toBe(0)
  })

  it('rejects a browser-fabricated perfect score and a mismatched format', () => {
    const format = quizLabFormats[0]!.id
    const questions = getQuizLabRound(format, 1)
    expect(() => verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: questions.length,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format, round: 1, answers: questions.map(() => '__wrong__') },
    })).toThrow('Claimed score')

    expect(() => verifyQuizReward({
      quizId: `quiz-lab-${format}`,
      score: 0,
      total: questions.length,
      completionKey,
      proof: { kind: 'quiz-lab', format: 'truth-trap', round: 1, answers: questions.map(() => '__wrong__') },
    })).toThrow('incomplete')
  })

  it('rejects unknown Quiz Lab rounds', () => {
    expect(() => getQuizLabRound('truth-trap', 0)).toThrow('outside the available range')
    expect(() => getQuizLabRound('formation-fix', 21)).toThrow('outside the available range')
    expect(() => verifyQuizReward({
      quizId: 'quiz-lab-odd-one-out',
      score: 0,
      total: 12,
      completionKey,
      proof: { kind: 'quiz-lab', format: 'odd-one-out', round: 21, answers: Array(12).fill('__wrong__') },
    })).toThrow('outside the available range')
  })
})
