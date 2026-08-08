import { describe, expect, it } from 'vitest'
import { tacticalScenarios, validateTacticalScenarios } from '../lib/tactical-scenarios'

describe('tactical scenario content', () => {
  it('passes the content contract', () => expect(validateTacticalScenarios(tacticalScenarios)).toEqual([]))
  it('covers a varied training set', () => {
    expect(tacticalScenarios.length).toBe(50)
    expect(new Set(tacticalScenarios.map((item) => item.category)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(tacticalScenarios.map((item) => item.difficulty))).toEqual(new Set(['Starter', 'Sharp', 'Expert']))
  })
})
