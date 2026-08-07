// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ProviderAppearance, ProviderFixture, ProviderPlayer, RealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { disabledRealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { fixtureReadyForNextMorning, nextMorningEligibilityAt, runProviderDryRun } from '@/lib/market/server/provider-dry-run'
import { createSportmonksTrialProvider, type SportmonksTrialSource } from '@/lib/market/server/sportmonks-provider'

function catalogue(): ProviderPlayer[] {
  const positions = ['GK', 'DEF', 'MID', 'FWD'] as const
  return Array.from({ length: 300 }, (_, index) => ({
    providerPlayerId: `p-${index}`,
    providerClubId: `c-${index % 20}`,
    displayName: `Player ${index}`,
    clubName: `Club ${index % 20}`,
    position: positions[index % positions.length]!,
    squadStatus: 'rotation',
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  }))
}

const finishedFixture: ProviderFixture = {
  providerFixtureId: 'f-1',
  competitionId: 'pl',
  seasonId: '2026',
  gameweek: 1,
  kickoffAt: '2026-08-15T19:00:00Z',
  status: 'finished',
  homeClubId: 'c-1',
  awayClubId: 'c-2',
}

function appearance(overrides: Partial<ProviderAppearance> = {}): ProviderAppearance {
  return {
    providerAppearanceId: 'a-1',
    providerFixtureId: 'f-1',
    providerPlayerId: 'p-1',
    minutesPlayed: 90,
    rating: 7.4,
    appeared: true,
    verificationStatus: 'pending',
    sourceName: 'trial',
    sourceReference: 'provider://f-1',
    retrievedAt: '2026-08-16T08:00:00Z',
    ...overrides,
  }
}

function provider(appearances = [appearance()]): RealPerformanceProvider {
  return {
    name: 'enabled trial',
    enabled: true,
    async fetchPlayers() { return catalogue() },
    async fetchFixtures() { return [finishedFixture, { ...finishedFixture, providerFixtureId: 'f-2', status: 'scheduled' }] },
    async fetchAppearances() { return appearances },
  }
}

describe('next-morning provider dry run', () => {
  it('holds a finished fixture until the configured next-morning cutoff', () => {
    expect(nextMorningEligibilityAt(finishedFixture.kickoffAt).toISOString()).toBe('2026-08-16T07:00:00.000Z')
    expect(fixtureReadyForNextMorning(finishedFixture, new Date('2026-08-16T06:59:59Z'))).toBe(false)
    expect(fixtureReadyForNextMorning(finishedFixture, new Date('2026-08-16T07:00:00Z'))).toBe(true)
  })

  it('produces a read-only pass report without verifying or changing values', async () => {
    const result = await runProviderDryRun(provider(), { since: '2026-08-15', now: new Date('2026-08-16T08:00:00Z') })
    expect(result.mode).toBe('read_only')
    expect(result.report.coverage.launchTargetMet).toBe(true)
    expect(result.readyForOwnerVerification).toBe(true)
    expect(result.imports[0]?.appearances[0]?.verificationStatus).toBe('pending')
    expect(result.writesPerformed).toBe(0)
    expect(result.valuesChanged).toBe(0)
    expect(result.quarantine).toContainEqual(expect.objectContaining({ reason: 'fixture_not_ready', providerFixtureId: 'f-2' }))
  })

  it('blocks missing ratings and orphan players without inventing replacements', async () => {
    const result = await runProviderDryRun(provider([appearance({ providerPlayerId: 'unknown', rating: null })]), { since: '2026-08-15', now: new Date('2026-08-16T08:00:00Z') })
    expect(result.readyForOwnerVerification).toBe(false)
    expect(result.quarantine.map((item) => item.reason)).toEqual(expect.arrayContaining(['missing_player', 'missing_rating']))
  })

  it('blocks mismatched fixtures and impossible minutes at the generic boundary', async () => {
    const result = await runProviderDryRun(provider([appearance({ providerFixtureId: 'wrong-fixture', minutesPlayed: 131 })]), { since: '2026-08-15', now: new Date('2026-08-16T08:00:00Z') })
    expect(result.readyForOwnerVerification).toBe(false)
    expect(result.quarantine.map((item) => item.reason)).toEqual(expect.arrayContaining(['fixture_mismatch', 'invalid_minutes']))
  })

  it('rejects the permanently disabled production provider', async () => {
    await expect(runProviderDryRun(disabledRealPerformanceProvider, { since: '2026-08-15', now: new Date() })).rejects.toThrow('explicitly enabled trial adapter')
  })
})

describe('Sportmonks trial provider construction', () => {
  it('uses an injected source and remains impossible to activate through production runtime selection', async () => {
    const source: SportmonksTrialSource = {
      async fetchSquads() {
        return [{ player_id: 1, team_id: 2, player: { display_name: 'Trial Player' }, team: { name: 'Trial Club' }, position: { developer_name: 'FORWARD' } }]
      },
      async fetchFixtures() { return [] },
      async fetchLineups() { return [] },
      sourceReference(kind, id) { return `provider://${kind}/${id ?? 'all'}` },
    }
    const trial = createSportmonksTrialProvider(source, { enabled: true, seasonStart: '2026-08-01', now: () => new Date('2026-08-16T08:00:00Z') })
    expect(await trial.fetchPlayers()).toEqual([expect.objectContaining({ displayName: 'Trial Player', position: 'FWD' })])
  })
})
