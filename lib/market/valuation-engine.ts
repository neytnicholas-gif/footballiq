export type ValuationRules = {
  baselineRatingMilli: number
  priceStepMinor: number
  minimumPriceMinor: number
  maximumPriceMinor: number
  minimumMinutes: number
  substituteMinimumMinutes: number
  maximumWeeklyPriceChangeMinor: number
  calculationVersion: string
}

export type ValuationState = {
  playerId: string
  currentPriceMinor: number
  performanceBankMilli: number
  weeklyMovementMinor: number
}

export type MatchPerformanceInput = {
  statId: string
  playerId: string
  fixtureDate: string
  appeared: boolean
  started: boolean
  minutesPlayed: number
  ratingMilli: number | null
}

export type ValuationEventResult = {
  applied: boolean
  skippedReason?: 'duplicate' | 'no_appearance' | 'below_minutes' | 'missing_rating' | 'player_mismatch'
  previousPriceMinor: number
  newPriceMinor: number
  previousBankMilli: number
  bankAfterEventMilli: number
  ratingDeltaMilli: number
  priceChangeMinor: number
  calculationVersion: string
}

export type WeeklyRatingInput = MatchPerformanceInput & {
  marketWeekKey: string
}

export type WeeklyRatingAggregate = {
  playerId: string
  marketWeekKey: string
  sourceStatIds: string[]
  ratingMilli: number | null
  skippedReason?: 'no_appearance' | 'missing_rating'
}

export function ratingToMilli(rating: number): number {
  return Math.round(rating * 1000)
}

export function milliToRating(milli: number): string {
  const sign = milli < 0 ? '-' : ''
  const absolute = Math.abs(milli)
  const whole = Math.floor(absolute / 1000)
  const fraction = absolute % 1000
  return `${sign}${whole}.${fraction.toString().padStart(3, '0')}`
}

export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value)
}

/**
 * Produces one deterministic rating per player/week. No appearance and unrated
 * appearances never manufacture a rating. Any supplied rating, including a
 * rated substitute appearance, participates in the arithmetic mean.
 */
export function aggregateWeeklyRatings(matches: WeeklyRatingInput[]): WeeklyRatingAggregate[] {
  const groups = new Map<string, WeeklyRatingInput[]>()
  for (const match of matches) {
    const key = `${match.playerId}\u0000${match.marketWeekKey}`
    const group = groups.get(key) ?? []
    group.push(match)
    groups.set(key, group)
  }

  return [...groups.values()]
    .map((group): WeeklyRatingAggregate => {
      const first = group[0]
      const sourceStatIds = [...new Set(group.map((match) => match.statId))].sort()
      const appearances = group.filter((match) => match.appeared)
      const ratings = appearances
        .map((match) => match.ratingMilli)
        .filter((rating): rating is number => rating !== null)

      if (appearances.length === 0) {
        return {
          playerId: first.playerId,
          marketWeekKey: first.marketWeekKey,
          sourceStatIds,
          ratingMilli: null,
          skippedReason: 'no_appearance',
        }
      }
      if (ratings.length === 0) {
        return {
          playerId: first.playerId,
          marketWeekKey: first.marketWeekKey,
          sourceStatIds,
          ratingMilli: null,
          skippedReason: 'missing_rating',
        }
      }

      return {
        playerId: first.playerId,
        marketWeekKey: first.marketWeekKey,
        sourceStatIds,
        ratingMilli: roundHalfAwayFromZero(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length),
      }
    })
    .sort((left, right) =>
      left.marketWeekKey.localeCompare(right.marketWeekKey) || left.playerId.localeCompare(right.playerId),
    )
}

export function weeklyValuationIdempotencyKey(aggregate: WeeklyRatingAggregate): string {
  return `weekly:${aggregate.marketWeekKey}:${aggregate.playerId}:${aggregate.sourceStatIds.join(',')}`
}

