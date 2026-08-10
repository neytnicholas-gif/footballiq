import type { MarketPosition } from '@/lib/market/types'
import type { ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { REAL_PERFORMANCE_METHOD_VERSION } from '@/lib/market/performance-ingestion'

export const VALUE_FLOOR = 4_000_000
export const VALUE_CEILING = 15_000_000
export const VALUE_INCREMENT = 100_000
export const PER_MATCH_CAP = 300_000
export const ROLLING_WEEK_CAP = 600_000
export const PERFORMANCE_SIGNAL_THRESHOLD_MILLI = 220
export const PERFORMANCE_SIGNAL_CAP_MILLI = 660

const RECENCY_WEIGHTS = [1, 0.82, 0.67, 0.55, 0.45]
const POSITION_BASELINE: Record<MarketPosition, number> = { GK: 6.75, DEF: 6.7, MID: 6.8, FWD: 6.85 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export type RollingRating = {
  rating: number
  appearancesUsed: number
  totalWeight: number
}

export function calculateRollingRating(events: ValidatedPerformance[], limit = 5): RollingRating | null {
  const eligible = [...events]
    .filter((event) => event.eligibleForValuation && event.minutesPlayed > 0 && event.rating !== null)
    .sort((a, b) => Date.parse(b.matchDate) - Date.parse(a.matchDate))
    .slice(0, limit)
  if (eligible.length === 0) return null

  let weightedRatings = 0
  let totalWeight = 0
  eligible.forEach((event, index) => {
    const minutesWeight = clamp(event.minutesPlayed / 90, 0.25, 1)
    const weight = (RECENCY_WEIGHTS[index] ?? RECENCY_WEIGHTS.at(-1)!) * minutesWeight
    weightedRatings += event.rating! * weight
    totalWeight += weight
  })
  return { rating: Number((weightedRatings / totalWeight).toFixed(3)), appearancesUsed: eligible.length, totalWeight: Number(totalWeight.toFixed(3)) }
}

export function calculatePerformanceValueUpdate(input: {
  position: MarketPosition
  currentValue: number
  rollingWeekMovement: number
  performances: ValidatedPerformance[]
}) {
  const rolling = calculateRollingRating(input.performances)
  if (!rolling) return null
  const baseline = POSITION_BASELINE[input.position]
  const rawSteps = Math.round((rolling.rating - baseline) / 0.22)
  const matchMovement = clamp(rawSteps * VALUE_INCREMENT, -PER_MATCH_CAP, PER_MATCH_CAP)
  const remainingUp = Math.max(0, ROLLING_WEEK_CAP - Math.max(0, input.rollingWeekMovement))
  const remainingDown = Math.max(0, ROLLING_WEEK_CAP - Math.max(0, -input.rollingWeekMovement))
  const cappedMovement = clamp(matchMovement, -remainingDown, remainingUp)
  const newValue = clamp(input.currentValue + cappedMovement, VALUE_FLOOR, VALUE_CEILING)
  return {
    previousValue: input.currentValue,
    newValue,
    movement: newValue - input.currentValue,
    rollingRating: rolling.rating,
    appearancesUsed: rolling.appearancesUsed,
    methodologyVersion: REAL_PERFORMANCE_METHOD_VERSION,
  }
}

export function calculateBankedPerformanceMovement(input: {
  ratingDeltaMilli: number
  previousBankMilli: number
  rollingWeekMovement: number
  currentValue: number
}) {
  const boundedSignal = clamp(Math.round(input.ratingDeltaMilli), -PERFORMANCE_SIGNAL_CAP_MILLI, PERFORMANCE_SIGNAL_CAP_MILLI)
  const bankBeforeMovement = Math.round(input.previousBankMilli) + boundedSignal
  const availableSteps = Math.trunc(bankBeforeMovement / PERFORMANCE_SIGNAL_THRESHOLD_MILLI)
  const perMatchSteps = clamp(availableSteps, -PER_MATCH_CAP / VALUE_INCREMENT, PER_MATCH_CAP / VALUE_INCREMENT)
  const remainingUpSteps = Math.floor(Math.max(0, ROLLING_WEEK_CAP - Math.max(0, input.rollingWeekMovement)) / VALUE_INCREMENT)
  const remainingDownSteps = Math.floor(Math.max(0, ROLLING_WEEK_CAP - Math.max(0, -input.rollingWeekMovement)) / VALUE_INCREMENT)
  const cappedSteps = clamp(perMatchSteps, -remainingDownSteps, remainingUpSteps)
  const proposedValue = input.currentValue + cappedSteps * VALUE_INCREMENT
  const newValue = clamp(proposedValue, VALUE_FLOOR, VALUE_CEILING)
  const appliedSteps = Math.trunc((newValue - input.currentValue) / VALUE_INCREMENT)

  return {
    previousBankMilli: Math.round(input.previousBankMilli),
    bankAfterEventMilli: bankBeforeMovement - appliedSteps * PERFORMANCE_SIGNAL_THRESHOLD_MILLI,
    movement: newValue - input.currentValue,
    newValue,
  }
}

export function calculateOpeningGameplayValue(input: {
  position: MarketPosition
  establishedPerformanceScore: number
  recentMinutesScore: number
  squadRoleScore: number
  availabilityScore: number
  agePotentialScore: number
}) {
  const positionBase: Record<MarketPosition, number> = { GK: 5_000_000, DEF: 5_200_000, MID: 5_400_000, FWD: 5_600_000 }
  const score = (
    input.establishedPerformanceScore * 0.42
    + input.recentMinutesScore * 0.25
    + input.squadRoleScore * 0.2
    + input.availabilityScore * 0.1
    + input.agePotentialScore * 0.03
  )
  const normalized = clamp(score, 0, 100) / 100
  const value = positionBase[input.position] + normalized * (VALUE_CEILING - positionBase[input.position])
  return clamp(Math.round(value / VALUE_INCREMENT) * VALUE_INCREMENT, VALUE_FLOOR, VALUE_CEILING)
}
