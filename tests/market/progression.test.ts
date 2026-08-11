import { describe, expect, it } from 'vitest'
import { canBuyPosition, formationSlotsRemaining } from '@/lib/market/formation'
import { challengePercent, rewardItemUnlocked, type MarketChallenge, type MarketProgression, type MarketRewardItem } from '@/lib/market/progression'

describe('market progression rules', () => {
  it('caps challenge progress and makes completion readable', () => {
    const challenge = { progress: 14, target: 10 } as MarketChallenge
    expect(challengePercent(challenge)).toBe(100)
  })

  it('requires both trade experience and Reveals for permanent rewards', () => {
    const item = { required_trades: 10, required_reveals: 1 } as MarketRewardItem
    const base = { trade_count: 10, reveal_count: 0 } as MarketProgression
    expect(rewardItemUnlocked(item, base)).toBe(false)
    expect(rewardItemUnlocked(item, { ...base, reveal_count: 1 })).toBe(true)
  })

  it('enforces different defender and midfielder limits for 4-3-3 and 3-4-3', () => {
    const counts = { GK: 1, DEF: 3, MID: 3, FWD: 3 }
    expect(canBuyPosition('DEF', counts, '4-3-3')).toBe(true)
    expect(canBuyPosition('DEF', counts, '3-4-3')).toBe(false)
    expect(canBuyPosition('MID', counts, '4-3-3')).toBe(false)
    expect(canBuyPosition('MID', counts, '3-4-3')).toBe(true)
    expect(formationSlotsRemaining(counts, '3-4-3')).toEqual({ GK: 0, DEF: 0, MID: 1, FWD: 0 })
  })
})
