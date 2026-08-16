import { describe, expect, it } from 'vitest'
import { resolveOpeningPricePersistence } from '@/lib/market/opening-price-persistence'
import { OPENING_PRICE_METHOD_VERSION, type OpeningPriceResult } from '@/lib/market/real-valuation'

function result(value: number, rating = 70): OpeningPriceResult {
  return {
    value,
    confidence: 'established',
    evidence: {
      method_version: OPENING_PRICE_METHOD_VERSION,
      confidence: 'established',
      source_inputs: { appearances: 20, starts: 18, minutes: 1_620, average_rating: 7.2, goals: 4, assists: 5, clean_sheets: 0 },
      scores: { stabilized_rating: 7.05, rating, minutes: 73, role: 88, output: 61, team_context: 75, age: 82, overall: 72 },
      guardrail: null,
      calculated_value: value,
    },
  }
}

describe('opening-price persistence', () => {
  it('freezes the price, confidence and evidence together on later provider syncs', () => {
    const frozen = result(9_100_000, 71)
    const refreshed = result(11_400_000, 92)
    const resolved = resolveOpeningPricePersistence({
      existing: {
        initial: frozen.value,
        current: 9_300_000,
        methodVersion: OPENING_PRICE_METHOD_VERSION,
        confidence: frozen.confidence,
        evidence: frozen.evidence,
      },
      candidate: refreshed,
      position: 'MID',
      age: 24,
    })

    expect(resolved.openingPrice).toBe(9_100_000)
    expect(resolved.currentPrice).toBe(9_300_000)
    expect(resolved.evidence).toBe(frozen.evidence)
    expect(resolved.confidence).toBe(frozen.confidence)
    expect(resolved.repriced).toBe(false)
  })

  it('stops rather than silently rewriting an inconsistent frozen receipt', () => {
    const frozen = result(9_100_000)
    expect(() => resolveOpeningPricePersistence({
      existing: {
        initial: 9_100_000,
        current: 9_100_000,
        methodVersion: OPENING_PRICE_METHOD_VERSION,
        confidence: frozen.confidence,
        evidence: { ...frozen.evidence, calculated_value: 9_200_000 },
      },
      candidate: result(9_400_000),
      position: 'MID',
      age: 24,
    })).toThrow('frozen price, method, confidence and evidence no longer agree')
  })

  it('migrates an old model once and preserves genuine movement', () => {
    const candidate = result(8_600_000)
    const resolved = resolveOpeningPricePersistence({
      existing: { initial: 7_600_000, current: 7_800_000, methodVersion: 'legacy-age-position-v1', confidence: 'fallback', evidence: {} },
      candidate,
      position: 'FWD',
      age: 25,
    })
    expect(resolved.openingPrice).toBe(8_600_000)
    expect(resolved.currentPrice).toBe(8_800_000)
    expect(resolved.evidence).toBe(candidate.evidence)
    expect(resolved.repriced).toBe(true)
  })

  it('keeps verified pre-sync movement for a newly imported player', () => {
    const candidate = result(8_600_000)
    const resolved = resolveOpeningPricePersistence({ candidate, candidateCurrentPrice: 8_800_000, position: 'FWD', age: 25 })
    expect(resolved.openingPrice).toBe(8_600_000)
    expect(resolved.currentPrice).toBe(8_800_000)
  })
})
