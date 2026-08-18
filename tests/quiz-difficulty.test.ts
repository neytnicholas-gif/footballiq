import { describe, expect, it } from 'vitest'
import { refereeQuestions, scoutQuestions } from '@/lib/game-data'
import { getLeagueWorldQuestions } from '@/lib/football-leagues'
import { quizLabQuestionBank, quizLabCorrectAnswer } from '@/lib/quiz-lab'
import {
  buildQuizDifficultyIndex,
  filterQuizDifficulty,
  quizDifficulties,
  quizDifficultyCounts,
  quizXp,
} from '@/lib/quiz-difficulty'
import { verifyQuizReward } from '@/lib/quiz-rules'
import { tacticalScenarios } from '@/lib/tactical-scenarios'

const completionKey = 'cqk:difficulty-test:run-123456789012345678901234'

const refereeIndex = buildQuizDifficultyIndex(refereeQuestions, {
  id: (question) => question.id!,
  authored: (question) => question.difficulty ?? 'Medium',
  text: (question) => `${question.scenario} ${question.options.join(' ')} ${question.explanation}`,
})

describe('five-level quiz difficulty', () => {
  it('keeps every major authored pool large enough for a fresh session at every level', () => {
    const pools = [
      quizDifficultyCounts(refereeIndex),
      quizDifficultyCounts(buildQuizDifficultyIndex(tacticalScenarios, {
        id: (scenario) => scenario.id,
        authored: (scenario) => scenario.difficulty,
        text: (scenario) => `${scenario.prompt} ${scenario.context} ${scenario.explanation}`,
      })),
      quizDifficultyCounts(buildQuizDifficultyIndex(scoutQuestions, {
        id: (question) => question.id,
        authored: (question) => question.difficulty ?? 'Sharp',
        text: (question) => `${question.title} ${question.summary} ${question.concerns} ${question.missingInformation}`,
      })),
      ...Object.values(quizLabQuestionBank).map((questions) => quizDifficultyCounts(buildQuizDifficultyIndex(questions, {
        id: (question) => question.id,
        authored: (question) => question.difficulty,
        text: (question) => `${question.prompt} ${question.explanation} ${question.takeaway}`,
      }))),
    ]

    for (const counts of pools) {
      for (const difficulty of quizDifficulties) expect(counts[difficulty]).toBeGreaterThanOrEqual(12)
    }
  })

  it('awards progressively more XP for the same performance', () => {
    const rewards = quizDifficulties.map((difficulty) => quizXp(120, difficulty))
    expect(rewards).toEqual([90, 108, 120, 150, 180])
    expect(rewards.every((reward, index) => index === 0 || reward > rewards[index - 1]!)).toBe(true)
  })

  it('verifies Expert referee sessions and rejects easier question IDs relabelled as Expert', () => {
    const expert = filterQuizDifficulty(refereeQuestions, 'expert', refereeIndex, (question) => question.id!).slice(0, 10)
    const beginner = filterQuizDifficulty(refereeQuestions, 'beginner', refereeIndex, (question) => question.id!).slice(0, 10)
    const valid = verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: 10,
      total: 10,
      completionKey,
      proof: { kind: 'scenario-choice', scenarioIds: expert.map((question) => question.id!), answers: expert.map((question) => question.answer), difficulty: 'expert' },
    })
    expect(valid.xp).toBe(240)

    expect(() => verifyQuizReward({
      quizId: 'referee-decisions-1',
      score: 10,
      total: 10,
      completionKey,
      proof: { kind: 'scenario-choice', scenarioIds: beginner.map((question) => question.id!), answers: beginner.map((question) => question.answer), difficulty: 'expert' },
    })).toThrow('outside the chosen difficulty')
  })

  it('verifies a difficulty-filtered Quiz Lab session from server-known question IDs', () => {
    const questions = quizLabQuestionBank['odd-one-out']
    const index = buildQuizDifficultyIndex(questions, {
      id: (question) => question.id,
      authored: (question) => question.difficulty,
      text: (question) => `${question.prompt} ${question.explanation} ${question.takeaway}`,
    })
    const hard = filterQuizDifficulty(questions, 'hard', index, (question) => question.id).slice(0, 12)
    const result = verifyQuizReward({
      quizId: 'quiz-lab-odd-one-out',
      score: hard.length,
      total: hard.length,
      completionKey,
      proof: { kind: 'quiz-lab', format: 'odd-one-out', questionIds: hard.map((question) => question.id), answers: hard.map(quizLabCorrectAnswer), difficulty: 'hard' },
    })
    expect(result.xp).toBe(225)
  })

  it('verifies short Scout Vision sessions without trusting the browser multiplier', () => {
    const index = buildQuizDifficultyIndex(scoutQuestions, {
      id: (question) => question.id,
      authored: (question) => question.difficulty ?? 'Sharp',
      text: (question) => `${question.title} ${question.summary} ${question.profile.join(' ')} ${question.concerns} ${question.missingInformation}`,
    })
    const expert = filterQuizDifficulty(scoutQuestions, 'expert', index, (question) => question.id).slice(0, 10)
    const result = verifyQuizReward({
      quizId: 'would-you-scout-1',
      score: 20,
      total: 20,
      completionKey,
      proof: { kind: 'scout-dossier', scenarioIds: expert.map((question) => question.id), answers: expert.map((question) => question.strongestDecision), difficulty: 'expert' },
    })
    expect(result.xp).toBe(225)
  })

  it('keeps League World level slices fixed and rejects relabelled easy questions', () => {
    const questions = getLeagueWorldQuestions('premier-league')
    const hardIndexes = [9, 10, 11]
    const hard = verifyQuizReward({
      quizId: 'league-world-premier-league',
      score: 3,
      total: 3,
      completionKey,
      proof: { kind: 'choice', questionIndexes: hardIndexes, answers: hardIndexes.map((index) => questions[index]!.answer), difficulty: 'hard' },
    })
    expect(hard.xp).toBe(113)

    expect(() => verifyQuizReward({
      quizId: 'league-world-premier-league',
      score: 3,
      total: 3,
      completionKey,
      proof: { kind: 'choice', questionIndexes: [0, 1, 2], answers: [questions[0]!.answer, questions[1]!.answer, questions[2]!.answer], difficulty: 'hard' },
    })).toThrow('outside the chosen difficulty')
  })
})
