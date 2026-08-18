import { describe, expect, it } from 'vitest'
import { footballLeagues, getLeagueWorldQuestions } from '@/lib/football-leagues'
import { verifyQuizReward } from '@/lib/quiz-rules'

describe('League World', () => {
  it('contains 24 unique rooms and all four nationwide English divisions', () => {
    expect(footballLeagues).toHaveLength(24)
    expect(new Set(footballLeagues.map((league) => league.key)).size).toBe(24)
    expect(footballLeagues.filter((league) => league.country === 'England').map((league) => league.key)).toEqual([
      'premier-league','championship','league-one','league-two',
    ])
  })

  it.each(footballLeagues.map((league) => [league.key] as const))('builds a valid, server-scoreable room for %s', (key) => {
    const questions = getLeagueWorldQuestions(key)
    expect(questions).toHaveLength(15)
    for (const question of questions) {
      expect(question.options).toHaveLength(4)
      expect(new Set(question.options).size).toBe(4)
      expect(question.answer).toBeGreaterThanOrEqual(0)
      expect(question.answer).toBeLessThan(4)
    }
    const answerSignatures = questions.map((question) => JSON.stringify({
      correct: question.options[question.answer],
      options: [...question.options].sort(),
    }))
    expect(new Set(answerSignatures).size).toBe(questions.length)
    const result = verifyQuizReward({
      quizId:`league-world-${key}`,score:15,total:15,
      completionKey:`cqk:league-world-test:${key}:12345678901234567890`,
      proof:{kind:'choice',answers:questions.map((question)=>question.answer)},
    })
    expect(result.score).toBe(15)
    expect(result.xp).toBeGreaterThan(0)
  })
})
