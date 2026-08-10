import { describe, expect, it } from 'vitest'
import { auditMarketCoverage, type CoveragePlayer } from '@/lib/market/dataset-coverage'
import { validatePerformanceImport, type PerformanceImport, type ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { calculateBankedPerformanceMovement, calculateOpeningGameplayValue, calculatePerformanceValueUpdate, calculateRollingRating, VALUE_CEILING, VALUE_FLOOR } from '@/lib/market/real-valuation'

function importFixture(overrides: Partial<PerformanceImport['fixture']> = {}, appearanceOverrides: Partial<PerformanceImport['appearances'][number]> = {}): PerformanceImport {
  return {
    fixture: {
      providerFixtureId: 'fixture-1', competitionId: 'premier-league', seasonId: 'season-1', gameweek: 1,
      kickoffAt: '2026-08-15T14:00:00Z', status: 'finished', homeClubId: 'club-1', awayClubId: 'club-2', ...overrides,
    },
    appearances: [{
      providerAppearanceId: 'appearance-1', providerFixtureId: 'fixture-1', providerPlayerId: 'player-1', minutesPlayed: 90,
      rating: 7.5, appeared: true, verificationStatus: 'verified', sourceName: 'licensed-provider', sourceReference: 'provider://fixture-1', retrievedAt: '2026-08-15T17:00:00Z', ...appearanceOverrides,
    }],
  }
}

function performance(rating: number, minutesPlayed: number, matchDate: string): ValidatedPerformance {
  const result = validatePerformanceImport(importFixture({ kickoffAt: matchDate }, { rating, minutesPlayed }))
  return result.accepted[0]!
}

describe('verified real-performance ingestion', () => {
  it('deduplicates the provider/fixture/player event grain', () => {
    const first = validatePerformanceImport(importFixture())
    const duplicate = validatePerformanceImport(importFixture(), new Set([first.accepted[0]!.idempotencyKey]))
    expect(first.accepted).toHaveLength(1)
    expect(duplicate.accepted).toHaveLength(0)
    expect(duplicate.issues[0]?.code).toBe('duplicate')
  })

  it.each([
    ['missing ratings', {}, { rating: null }, 'missing_rating'],
    ['unused substitutes', {}, { appeared: false, minutesPlayed: 0 }, 'unused_substitute'],
    ['postponed fixtures', { status: 'postponed' as const }, {}, 'fixture_not_finished'],
  ])('freezes %s', (_label, fixture, appearance, code) => {
    const result = validatePerformanceImport(importFixture(fixture, appearance))
    expect(result.accepted).toHaveLength(0)
    expect(result.issues[0]?.code).toBe(code)
  })
})

describe('rolling performance and value controls', () => {
  it('uses five appearances with recency and minutes weighting', () => {
    const fullRecent = performance(8, 90, '2026-09-05T14:00:00Z')
    const shortRecent = performance(8, 30, '2026-09-05T14:00:00Z')
    const older = [1, 2, 3, 4].map((day) => performance(6, 90, `2026-08-${10 + day}T14:00:00Z`))
    expect(calculateRollingRating([fullRecent, ...older])!.rating).toBeGreaterThan(calculateRollingRating([shortRecent, ...older])!.rating)
    expect(calculateRollingRating([fullRecent, ...older, performance(10, 90, '2026-01-01T14:00:00Z')])!.appearancesUsed).toBe(5)
  })

  it('does not update without an eligible appearance', () => {
    expect(calculatePerformanceValueUpdate({ position: 'MID', currentValue: 8_000_000, rollingWeekMovement: 0, performances: [] })).toBeNull()
  })

  it('recomputes the rolling average deterministically after a corrected rating', () => {
    const history = [
      performance(7, 90, '2026-08-10T14:00:00Z'),
      performance(7.2, 90, '2026-08-17T14:00:00Z'),
      performance(6.8, 90, '2026-08-24T14:00:00Z'),
    ]
    const original = calculateRollingRating(history)!
    const corrected = calculateRollingRating([history[0]!, history[1]!, performance(8.4, 90, '2026-08-24T14:00:00Z')])!
    expect(corrected.rating).toBeGreaterThan(original.rating)
    expect(calculateRollingRating([...history].reverse())!.rating).toBe(original.rating)
  })

  it('enforces weekly caps, floors, ceilings, and 0.1m increments', () => {
    const strong = performance(10, 90, '2026-09-05T14:00:00Z')
    const weak = performance(1, 90, '2026-09-05T14:00:00Z')
    expect(calculatePerformanceValueUpdate({ position: 'FWD', currentValue: 10_000_000, rollingWeekMovement: 500_000, performances: [strong] })!.movement).toBe(100_000)
    expect(calculatePerformanceValueUpdate({ position: 'GK', currentValue: VALUE_FLOOR, rollingWeekMovement: 0, performances: [weak] })!.newValue).toBe(VALUE_FLOOR)
    expect(calculatePerformanceValueUpdate({ position: 'FWD', currentValue: VALUE_CEILING, rollingWeekMovement: 0, performances: [strong] })!.newValue).toBe(VALUE_CEILING)
  })

  it('banks sub-threshold signals until they produce a full price step', () => {
    const first = calculateBankedPerformanceMovement({ ratingDeltaMilli: 100, previousBankMilli: 0, rollingWeekMovement: 0, currentValue: 8_000_000 })
    expect(first).toMatchObject({ movement: 0, newValue: 8_000_000, bankAfterEventMilli: 100 })

    const second = calculateBankedPerformanceMovement({ ratingDeltaMilli: 100, previousBankMilli: first.bankAfterEventMilli, rollingWeekMovement: 0, currentValue: first.newValue })
    expect(second).toMatchObject({ movement: 0, newValue: 8_000_000, bankAfterEventMilli: 200 })

    const third = calculateBankedPerformanceMovement({ ratingDeltaMilli: 100, previousBankMilli: second.bankAfterEventMilli, rollingWeekMovement: 0, currentValue: second.newValue })
    expect(third).toMatchObject({ movement: 100_000, newValue: 8_100_000, bankAfterEventMilli: 80 })
  })

  it('carries negative residuals and movement blocked by a weekly cap', () => {
    const falling = calculateBankedPerformanceMovement({ ratingDeltaMilli: -140, previousBankMilli: -100, rollingWeekMovement: 0, currentValue: 8_000_000 })
    expect(falling).toMatchObject({ movement: -100_000, newValue: 7_900_000, bankAfterEventMilli: -20 })

    const capped = calculateBankedPerformanceMovement({ ratingDeltaMilli: 440, previousBankMilli: 0, rollingWeekMovement: 600_000, currentValue: 8_000_000 })
    expect(capped).toMatchObject({ movement: 0, newValue: 8_000_000, bankAfterEventMilli: 440 })
  })

  it('assigns opening values from FootballIQ inputs in 0.1m increments', () => {
    const value = calculateOpeningGameplayValue({ position: 'MID', establishedPerformanceScore: 75, recentMinutesScore: 80, squadRoleScore: 70, availabilityScore: 90, agePotentialScore: 60 })
    expect(value % 100_000).toBe(0)
    expect(value).toBeGreaterThanOrEqual(VALUE_FLOOR)
    expect(value).toBeLessThanOrEqual(VALUE_CEILING)
  })
})

describe('launch catalogue coverage', () => {
  it('accepts a 300-player, 20-club catalogue with at least 11 per club and formation coverage', () => {
    const positions = ['GK', 'DEF', 'MID', 'FWD'] as const
    const players: CoveragePlayer[] = Array.from({ length: 300 }, (_, index) => ({
      providerPlayerId: `player-${index}`, providerClubId: `club-${index % 20}`,
      position: positions[index % positions.length], squadStatus: index % 7 === 0 ? 'rotation' : 'first_team',
    }))
    expect(auditMarketCoverage(players).launchTargetMet).toBe(true)
  })

  it('excludes transferred/departed players from usable club coverage', () => {
    const result = auditMarketCoverage([{ providerPlayerId: 'p1', providerClubId: 'old-club', position: 'FWD', squadStatus: 'departed' }])
    expect(result.usablePlayers).toBe(0)
    expect(result.clubCount).toBe(0)
  })
})
