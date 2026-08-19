import type { MarketHolding, MarketPlayer } from '@/lib/market/types'

export const MARKET_FORMATION = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
} as const
export const MARKET_FORMATIONS = {
  '4-3-3': MARKET_FORMATION,
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
} as const
export type MarketFormationKey = keyof typeof MARKET_FORMATIONS

export const MARKET_FORMATION_OPTIONS: Array<{
  key: MarketFormationKey
  label: string
  description: string
  requiresReward?: 'formation_343'
}> = [
  { key: '4-3-3', label: '4-3-3', description: 'Width, three midfielders and three forwards.' },
  { key: '4-4-2', label: '4-4-2', description: 'Four across midfield and a two-player attack.' },
  { key: '3-4-3', label: '3-4-3', description: 'An attacking shape earned in Rewards.', requiresReward: 'formation_343' },
]

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

export function formationSlotsRemaining(counts: FormationCount, formation: MarketFormationKey = '4-3-3'): FormationCount {
  const limits = MARKET_FORMATIONS[formation]
  return {
    GK: Math.max(0, limits.GK - counts.GK),
    DEF: Math.max(0, limits.DEF - counts.DEF),
    MID: Math.max(0, limits.MID - counts.MID),
    FWD: Math.max(0, limits.FWD - counts.FWD),
  }
}

export function canBuyPosition(position: MarketPlayer['position'], counts: FormationCount, formation: MarketFormationKey = '4-3-3') {
  return counts[position] < MARKET_FORMATIONS[formation][position]
}

export function isValidFormation(counts: FormationCount, formation: MarketFormationKey = '4-3-3') {
  const limits = MARKET_FORMATIONS[formation]
  return (Object.keys(limits) as Array<keyof FormationCount>).every((position) => counts[position] === limits[position])
}
