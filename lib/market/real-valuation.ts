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
export const OPENING_PRICE_METHOD_VERSION = 'early-shout-opening-v3.0'

const RECENCY_WEIGHTS = [1, 0.82, 0.67, 0.55, 0.45]
const POSITION_BASELINE: Record<MarketPosition, number> = { GK: 6.75, DEF: 6.7, MID: 6.8, FWD: 6.85 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const OPENING_RATING_PRIOR: Record<MarketPosition, number> = { GK: 6.72, DEF: 6.68, MID: 6.72, FWD: 6.76 }
const COMPETITION_STRENGTH: Record<string, number> = {
  'premier-league': 92,
  'la-liga': 87,
  'bundesliga': 86,
  'serie-a': 84,
  'ligue-1': 76,
}

export type OpeningPriceConfidence = 'fallback' | 'limited' | 'established' | 'high'

export type OpeningPriceInput = {
  position: MarketPosition
  age: number | null
  competitionKey: string
  appearances: number
  starts: number
  minutes: number
  averageRating: number | null
  goals: number
  assists: number
  cleanSheets: number
  clubStrengthScore?: number | null
}

export type OpeningPriceResult = {
  value: number
  confidence: OpeningPriceConfidence
  evidence: {
    method_version: typeof OPENING_PRICE_METHOD_VERSION
    confidence: OpeningPriceConfidence
    source_inputs: {
      appearances: number
      starts: number
      minutes: number
      average_rating: number | null
      goals: number
      assists: number
      clean_sheets: number
    }
    scores: {
      stabilized_rating: number | null
      rating: number
      minutes: number
      role: number
      output: number
      team_context: number
      age: number
      overall: number
    }
    guardrail: string | null
    calculated_value: number
  }
}

function openingOutputScore(input: OpeningPriceInput) {
  if (input.minutes <= 0) return 0
  const per90 = 90 / input.minutes
  const outputRate = input.position === 'FWD'
    ? (input.goals + input.assists * 0.7) * per90
    : input.position === 'MID'
      ? (input.goals * 0.65 + input.assists) * per90
      : input.position === 'DEF'
        ? (input.cleanSheets * 0.55 + input.goals * 0.35 + input.assists * 0.45) * per90
        : input.cleanSheets * per90
  const strongRate: Record<MarketPosition, number> = { GK: 0.42, DEF: 0.38, MID: 0.52, FWD: 0.72 }
  return clamp((outputRate / strongRate[input.position]) * 100, 0, 100)
}

function openingAgeScore(age: number | null) {
  if (age === null) return 55
  if (age <= 20) return 84
  if (age <= 23) return 90
  if (age <= 26) return 82
  if (age <= 29) return 68
  if (age <= 32) return 52
  if (age <= 34) return 38
  return 25
}

function openingScores(input: OpeningPriceInput) {
  const prior = OPENING_RATING_PRIOR[input.position]
  const sampleConfidence = clamp(input.minutes / (input.minutes + 900), 0, 1)
  const stabilizedRating = input.averageRating === null
    ? null
    : prior + (clamp(input.averageRating, 3, 10) - prior) * sampleConfidence
  const rating = stabilizedRating === null ? 25 : clamp(((stabilizedRating - 6.25) / 1.1) * 100, 0, 100)
  const minutes = Math.sqrt(clamp(input.minutes / 3_000, 0, 1)) * 100
  const role = input.appearances > 0
    ? clamp((clamp(input.starts / input.appearances, 0, 1) * 72) + (clamp(input.appearances / 30, 0, 1) * 28), 0, 100)
    : 0
  const output = openingOutputScore(input)
  const clubStrength = input.clubStrengthScore === null || input.clubStrengthScore === undefined
    ? 50
    : clamp(input.clubStrengthScore, 0, 100)
  const competitionStrength = COMPETITION_STRENGTH[input.competitionKey] ?? 75
  const teamContext = clubStrength * 0.68 + competitionStrength * 0.32
  const age = openingAgeScore(input.age)
  const overall = (
    rating * 0.46
    + minutes * 0.17
    + role * 0.13
    + output * 0.12
    + teamContext * 0.08
    + age * 0.04
  )
  return { stabilizedRating, rating, minutes, role, output, teamContext, age, overall }
}

function interpolateOpeningValue(score: number) {
  const bands = [
    [0, 4_000_000],
    [35, 5_500_000],
    [50, 7_000_000],
    [65, 9_000_000],
    [80, 12_000_000],
    [100, 15_000_000],
  ] as const
  const bounded = clamp(score, 0, 100)
  for (let index = 1; index < bands.length; index += 1) {
    const lower = bands[index - 1]!
    const upper = bands[index]!
    if (bounded <= upper[0]) {
      const progress = (bounded - lower[0]) / (upper[0] - lower[0])
      return lower[1] + progress * (upper[1] - lower[1])
    }
  }
  return VALUE_CEILING
}

export function calculateOpeningQualityIndex(input: OpeningPriceInput) {
  if (input.averageRating === null || input.minutes <= 0) return null
  const scores = openingScores(input)
  return Number((scores.rating * 0.65 + scores.minutes * 0.25 + scores.output * 0.1).toFixed(3))
}

/**
 * Prices a footballer for Early Shout's 100m/11-player game. This is deliberately
 * not a transfer-fee estimate: verified sporting evidence dominates, age has only
 * a small effect, and thin samples are capped so an unproven prospect cannot be
 * priced like an established elite player.
 */
export function calculateOpeningPlayerPrice(input: OpeningPriceInput): OpeningPriceResult {
  const safeInput: OpeningPriceInput = {
    ...input,
    appearances: Math.max(0, Math.round(input.appearances)),
    starts: Math.max(0, Math.round(input.starts)),
    minutes: Math.max(0, Math.round(input.minutes)),
    goals: Math.max(0, Math.round(input.goals)),
    assists: Math.max(0, Math.round(input.assists)),
    cleanSheets: Math.max(0, Math.round(input.cleanSheets)),
    averageRating: input.averageRating === null ? null : clamp(input.averageRating, 3, 10),
  }
  const scores = openingScores(safeInput)
  let confidence: OpeningPriceConfidence = 'high'
  let guardrail: string | null = null
  let maximumValue = VALUE_CEILING

  if (safeInput.averageRating === null || safeInput.minutes < 90 || safeInput.appearances < 2) {
    confidence = 'fallback'
    maximumValue = 5_200_000
    guardrail = 'No reliable rated sample; conservative squad-player price cap applied.'
  } else if (safeInput.minutes < 450 || safeInput.appearances < 5) {
    confidence = 'limited'
    maximumValue = 6_500_000
    guardrail = 'Small sample below 450 minutes; price capped until more evidence arrives.'
  } else if (safeInput.minutes < 900) {
    confidence = 'limited'
    maximumValue = 8_000_000
    guardrail = 'Developing sample below 900 minutes; elite price bands remain locked.'
  } else if (safeInput.minutes < 1_500) {
    confidence = 'established'
    maximumValue = 10_500_000
    guardrail = 'Established but sub-1500-minute sample; top price bands remain locked.'
  } else if (safeInput.minutes < 2_100 || (scores.stabilizedRating ?? 0) < 7.05) {
    confidence = 'established'
    maximumValue = 12_500_000
    guardrail = 'Top price band requires both a large sample and elite stabilized rating.'
  }

  const calculated = interpolateOpeningValue(scores.overall)
  const value = clamp(
    Math.round(Math.min(calculated, maximumValue) / VALUE_INCREMENT) * VALUE_INCREMENT,
    VALUE_FLOOR,
    VALUE_CEILING,
  )
  return {
    value,
    confidence,
    evidence: {
      method_version: OPENING_PRICE_METHOD_VERSION,
      confidence,
      source_inputs: {
        appearances: safeInput.appearances,
        starts: safeInput.starts,
        minutes: safeInput.minutes,
        average_rating: safeInput.averageRating,
        goals: safeInput.goals,
        assists: safeInput.assists,
        clean_sheets: safeInput.cleanSheets,
      },
      scores: {
        stabilized_rating: scores.stabilizedRating === null ? null : Number(scores.stabilizedRating.toFixed(3)),
        rating: Number(scores.rating.toFixed(2)),
        minutes: Number(scores.minutes.toFixed(2)),
        role: Number(scores.role.toFixed(2)),
        output: Number(scores.output.toFixed(2)),
        team_context: Number(scores.teamContext.toFixed(2)),
        age: Number(scores.age.toFixed(2)),
        overall: Number(scores.overall.toFixed(2)),
      },
      guardrail,
      calculated_value: value,
    },
  }
}

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
