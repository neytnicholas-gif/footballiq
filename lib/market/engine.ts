import type { MarketPlayer, MarketSeasonStats } from '@/lib/market/types'
import { computePlayerMarketValue } from '@/lib/market/valuation'

export type SimulatedMarketPoint = {
  x: number
  value: number
}

export type SimulatedMarketCardData = {
  playerId: number
  sparkline: SimulatedMarketPoint[]
  trendDelta: number
  trendPct: number
}

type AccumulatorState = {
  accumulator: number
  currentValue: number
}

function deterministicNoise(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const n = (hash >>> 0) / 4294967296
  return (n * 2) - 1
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function applyAccumulatorMove(state: AccumulatorState, proposedMove: number) {
  const perTickCap = Math.round(state.currentValue * 0.012)
  const clamped = clamp(proposedMove, -perTickCap, perTickCap)
  const nextAccumulator = state.accumulator + clamped
  const visibleStep = Math.trunc(nextAccumulator / 100000) * 100000
  const nextValue = Math.max(4_000_000, state.currentValue + visibleStep)

  return {
    accumulator: nextAccumulator - visibleStep,
    currentValue: nextValue,
    appliedVisibleStep: visibleStep,
  }
}

export function simulateMarketCards(
  players: MarketPlayer[],
  statsByPlayerId: Map<number, MarketSeasonStats | undefined>,
  ticks = 12,
) {
  const simulation = new Map<number, SimulatedMarketCardData>()

  for (const player of players) {
    const stat = statsByPlayerId.get(player.id)
    const points: SimulatedMarketPoint[] = [{ x: 0, value: player.previous_value }]

    const rating = stat?.average_rating ?? 6.9
    const minutes = stat?.minutes ?? 1800
    const baseInput = {
      position: player.position,
      minutes,
      goals: stat?.goals,
      assists: stat?.assists,
      clean_sheets: stat?.clean_sheets,
      saves: stat?.saves,
      goals_conceded: stat?.goals_conceded,
      tackles: stat?.tackles,
      interceptions: stat?.interceptions,
      clearances: stat?.clearances,
      shots: stat?.shots,
      shots_on_target: stat?.shots_on_target,
      chances_created: stat?.chances_created,
      key_passes: stat?.key_passes,
      recent_form_score: clamp((rating - 5.5) * 22, 20, 98),
      consistency_score: clamp(42 + (minutes / 100), 25, 98),
      role_security_score: clamp(40 + (minutes / 85), 20, 95),
      age_potential_score: clamp(80 - Math.max(0, ((player.age ?? 27) - 23) * 4), 30, 90),
      market_demand_score: 50,
      provenance_status: 'verified' as const,
      owner_verified: true,
    }

    const breakdown = computePlayerMarketValue(baseInput, player.current_value)
    const fairTarget = breakdown?.roundedValue ?? player.current_value

    let state: AccumulatorState = {
      accumulator: (player.current_value - player.previous_value) * 0.28,
      currentValue: player.previous_value,
    }

    for (let i = 1; i <= ticks; i += 1) {
      const directionalPull = (fairTarget - state.currentValue) * 0.075
      const noise = deterministicNoise(`${player.slug}-${i}`) * 48000
      const eventDrift = directionalPull + noise
      const result = applyAccumulatorMove(state, eventDrift)
      state = { accumulator: result.accumulator, currentValue: result.currentValue }
      points.push({ x: i, value: result.currentValue })
    }

    const end = points[points.length - 1]?.value ?? player.current_value
    const start = points[0]?.value ?? player.previous_value
    const trendDelta = end - start
    const trendPct = start > 0 ? (trendDelta / start) * 100 : 0

    simulation.set(player.id, {
      playerId: player.id,
      sparkline: points,
      trendDelta,
      trendPct,
    })
  }

  return simulation
}
