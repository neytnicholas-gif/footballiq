import type { OpeningPriceConfidence } from '@/lib/market/real-valuation'
import type { MarketPosition } from '@/lib/market/types'

const VALUE_FLOOR = 4_000_000
const VALUE_CEILING = 15_000_000

export type OpeningPriceBookPlayer = {
  position: MarketPosition
  openingValue: number
  confidence: OpeningPriceConfidence
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)))
  return sorted[index]!
}

const POSITION_GUARDRAILS: Record<MarketPosition, { minimumPlayers: number; minimumPricePoints: number; minimumSpread: number; minimumCeiling: number }> = {
  GK: { minimumPlayers: 80, minimumPricePoints: 20, minimumSpread: 2_000_000, minimumCeiling: 8_000_000 },
  DEF: { minimumPlayers: 250, minimumPricePoints: 25, minimumSpread: 2_000_000, minimumCeiling: 9_000_000 },
  MID: { minimumPlayers: 200, minimumPricePoints: 25, minimumSpread: 2_000_000, minimumCeiling: 10_000_000 },
  FWD: { minimumPlayers: 200, minimumPricePoints: 25, minimumSpread: 2_000_000, minimumCeiling: 10_000_000 },
}

function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    players: sorted.length,
    distinctValues: new Set(sorted).size,
    minimum: sorted[0] ?? 0,
    p10: percentile(sorted, 0.1),
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    maximum: sorted.at(-1) ?? 0,
    spread: percentile(sorted, 0.9) - percentile(sorted, 0.1),
  }
}

export function validateOpeningPriceBook(players: OpeningPriceBookPlayer[]) {
  if (players.length < 900) throw new Error(`Opening price book rejected: only ${players.length} players were available.`)
  const invalid = players.filter((player) => (
    player.openingValue < VALUE_FLOOR
    || player.openingValue > VALUE_CEILING
    || player.openingValue % 100_000 !== 0
  ))
  if (invalid.length) throw new Error(`Opening price book rejected: ${invalid.length} values break floor, ceiling or increment rules.`)
  const unsafeFallbacks = players.filter((player) => player.confidence === 'fallback' && player.openingValue > 5_200_000)
  if (unsafeFallbacks.length) throw new Error(`Opening price book rejected: ${unsafeFallbacks.length} fallback players exceed the conservative cap.`)

  const all = distribution(players.map((player) => player.openingValue))
  if (all.spread < 2_000_000 || all.distinctValues < 25) {
    throw new Error(`Opening price book rejected as too compressed (${all.distinctValues} prices; p90-p10 ${all.spread}).`)
  }
  const eliteBand = [...players].sort((a, b) => b.openingValue - a.openingValue).slice(0, 25)
  if (eliteBand.some((player) => player.confidence === 'fallback')) {
    throw new Error('Opening price book rejected: a fallback-priced player entered the elite band.')
  }

  const positionAudit = Object.fromEntries((['GK', 'DEF', 'MID', 'FWD'] as const).map((position) => {
    const audit = distribution(players.filter((player) => player.position === position).map((player) => player.openingValue))
    const guardrail = POSITION_GUARDRAILS[position]
    if (audit.players < guardrail.minimumPlayers) throw new Error(`Opening price book rejected: ${position} coverage fell to ${audit.players} players.`)
    if (audit.distinctValues < guardrail.minimumPricePoints || audit.spread < guardrail.minimumSpread) {
      throw new Error(`Opening price book rejected: ${position} prices are too compressed (${audit.distinctValues} prices; p90-p10 ${audit.spread}).`)
    }
    if (audit.maximum < guardrail.minimumCeiling) {
      throw new Error(`Opening price book rejected: the ${position} ceiling fell below the quality guardrail.`)
    }
    return [position, audit]
  })) as Record<MarketPosition, ReturnType<typeof distribution>>

  return {
    players: all.players,
    distinctValues: all.distinctValues,
    minimum: all.minimum,
    p10: all.p10,
    median: all.median,
    p90: all.p90,
    maximum: all.maximum,
    fallbackPlayers: players.filter((player) => player.confidence === 'fallback').length,
    positionAudit,
  }
}
