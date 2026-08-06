import type { MarketPosition } from '@/lib/market/types'

export const REAL_PERFORMANCE_METHOD_VERSION = 'fiq-real-performance-v2.0.0'

export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type SquadStatus = 'first_team' | 'rotation' | 'loaned_out' | 'injured' | 'departed' | 'inactive'
export type FixtureStatus = 'scheduled' | 'postponed' | 'cancelled' | 'finished'

export type ProviderPlayer = {
  providerPlayerId: string
  providerClubId: string
  displayName: string
  clubName: string
  position: MarketPosition
  squadStatus: SquadStatus
  effectiveFrom: string
  effectiveTo: string | null
}

export type ProviderFixture = {
  providerFixtureId: string
  competitionId: string
  seasonId: string
  gameweek: number | null
  kickoffAt: string
  status: FixtureStatus
  homeClubId: string
  awayClubId: string
}

export type ProviderAppearance = {
  providerAppearanceId: string
  providerFixtureId: string
  providerPlayerId: string
  minutesPlayed: number
  rating: number | null
  appeared: boolean
  verificationStatus: VerificationStatus
  sourceName: string
  sourceReference: string
  retrievedAt: string
}

export type PerformanceImport = {
  fixture: ProviderFixture
  appearances: ProviderAppearance[]
}

export type ValidatedPerformance = ProviderAppearance & {
  idempotencyKey: string
  eligibleForValuation: true
  matchDate: string
  gameweek: number | null
}

export type ImportIssue = {
  code: 'fixture_not_finished' | 'fixture_id_mismatch' | 'invalid_minutes' | 'missing_rating' | 'unverified' | 'unused_substitute' | 'duplicate'
  appearanceId: string | null
  message: string
}

export function performanceIdempotencyKey(event: ProviderAppearance) {
  return `${event.sourceName}:${event.providerFixtureId}:${event.providerPlayerId}`
}

export function validatePerformanceImport(input: PerformanceImport, existingKeys: ReadonlySet<string> = new Set()) {
  const accepted: ValidatedPerformance[] = []
  const issues: ImportIssue[] = []

  for (const appearance of input.appearances) {
    const fail = (code: ImportIssue['code'], message: string) => issues.push({ code, appearanceId: appearance.providerAppearanceId || null, message })
    if (input.fixture.status !== 'finished') {
      fail('fixture_not_finished', `Fixture ${input.fixture.providerFixtureId} is ${input.fixture.status}; no values may move.`)
      continue
    }
    if (appearance.providerFixtureId !== input.fixture.providerFixtureId) {
      fail('fixture_id_mismatch', 'Appearance does not belong to the imported fixture.')
      continue
    }
    if (!Number.isInteger(appearance.minutesPlayed) || appearance.minutesPlayed < 0 || appearance.minutesPlayed > 130) {
      fail('invalid_minutes', 'Minutes must be an integer from 0 to 130.')
      continue
    }
    if (!appearance.appeared || appearance.minutesPlayed === 0) {
      fail('unused_substitute', 'Unused substitutes do not receive a valuation event.')
      continue
    }
    if (appearance.rating === null || !Number.isFinite(appearance.rating)) {
      fail('missing_rating', 'A missing provider rating is never replaced or invented.')
      continue
    }
    if (appearance.rating < 0 || appearance.rating > 10 || appearance.verificationStatus !== 'verified') {
      fail('unverified', 'Only verified ratings on the provider 0-10 scale are eligible.')
      continue
    }
    const idempotencyKey = performanceIdempotencyKey(appearance)
    if (existingKeys.has(idempotencyKey) || accepted.some((row) => row.idempotencyKey === idempotencyKey)) {
      fail('duplicate', `Performance ${idempotencyKey} has already been accepted.`)
      continue
    }
    accepted.push({
      ...appearance,
      idempotencyKey,
      eligibleForValuation: true,
      matchDate: input.fixture.kickoffAt,
      gameweek: input.fixture.gameweek,
    })
  }

  return { accepted, issues }
}

export type RealPerformanceProvider = {
  readonly name: string
  readonly enabled: boolean
  fetchPlayers(): Promise<ProviderPlayer[]>
  fetchFixtures(since: string): Promise<ProviderFixture[]>
  fetchAppearances(fixtureId: string): Promise<ProviderAppearance[]>
}

export const disabledRealPerformanceProvider: RealPerformanceProvider = {
  name: 'No licensed provider configured',
  enabled: false,
  async fetchPlayers() { return [] },
  async fetchFixtures() { return [] },
  async fetchAppearances() { return [] },
}
