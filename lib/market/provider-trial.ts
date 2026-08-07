import { auditMarketCoverage } from '@/lib/market/dataset-coverage'
import type { ProviderAppearance, ProviderFixture, ProviderPlayer } from '@/lib/market/performance-ingestion'

export type ProviderTrialInput = { players: ProviderPlayer[]; fixtures: ProviderFixture[]; appearances: ProviderAppearance[] }

export function auditProviderTrial(input: ProviderTrialInput) {
  const coverage = auditMarketCoverage(input.players)
  const playerIds = new Set(input.players.map((player) => player.providerPlayerId))
  const fixtureIds = new Set(input.fixtures.map((fixture) => fixture.providerFixtureId))
  const appeared = input.appearances.filter((appearance) => appearance.appeared && appearance.minutesPlayed > 0)
  const rated = appeared.filter((appearance) => appearance.rating !== null)
  const events = new Set(input.appearances.map((appearance) => `${appearance.providerFixtureId}:${appearance.providerPlayerId}`))
  const orphans = input.appearances.filter((appearance) => !playerIds.has(appearance.providerPlayerId) || !fixtureIds.has(appearance.providerFixtureId)).length
  return {
    coverage,
    fixtureCount: input.fixtures.length,
    finishedFixtureCount: input.fixtures.filter((fixture) => fixture.status === 'finished').length,
    appearanceCount: input.appearances.length,
    ratedAppearanceCount: rated.length,
    ratingAvailabilityPercent: appeared.length ? Math.round((rated.length / appeared.length) * 10_000) / 100 : 0,
    duplicateEventCount: input.appearances.length - events.size,
    orphanAppearanceCount: orphans,
    trialPassesTechnicalGate: coverage.launchTargetMet && input.fixtures.some((fixture) => fixture.status === 'finished') && appeared.length > 0 && rated.length === appeared.length && input.appearances.length === events.size && orphans === 0,
  }
}