export function processValuationMatch(
  state: ValuationState,
  match: MatchPerformanceInput,
  rules: ValuationRules,
  processedStatIds: Set<string>,
): ValuationEventResult {
  const previousPriceMinor = state.currentPriceMinor
  const previousBankMilli = state.performanceBankMilli

  if (match.playerId !== state.playerId) {
    return {
      applied: false,
      skippedReason: 'player_mismatch',
      previousPriceMinor,
      newPriceMinor: state.currentPriceMinor,
      previousBankMilli,
      bankAfterEventMilli: state.performanceBankMilli,
      ratingDeltaMilli: 0,
      priceChangeMinor: 0,
      calculationVersion: rules.calculationVersion,
    }
  }

  if (processedStatIds.has(match.statId)) {
    return {
      applied: false,
      skippedReason: 'duplicate',
      previousPriceMinor,
      newPriceMinor: state.currentPriceMinor,
      previousBankMilli,
      bankAfterEventMilli: state.performanceBankMilli,
      ratingDeltaMilli: 0,
      priceChangeMinor: 0,
      calculationVersion: rules.calculationVersion,
    }
  }

  processedStatIds.add(match.statId)

  if (!match.appeared) {
    return {
      applied: false,
      skippedReason: 'no_appearance',
      previousPriceMinor,
      newPriceMinor: state.currentPriceMinor,
      previousBankMilli,
      bankAfterEventMilli: state.performanceBankMilli,
      ratingDeltaMilli: 0,
      priceChangeMinor: 0,
      calculationVersion: rules.calculationVersion,
    }
  }

  const eligibleByMinutes =
    match.minutesPlayed >= rules.minimumMinutes ||
    (!match.started && match.minutesPlayed >= rules.substituteMinimumMinutes)

  if (!eligibleByMinutes) {
    return {
      applied: false,
      skippedReason: 'below_minutes',
      previousPriceMinor,
      newPriceMinor: state.currentPriceMinor,
      previousBankMilli,
      bankAfterEventMilli: state.performanceBankMilli,
      ratingDeltaMilli: 0,
      priceChangeMinor: 0,
      calculationVersion: rules.calculationVersion,
    }
  }

  if (match.ratingMilli === null) {
    return {
      applied: false,
      skippedReason: 'missing_rating',
      previousPriceMinor,
      newPriceMinor: state.currentPriceMinor,
      previousBankMilli,
      bankAfterEventMilli: state.performanceBankMilli,
      ratingDeltaMilli: 0,
      priceChangeMinor: 0,
      calculationVersion: rules.calculationVersion,
    }
  }

  const ratingDeltaMilli = match.ratingMilli - rules.baselineRatingMilli
  let bankAfterEventMilli = state.performanceBankMilli + ratingDeltaMilli
  let newPriceMinor = state.currentPriceMinor

  // Apply positive or negative price steps only while weekly movement constraints allow it.
  while (bankAfterEventMilli >= 1000) {
    if (Math.abs(state.weeklyMovementMinor + rules.priceStepMinor) > rules.maximumWeeklyPriceChangeMinor) {
      break
    }
    if (newPriceMinor + rules.priceStepMinor > rules.maximumPriceMinor) {
      break
    }
    newPriceMinor += rules.priceStepMinor
    state.weeklyMovementMinor += rules.priceStepMinor
    bankAfterEventMilli -= 1000
  }

  while (bankAfterEventMilli <= -1000) {
    if (Math.abs(state.weeklyMovementMinor - rules.priceStepMinor) > rules.maximumWeeklyPriceChangeMinor) {
      break
    }
    if (newPriceMinor - rules.priceStepMinor < rules.minimumPriceMinor) {
      break
    }
    newPriceMinor -= rules.priceStepMinor
    state.weeklyMovementMinor -= rules.priceStepMinor
    bankAfterEventMilli += 1000
  }

  state.currentPriceMinor = newPriceMinor
  state.performanceBankMilli = bankAfterEventMilli

  return {
    applied: true,
    previousPriceMinor,
    newPriceMinor,
    previousBankMilli,
    bankAfterEventMilli,
    ratingDeltaMilli,
    priceChangeMinor: newPriceMinor - previousPriceMinor,
    calculationVersion: rules.calculationVersion,
  }
}
