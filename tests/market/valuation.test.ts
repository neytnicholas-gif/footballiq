import { describe, expect, it } from 'vitest'
import { computePlayerMarketValue } from '@/lib/market/valuation'

describe('valuation bounds', () => {
  it('returns null for unverified provenance', () => {
    const output = computePlayerMarketValue(
      {
        position: 'MID',
        goals: 5,
        assists: 7,
        provenance_status: 'unverified',
        owner_verified: false,
      },
      8_000_000,
    )

    expect(output).toBeNull()
  })

  it('enforces movement and absolute valuation caps', () => {
    const currentValue = 10_000_000
    const output = computePlayerMarketValue(
      {
        position: 'FWD',
        minutes: 3200,
        goals: 35,
        assists: 12,
        shots: 150,
        shots_on_target: 88,
        chances_created: 70,
        key_passes: 90,
        recent_form_score: 95,
        consistency_score: 95,
        role_security_score: 95,
        age_potential_score: 90,
        market_demand_score: 95,
        provenance_status: 'verified',
        owner_verified: true,
      },
      currentValue,
      { maxDailyMovePct: 1, demandCapPct: 12 },
    )

    expect(output).not.toBeNull()
    expect(output!.roundedValue).toBeGreaterThanOrEqual(4_000_000)
    expect(output!.roundedValue).toBeLessThanOrEqual(15_000_000)
    expect(output!.roundedValue).toBeLessThanOrEqual(currentValue + 100_000)
    expect(output!.roundedValue).toBeGreaterThanOrEqual(currentValue - 100_000)
  })
})
