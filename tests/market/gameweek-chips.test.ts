import { describe, expect, it } from 'vitest'
import {
  formatMarketChipMultiplier, MARKET_GAMEWEEK_CHIPS, marketChipAdjustedMovement,
  marketChipMovementExample, marketChipMultiplierBasisPoints,
  marketPositionPulseMultiplierBasisPoints,
} from '@/lib/market/chips'
import { MARKET_FORMATIONS, isValidFormation } from '@/lib/market/formation'

describe('gameweek chip balance and formation choices', () => {
  it('offers five different chips with symmetric upside and downside', () => {
    expect(MARKET_GAMEWEEK_CHIPS).toHaveLength(5)
    expect(new Set(MARKET_GAMEWEEK_CHIPS.map((chip) => chip.key)).size).toBe(5)
    for (const chip of MARKET_GAMEWEEK_CHIPS) {
      expect(marketChipAdjustedMovement(chip.key, -100_000)).toBe(-marketChipAdjustedMovement(chip.key, 100_000))
    }
  })

  it('uses the intended risk multipliers', () => {
    expect(marketChipMultiplierBasisPoints('triple_shout')).toBe(30_000)
    expect(marketChipMultiplierBasisPoints('power_pair')).toBe(20_000)
    expect(marketChipMultiplierBasisPoints('position_pulse')).toBe(15_000)
    expect(marketChipMultiplierBasisPoints('full_xi_surge')).toBe(12_000)
    expect(marketChipMultiplierBasisPoints('lockdown')).toBe(0)
  })

  it('balances Position Pulse across every supported formation size', () => {
    expect(marketPositionPulseMultiplierBasisPoints(4)).toBe(15_000)
    expect(marketPositionPulseMultiplierBasisPoints(3)).toBe(16_667)
    expect(marketPositionPulseMultiplierBasisPoints(2)).toBe(20_000)
    expect(marketPositionPulseMultiplierBasisPoints(1)).toBe(30_000)
    expect(marketChipAdjustedMovement('position_pulse', 300_000, 3)).toBe(500_010)
  })

  it('turns chip maths into plain, symmetrical examples', () => {
    expect(formatMarketChipMultiplier(16_667)).toBe('1.67×')
    expect(marketChipMovementExample(30_000)).toContain('+0.6m')
    expect(marketChipMovementExample(30_000)).toContain('−0.6m')
    expect(marketChipMovementExample(0)).toContain('no movement')
  })

  it('supports valid 4-3-3, 4-4-2 and 3-4-3 shapes', () => {
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-3-3'] }, '4-3-3')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-4-2'] }, '4-4-2')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['3-4-3'] }, '3-4-3')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-3-3'] }, '4-4-2')).toBe(false)
  })
})
