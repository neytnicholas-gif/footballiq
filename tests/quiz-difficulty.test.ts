import { describe, expect, it } from 'vitest'
import { buildDailyDuelPack, duelPacks, getDuelPackDifficulty } from '@/lib/duel-packs'
import { higherLowerDecks, refereeQuestions, scoutQuestions } from '@/lib/game-data'
import { getLeagueWorldQuestions } from '@/lib/football-leagues'
import {
  getCareerDifficultyRound,
  getWhoAmIDifficultyRound,
  playerKnowledgeDifficultyTiers,
  playerKnowledgeProfiles,
} from '@/lib/player-knowledge-bank'
import { calculateDuelXp } from '@/lib/progression'
import { quizLabQuestionBank, quizLabCorrectAnswer, quizLabDifficultyText } from '@/lib/quiz-lab'
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
  text: (question) => `${question.scenario} ${question.options.join(' ')}`,
})

describe('five-level quiz difficulty', () => {
  it('splits all 100 player-knowledge profiles into five intentional, non-overlapping levels', () => {
    const tieredNames = quizDifficulties.flatMap((difficulty) => playerKnowledgeDifficultyTiers[difficulty])
    expect(tieredNames).toHaveLength(100)
    expect(new Set(tieredNames).size).toBe(100)
    expect(new Set(tieredNames)).toEqual(new Set(playerKnowledgeProfiles.map((profile) => profile.answer)))

    for (const difficulty of quizDifficulties) {
      const first = getWhoAmIDifficultyRound(difficulty, 1)
      const second = getWhoAmIDifficultyRound(difficulty, 2)
      expect(first).toHaveLength(10)
      expect(second).toHaveLength(10)
      expect(new Set([...first, ...second].map((question) => question.answer)).size).toBe(20)
      expect(getCareerDifficultyRound(difficulty, 1)).toHaveLength(10)
      expect(getCareerDifficultyRound(difficulty, 2)).toHaveLength(10)
    }
  })

  it('gives Football Duels and Higher or Lower real content at every level', () => {
    for (const difficulty of quizDifficulties) {
      expect(duelPacks.filter((pack) => getDuelPackDifficulty(pack.id) === difficulty).length).toBeGreaterThan(0)
      expect(higherLowerDecks.filter((deck) => deck.difficulty === difficulty).length).toBeGreaterThan(0)
    }
  })

  it('keeps every major authored pool large enough for a fresh session at every level', () => {
    const pools = [
      quizDifficultyCounts(refereeIndex),
      quizDifficultyCounts(buildQuizDifficultyIndex(tacticalScenarios, {
        id: (scenario) => scenario.id,
        authored: (scenario) => scenario.difficulty,
        text: (scenario) => `${scenario.prompt} ${scenario.context} ${scenario.options.join(' ')}`,
      })),
      quizDifficultyCounts(buildQuizDifficultyIndex(scoutQuestions, {
        id: (question) => question.id,
        authored: (question) => question.difficulty ?? 'Sharp',
        text: (question) => `${question.title} ${question.summary} ${question.concerns} ${question.missingInformation}`,
      })),
      ...Object.values(quizLabQuestionBank).map((questions) => quizDifficultyCounts(buildQuizDifficultyIndex(questions, {
        id: (question) => question.id,
        authored: (question) => question.difficulty,
        text: quizLabDifficultyText,
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
      text: quizLabDifficultyText,
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
    const hardIndexes = [15, 16, 17, 18, 19]
    const hard = verifyQuizReward({
      quizId: 'league-world-premier-league',
      score: 5,
      total: 5,
      completionKey,
      proof: { kind: 'choice', questionIndexes: hardIndexes, answers: hardIndexes.map((index) => questions[index]!.answer), difficulty: 'hard' },
    })
    expect(hard.xp).toBe(138)

    expect(() => verifyQuizReward({
      quizId: 'league-world-premier-league',
      score: 5,
      total: 5,
      completionKey,
      proof: { kind: 'choice', questionIndexes: [0, 1, 2, 3, 4], answers: [questions[0]!.answer, questions[1]!.answer, questions[2]!.answer, questions[3]!.answer, questions[4]!.answer], difficulty: 'hard' },
    })).toThrow('outside the chosen difficulty')
  })

  it('server-verifies difficulty-ranked Career Path and Who Am I sessions', () => {
    for (const difficulty of quizDifficulties) {
      const careers = getCareerDifficultyRound(difficulty, 1)
      const career = verifyQuizReward({
        quizId: `career-path-${difficulty}-1`,
        score: 10,
        total: 10,
        completionKey,
        proof: { kind: 'career', difficulty, round: 1, answers: careers.map((question) => question.answer) },
      })
      expect(career.xp).toBe(quizXp(120, difficulty))

      const mysteries = getWhoAmIDifficultyRound(difficulty, 1)
      const mystery = verifyQuizReward({
        quizId: `who-am-i-${difficulty}-1`,
        score: 40,
        total: 40,
        completionKey,
        proof: { kind: 'who-am-i', difficulty, round: 1, answers: mysteries.map((question) => ({ guess: question.answer, clues: 1 })) },
      })
      expect(mystery.xp).toBe(quizXp(140, difficulty))
    }

    const beginner = getCareerDifficultyRound('beginner', 1)
    expect(() => verifyQuizReward({
      quizId: 'career-path-expert-1',
      score: 10,
      total: 10,
      completionKey,
      proof: { kind: 'career', difficulty: 'beginner', round: 1, answers: beginner.map((question) => question.answer) },
    })).toThrow('wrong difficulty')
  })

  it('server-verifies difficulty multipliers for stat games and the deterministic daily duel', () => {
    for (const difficulty of quizDifficulties) {
      const definition = higherLowerDecks.find((deck) => deck.difficulty === difficulty)!
      const seed = 48157
      const deck = seededDeck(definition.items, seed)
      const answers = deck.slice(1).map((right, index) => right.value >= deck[index]!.value)
      const result = verifyQuizReward({
        quizId: `higher-lower-${definition.id}`,
        score: 13,
        total: 13,
        completionKey,
        proof: { kind: 'higher-lower', difficulty, deckId: definition.id, deckSeed: seed, answers },
      })
      expect(result.xp).toBe(quizXp(124, difficulty))

      const pack = duelPacks.find((item) => getDuelPackDifficulty(item.id) === difficulty)!
      const duelResult = verifyQuizReward({
        quizId: pack.id,
        score: 0,
        total: 10,
        completionKey,
        proof: { kind: 'duel', difficulty, packId: pack.id, answers: pack.questions.map((question) => ({ left: question.left.name, right: question.right.name, statLabel: question.statLabel ?? pack.statLabel, choice: 'timeout', speed: 'timed', timeLeft: 0 })) },
      })
      expect(duelResult.xp).toBe(quizXp(calculateDuelXp(0, 10, 0, 0), difficulty))
    }

    const daily = buildDailyDuelPack('2026-08-18')
    const dailyResult = verifyQuizReward({
      quizId: daily.id,
      score: 0,
      total: 10,
      completionKey,
      proof: { kind: 'duel', difficulty: 'normal', packId: daily.id, answers: daily.questions.map((question) => ({ left: question.left.name, right: question.right.name, statLabel: question.statLabel ?? daily.statLabel, choice: 'timeout', speed: 'timed', timeLeft: 0 })) },
    })
    expect(dailyResult.score).toBe(0)
  })
})

function seededDeck<T>(items: T[], seed: number) {
  const copy = [...items]
  let value = seed || 1
  for (let index = copy.length - 1; index > 0; index -= 1) {
    value = (value * 9301 + 49297) % 233280
    const randomIndex = Math.floor((value / 233280) * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex]!, copy[index]!]
  }
  return copy
}
