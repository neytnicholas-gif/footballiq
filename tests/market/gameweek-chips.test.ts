import { describe, expect, it } from 'vitest'
import {
  MARKET_GAMEWEEK_CHIPS, marketChipAdjustedMovement, marketChipMultiplierBasisPoints,
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

  it('supports valid 4-3-3, 4-4-2 and 3-4-3 shapes', () => {
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-3-3'] }, '4-3-3')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-4-2'] }, '4-4-2')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['3-4-3'] }, '3-4-3')).toBe(true)
    expect(isValidFormation({ ...MARKET_FORMATIONS['4-3-3'] }, '4-4-2')).toBe(false)
  })
})
