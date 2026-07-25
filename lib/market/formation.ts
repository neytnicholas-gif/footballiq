import type { MarketHolding, MarketPlayer } from '@/lib/market/types'

export const MARKET_FORMATION = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
} as const

export type FormationCount = Record<keyof typeof MARKET_FORMATION, number>

export function createFormationCount(): FormationCount {
  return { GK: 0, DEF: 0, MID: 0, FWD: 0 }
}

export function countFormation(
  holdings: MarketHolding[],
  playersById: Map<number, MarketPlayer>,
): FormationCount {
  const counts = createFormationCount()
  for (const holding of holdings) {
    const player = playersById.get(holding.player_id)
    if (!player) continue
    counts[player.position] += 1
  }
  return counts
}

export function formationSlotsRemaining(counts: FormationCount): FormationCount {
  return {
    GK: Math.max(0, MARKET_FORMATION.GK - counts.GK),
    DEF: Math.max(0, MARKET_FORMATION.DEF - counts.DEF),
    MID: Math.max(0, MARKET_FORMATION.MID - counts.MID),
    FWD: Math.max(0, MARKET_FORMATION.FWD - counts.FWD),
  }
}

export function canBuyPosition(position: MarketPlayer['position'], counts: FormationCount) {
  return counts[position] < MARKET_FORMATION[position]
}
