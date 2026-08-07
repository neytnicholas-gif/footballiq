import type { PerformanceImport, ProviderAppearance, ProviderFixture, RealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { auditProviderTrial } from '@/lib/market/provider-trial'

export type DryRunQuarantineReason =
  | 'duplicate_event'
  | 'fixture_not_ready'
  | 'fixture_mismatch'
  | 'invalid_minutes'
  | 'missing_player'
  | 'missing_rating'
  | 'unused_substitute'

export type DryRunQuarantine = {
  reason: DryRunQuarantineReason
  providerFixtureId: string
  providerPlayerId: string | null
  message: string
}

export type ProviderDryRunOptions = {
  since: string
  now: Date
  nextMorningUtcHour?: number
}

export function nextMorningEligibilityAt(kickoffAt: string, utcHour = 7) {
  if (!Number.isInteger(utcHour) || utcHour < 0 || utcHour > 23) throw new Error('Next-morning UTC hour must be from 0 to 23.')
  const kickoff = new Date(kickoffAt)
  if (Number.isNaN(kickoff.getTime())) throw new Error('Fixture kickoff is invalid.')
  return new Date(Date.UTC(kickoff.getUTCFullYear(), kickoff.getUTCMonth(), kickoff.getUTCDate() + 1, utcHour))
}

export function fixtureReadyForNextMorning(fixture: ProviderFixture, now: Date, utcHour = 7) {
  return fixture.status === 'finished' && now >= nextMorningEligibilityAt(fixture.kickoffAt, utcHour)
}

function quarantineAppearances(fixture: ProviderFixture, appearances: ProviderAppearance[], playerIds: ReadonlySet<string>) {
  const quarantine: DryRunQuarantine[] = []
  const seen = new Set<string>()
  for (const appearance of appearances) {
    const eventKey = `${fixture.providerFixtureId}:${appearance.providerPlayerId}`
    if (seen.has(eventKey)) quarantine.push({ reason: 'duplicate_event', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: 'Fixture/player event appears more than once.' })
    seen.add(eventKey)
    if (appearance.providerFixtureId !== fixture.providerFixtureId) quarantine.push({ reason: 'fixture_mismatch', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: `Appearance belongs to fixture ${appearance.providerFixtureId}.` })
    if (!Number.isInteger(appearance.minutesPlayed) || appearance.minutesPlayed < 0 || appearance.minutesPlayed > 130) quarantine.push({ reason: 'invalid_minutes', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: 'Minutes are outside the accepted 0-130 integer range.' })
    if (!playerIds.has(appearance.providerPlayerId)) quarantine.push({ reason: 'missing_player', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: 'Appearance has no player in the trial catalogue.' })
    if (!appearance.appeared || appearance.minutesPlayed === 0) quarantine.push({ reason: 'unused_substitute', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: 'Unused substitute is retained for audit but cannot move value.' })
    else if (appearance.rating === null) quarantine.push({ reason: 'missing_rating', providerFixtureId: fixture.providerFixtureId, providerPlayerId: appearance.providerPlayerId, message: 'Played appearance has no rating; no replacement may be invented.' })
  }
  return quarantine
}

export async function runProviderDryRun(provider: RealPerformanceProvider, options: ProviderDryRunOptions) {
  if (typeof window !== 'undefined') throw new Error('Provider dry runs are server-only.')
  if (!provider.enabled) throw new Error('Provider dry run requires an explicitly enabled trial adapter.')
  if (Number.isNaN(Date.parse(options.since))) throw new Error('Dry-run start date is invalid.')

  const players = await provider.fetchPlayers()
  const fixtures = await provider.fetchFixtures(options.since)
  const playerIds = new Set(players.map((player) => player.providerPlayerId))
  const readyFixtures = fixtures.filter((fixture) => fixtureReadyForNextMorning(fixture, options.now, options.nextMorningUtcHour))
  const quarantine: DryRunQuarantine[] = fixtures
    .filter((fixture) => !fixtureReadyForNextMorning(fixture, options.now, options.nextMorningUtcHour))
    .map((fixture) => ({ reason: 'fixture_not_ready', providerFixtureId: fixture.providerFixtureId, providerPlayerId: null, message: `${fixture.status} fixture is not eligible for next-morning processing.` }))
  const imports: PerformanceImport[] = []
  const appearances: ProviderAppearance[] = []

  for (const fixture of readyFixtures) {
    const fixtureAppearances = await provider.fetchAppearances(fixture.providerFixtureId)
    appearances.push(...fixtureAppearances)
    quarantine.push(...quarantineAppearances(fixture, fixtureAppearances, playerIds))
    imports.push({ fixture, appearances: fixtureAppearances })
  }

  const report = auditProviderTrial({ players, fixtures, appearances })
  const blockingReasons = new Set<DryRunQuarantineReason>(['duplicate_event', 'fixture_mismatch', 'invalid_minutes', 'missing_player', 'missing_rating'])
  return {
    mode: 'read_only' as const,
    generatedAt: options.now.toISOString(),
    report,
    imports,
    quarantine,
    readyForOwnerVerification: report.trialPassesTechnicalGate && !quarantine.some((item) => blockingReasons.has(item.reason)),
    writesPerformed: 0 as const,
    valuesChanged: 0 as const,
  }
}
