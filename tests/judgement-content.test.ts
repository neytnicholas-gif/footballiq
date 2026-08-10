import { describe, expect, it } from 'vitest'
import { refereeScenarios, validateRefereeScenarios } from '../lib/referee-scenarios'
import { expandedScoutScenarios, scoutScenarioCount, validateScoutScenarios } from '../lib/scout-scenario-expansion'
import { tacticalScenarios, validateTacticalScenarios } from '../lib/tactical-scenarios'

describe('150-each judgement content contract', () => {
  it('contains exactly 150 scenarios in every judgement mode', () => {
    expect(refereeScenarios).toHaveLength(150)
    expect(scoutScenarioCount).toBe(150)
    expect(expandedScoutScenarios).toHaveLength(140)
    expect(tacticalScenarios).toHaveLength(150)
  })

  it('passes referee content validation', () => {
    expect(validateRefereeScenarios(refereeScenarios)).toEqual([])
  })

  it('passes scouting evidence and judgement validation', () => {
    expect(validateScoutScenarios(expandedScoutScenarios)).toEqual([])
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
})
