import { PLAYER_MARKET_METHOD_VERSION, computePlayerMarketValue } from '@/lib/market/valuation'
import type { MarketPlayer, MarketSeasonStats } from '@/lib/market/types'

export type MatchweekPlayerPatch = {
  player_id: number
  rating: number
  minutes_played: number
  confidence_score: number
  new_value: number
}

export type MatchweekSimulationProvider = {
  name: string
  simulateMatchweek: (input: {
    players: MarketPlayer[]
    latestStatsByPlayerId: Map<number, MarketSeasonStats | undefined>
    weekSeed: string
  }) => MatchweekPlayerPatch[]
}

function seededRandom(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10000) / 10000
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toStep100k(value: number) {
  return Math.max(4_000_000, Math.min(15_000_000, Math.round(value / 100_000) * 100_000))
}

export const seedMatchweekProvider: MatchweekSimulationProvider = {
  name: 'Seed Matchweek Provider',
  simulateMatchweek({ players, latestStatsByPlayerId, weekSeed }) {
    return players.map((player) => {
      const stat = latestStatsByPlayerId.get(player.id)
      const formBase = stat?.average_rating ?? 6.9
      const minuteBase = stat?.minutes ?? 1800

      const volatility = seededRandom(`${weekSeed}-${player.slug}-v`) - 0.5
      const consistency = clamp((minuteBase / 3200) * 0.55 + 0.3, 0.3, 0.95)
      const formShock = volatility * (1.25 - consistency)
      const rating = clamp(formBase + formShock + (seededRandom(`${weekSeed}-${player.slug}-r`) - 0.5) * 0.35, 5.7, 9.6)

      const minutesPlayed = clamp(
        Math.round(55 + (seededRandom(`${weekSeed}-${player.slug}-m`) * 40) + (consistency * 25)),
        45,
        96,
      )

      const confidenceScore = clamp(0.75 + (consistency * 0.22), 0.75, 0.98)

      const valuationInput = {
        position: player.position,
        minutes: (stat?.minutes ?? 0) + minutesPlayed,
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
        recent_form_score: clamp((rating - 5.5) * 24, 15, 99),
        consistency_score: clamp(45 + consistency * 50, 30, 98),
        role_security_score: clamp(42 + consistency * 48, 25, 96),
        age_potential_score: clamp(82 - Math.max(0, ((player.age ?? 27) - 23) * 4), 28, 92),
        market_demand_score: clamp(48 + ((rating - 6.8) * 15), 20, 90),
        provenance_status: 'verified' as const,
        owner_verified: true,
      }

      const valuation = computePlayerMarketValue(valuationInput, player.current_value, {
        maxDailyMovePct: 9,
        demandCapPct: 7,
      })

      const newValue = toStep100k(valuation?.roundedValue ?? player.current_value)

      return {
        player_id: player.id,
        rating: Number(rating.toFixed(2)),
        minutes_played: minutesPlayed,
        confidence_score: Number(confidenceScore.toFixed(3)),
        new_value: newValue,
      }
    })
  },
}

export const MARKET_SIMULATION_METHOD_VERSION = `${PLAYER_MARKET_METHOD_VERSION}-sim-v1`
