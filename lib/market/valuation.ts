import type { MarketStatsInput } from '@/lib/market/types'

export const PLAYER_MARKET_METHOD_VERSION = 'v1.0.0'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const safe = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export type ValuationBreakdown = {
  methodologyVersion: string
  confidence: 'high' | 'medium' | 'low'
  baseValue: number
  componentScores: {
    availability: number
    attack: number
    creation: number
    defensive: number
    cleanSheetOrSave: number
    form: number
    consistency: number
    roleSecurity: number
    agePotential: number
    cappedDemand: number
  }
  weightedScore: number
  computedValue: number
  roundedValue: number
  maxDailyMove: number
}

const weights = {
  availability: 0.2,
  attack: 0.2,
  creation: 0.12,
  defensive: 0.14,
  cleanSheetOrSave: 0.1,
  form: 0.1,
  consistency: 0.07,
  roleSecurity: 0.05,
  agePotential: 0.02,
}

function normalizePercent(raw: number | null, expectedMax: number) {
  if (raw === null || expectedMax <= 0) return 0
  return clamp((raw / expectedMax) * 100, 0, 100)
}

function scoreByPosition(input: MarketStatsInput) {
  const minutes = safe(input.minutes)
  const goals = safe(input.goals)
  const assists = safe(input.assists)
  const cleanSheets = safe(input.clean_sheets)
  const saves = safe(input.saves)
  const goalsConceded = safe(input.goals_conceded)
  const tackles = safe(input.tackles)
  const interceptions = safe(input.interceptions)
  const clearances = safe(input.clearances)
  const chancesCreated = safe(input.chances_created)
  const keyPasses = safe(input.key_passes)
  const shots = safe(input.shots)
  const shotsOnTarget = safe(input.shots_on_target)

  const availability = normalizePercent(minutes, 3200)

  let attack = 0
  if (input.position === 'FWD') {
    attack = normalizePercent((goals ?? 0) * 3 + (shotsOnTarget ?? 0), 110)
  } else if (input.position === 'MID') {
    attack = normalizePercent((goals ?? 0) * 2 + (shots ?? 0) * 0.5, 80)
  } else {
    attack = normalizePercent(goals ?? 0, 12)
  }

  const creation = normalizePercent((assists ?? 0) * 3 + (chancesCreated ?? 0) * 0.8 + (keyPasses ?? 0) * 0.6, 140)

  const defensiveRaw =
    (tackles ?? 0) * (input.position === 'DEF' ? 1.2 : 1)
    + (interceptions ?? 0) * 1.1
    + (clearances ?? 0) * (input.position === 'DEF' ? 1.3 : 0.7)
  const defensive = normalizePercent(defensiveRaw, 220)

  const cleanSheetOrSave = input.position === 'GK'
    ? normalizePercent((saves ?? 0) * 0.8 - (goalsConceded ?? 0) * 0.3 + (cleanSheets ?? 0) * 2.2, 110)
    : normalizePercent((cleanSheets ?? 0) * 3, 70)

  const form = clamp(safe(input.recent_form_score) ?? 50, 0, 100)
  const consistency = clamp(safe(input.consistency_score) ?? 50, 0, 100)
  const roleSecurity = clamp(safe(input.role_security_score) ?? 50, 0, 100)
  const agePotential = clamp(safe(input.age_potential_score) ?? 50, 0, 100)

  return {
    availability,
    attack,
    creation,
    defensive,
    cleanSheetOrSave,
    form,
    consistency,
    roleSecurity,
    agePotential,
  }
}

export function computePlayerMarketValue(
  input: MarketStatsInput,
  currentValue: number,
  options?: { demandCapPct?: number; maxDailyMovePct?: number },
): ValuationBreakdown | null {
  if (!input.owner_verified || input.provenance_status !== 'verified') {
    return null
  }

  const demandCapPct = clamp(options?.demandCapPct ?? 6, 0, 12)
  const maxDailyMovePct = clamp(options?.maxDailyMovePct ?? 8, 1, 12)

  const baseValue = 4_000_000
  const dynamicRange = 11_000_000

  const components = scoreByPosition(input)
  const weightedScore = (
    components.availability * weights.availability
    + components.attack * weights.attack
    + components.creation * weights.creation
    + components.defensive * weights.defensive
    + components.cleanSheetOrSave * weights.cleanSheetOrSave
    + components.form * weights.form
    + components.consistency * weights.consistency
    + components.roleSecurity * weights.roleSecurity
    + components.agePotential * weights.agePotential
  )

  const uncappedValue = baseValue + (dynamicRange * (weightedScore / 100))

  const demandScore = clamp(safe(input.market_demand_score) ?? 50, 0, 100)
  const demandImpactPct = ((demandScore - 50) / 50) * demandCapPct
  const demandMultiplier = 1 + (demandImpactPct / 100)

  const demandAdjustedValue = uncappedValue * demandMultiplier

  const maxDailyMove = Math.round(currentValue * (maxDailyMovePct / 100))
  const limitedValue = clamp(demandAdjustedValue, currentValue - maxDailyMove, currentValue + maxDailyMove)

  const roundedValue = clamp(Math.round(limitedValue / 100_000) * 100_000, 4_000_000, 15_000_000)

  const knownSignals = [
    input.minutes,
    input.goals,
    input.assists,
    input.clean_sheets,
    input.saves,
    input.tackles,
    input.interceptions,
    input.chances_created,
  ].filter((item) => typeof item === 'number').length

  const confidence: 'high' | 'medium' | 'low' = knownSignals >= 7 ? 'high' : knownSignals >= 4 ? 'medium' : 'low'

  return {
    methodologyVersion: PLAYER_MARKET_METHOD_VERSION,
    confidence,
    baseValue,
    componentScores: {
      ...components,
      cappedDemand: demandImpactPct,
    },
    weightedScore: Number(weightedScore.toFixed(2)),
    computedValue: Math.round(demandAdjustedValue),
    roundedValue,
    maxDailyMove,
  }
}
