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
