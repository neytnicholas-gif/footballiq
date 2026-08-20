import { describe, expect, it } from 'vitest'
import { scoutQuestions } from '../lib/game-data'
import { refereeScenarios, validateRefereeScenarios } from '../lib/referee-scenarios'
import { expandedScoutScenarios, scoutScenarioCount, validateScoutScenarios } from '../lib/scout-scenario-expansion'
import { tacticalScenarios, validateTacticalScenarios } from '../lib/tactical-scenarios'

describe('450-each judgement content contract', () => {
  it('contains exactly 450 scenarios in every judgement mode', () => {
    expect(refereeScenarios).toHaveLength(450)
    expect(scoutScenarioCount).toBe(450)
    expect(expandedScoutScenarios).toHaveLength(440)
    expect(tacticalScenarios).toHaveLength(450)
  })

  it('passes referee content validation', () => {
    expect(validateRefereeScenarios(refereeScenarios)).toEqual([])
  })

  it('passes scouting evidence and judgement validation', () => {
    expect(validateScoutScenarios(expandedScoutScenarios)).toEqual([])
  })

  it('never reveals the scouting recommendation in any pre-answer evidence', () => {
    expect(scoutQuestions).toHaveLength(450)
    for (const question of scoutQuestions) {
      const preAnswerEvidence = [question.summary, ...question.profile].join(' ')
      expect(preAnswerEvidence).not.toMatch(/strong(?:ly)? follow|do not pursue|\bmonitor\b/i)
      expect(preAnswerEvidence).not.toContain(question.strongestDecision)
    }
  })

  it('passes tactical content validation', () => {
    expect(validateTacticalScenarios(tacticalScenarios)).toEqual([])
  })

  it('balances difficulty and category coverage', () => {
    for (const items of [refereeScenarios, tacticalScenarios]) {
      const difficultyCounts = new Map<string, number>()
      for (const item of items) difficultyCounts.set(item.difficulty, (difficultyCounts.get(item.difficulty) ?? 0) + 1)
      expect(Math.min(...difficultyCounts.values())).toBeGreaterThanOrEqual(14)
      expect(new Set(items.map((item) => item.category)).size).toBeGreaterThanOrEqual(8)
    }
    expect(new Set(expandedScoutScenarios.map((item) => item.position)).size).toBeGreaterThanOrEqual(9)
    expect(new Set(expandedScoutScenarios.map((item) => item.recommended)).size).toBe(4)
  })

  it('does not teach players that one answer-button position is usually right', () => {
    const answerPositions = [
      refereeScenarios.map((item) => item.options.indexOf(item.answer)),
      tacticalScenarios.map((item) => item.answer),
    ]
    for (const positions of answerPositions) {
      const counts = [0, 1, 2, 3].map((position) => positions.filter((answer) => answer === position).length)
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }
  })
})
