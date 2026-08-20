import type { MarketGameweekChipKey, MarketPosition } from '@/lib/market/types'

export type MarketChipDefinition = {
  key: MarketGameweekChipKey
  name: string
  shortName: string
  summary: string
  targetHelp: string
  multiplierLabel: string
  targetCount: number | 'position' | 'full-xi'
  tone: 'mint' | 'sky' | 'violet' | 'amber' | 'rose'
}

export const MARKET_GAMEWEEK_CHIPS: MarketChipDefinition[] = [
  {
    key: 'triple_shout',
    name: 'Triple Shout',
    shortName: 'Triple',
    summary: 'One player gets three times their normal gameweek price move.',
    targetHelp: 'Choose one player from your roster.',
    multiplierLabel: '1 player · 3× up or down',
    targetCount: 1,
    tone: 'mint',
  },
  {
    key: 'power_pair',
    name: 'Power Pair',
    shortName: 'Pair',
    summary: 'Two players each get twice their normal gameweek price move.',
    targetHelp: 'Choose two different players from your roster.',
    multiplierLabel: '2 players · 2× up or down',
    targetCount: 2,
    tone: 'sky',
  },
  {
    key: 'position_pulse',
    name: 'Position Pulse',
    shortName: 'Pulse',
    summary: 'Boost one outfield position. The multiplier balances itself to keep every formation fair.',
    targetHelp: 'Choose defenders, midfielders or forwards.',
    multiplierLabel: '1 position · auto-balanced up or down',
    targetCount: 'position',
    tone: 'violet',
  },
  {
    key: 'full_xi_surge',
    name: 'Full XI Surge',
    shortName: 'XI Surge',
    summary: 'A complete, valid starting XI gets a 20% stronger price move.',
    targetHelp: 'Complete all 11 places in your chosen formation first.',
    multiplierLabel: '11 players · 1.2× up or down',
    targetCount: 'full-xi',
    tone: 'amber',
  },
  {
    key: 'lockdown',
    name: 'Lockdown',
    shortName: 'Lockdown',
    summary: 'Freeze two held players for the gameweek: no loss, but no gain either.',
    targetHelp: 'Choose two different players from your roster.',
    multiplierLabel: '2 players · 0× movement',
    targetCount: 2,
    tone: 'rose',
  },
]

export const MARKET_OUTFIELD_POSITIONS: Array<{ key: Exclude<MarketPosition, 'GK'>; label: string }> = [
  { key: 'DEF', label: 'Defenders' },
  { key: 'MID', label: 'Midfielders' },
  { key: 'FWD', label: 'Forwards' },
]

export function marketChipDefinition(key: MarketGameweekChipKey) {
  return MARKET_GAMEWEEK_CHIPS.find((chip) => chip.key === key) ?? MARKET_GAMEWEEK_CHIPS[0]
}

export function marketChipName(key: MarketGameweekChipKey) {
  return marketChipDefinition(key).name
}

export function marketPositionPulseMultiplierBasisPoints(targetCount: number) {
  const safeTargetCount = Math.max(1, Math.min(11, Math.round(targetCount)))
  return Math.min(30_000, 10_000 + Math.round(20_000 / safeTargetCount))
}

export function marketChipMultiplierBasisPoints(key: MarketGameweekChipKey, targetCount?: number) {
  switch (key) {
    case 'triple_shout': return 30_000
    case 'power_pair': return 20_000
    case 'position_pulse': return marketPositionPulseMultiplierBasisPoints(targetCount ?? 4)
    case 'full_xi_surge': return 12_000
    case 'lockdown': return 0
  }
}

export function marketChipAdjustedMovement(key: MarketGameweekChipKey, normalMovement: number, targetCount?: number) {
  return Math.round(normalMovement * marketChipMultiplierBasisPoints(key, targetCount) / 10_000)
}

export function formatMarketChipMultiplier(multiplierBasisPoints: number) {
  return `${(multiplierBasisPoints / 10_000).toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}×`
}

export function marketChipMovementExample(multiplierBasisPoints: number) {
  if (multiplierBasisPoints === 0) {
    return 'Example: a normal +0.2m or −0.2m move becomes no movement.'
  }
  const adjusted = (0.2 * multiplierBasisPoints / 10_000).toFixed(2).replace(/0$/, '')
  return `Example: a normal +0.2m move becomes +${adjusted}m; −0.2m becomes −${adjusted}m.`
}
