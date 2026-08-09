import { describe, expect, it } from 'vitest'
import { auditProviderTrial } from '@/lib/market/provider-trial'
import { normaliseSportmonksAppearance, normaliseSportmonksFixture, normaliseSportmonksPlayer } from '@/lib/market/providers/sportmonks'
import type { ProviderPlayer } from '@/lib/market/performance-ingestion'
import { toMarketSlug } from '@/lib/market/provider'

const context = { sourceReference: 'provider://trial/fixture-1', retrievedAt: '2026-08-16T08:00:00Z' }

describe('disabled Sportmonks trial boundary', () => {
  it('normalises documented fields but never self-verifies a rating', () => {
    const fixture = normaliseSportmonksFixture({ id: 1, league_id: 8, season_id: 27, round_id: 1, starting_at: '2026-08-15 14:00:00', state: { developer_name: 'FINISHED' }, participants: [{ id: 10, meta: { location: 'home' } }, { id: 20, meta: { location: 'away' } }] })
    const appearance = normaliseSportmonksAppearance({ id: 100, fixture_id: 1, player_id: 200, details: [{ data: { value: 7.4 }, type: { developer_name: 'RATING' } }, { data: { value: 90 }, type: { developer_name: 'MINUTES_PLAYED' } }] }, context)
    expect(fixture.value).toMatchObject({ providerFixtureId: '1', status: 'finished', homeClubId: '10', awayClubId: '20' })
    expect(appearance.value).toMatchObject({ providerPlayerId: '200', rating: 7.4, minutesPlayed: 90, verificationStatus: 'pending' })
  })
  it('quarantines unknown states and invalid statistics', () => {
    expect(normaliseSportmonksFixture({ id: 1, league_id: 8, season_id: 27, starting_at: '2026-08-15', state: { developer_name: 'MYSTERY' } }).value).toBeNull()
    expect(normaliseSportmonksAppearance({ id: 100, fixture_id: 1, player_id: 200, details: [{ data: { value: 14 }, type: { developer_name: 'RATING' } }] }, context).value).toBeNull()
  })

  it('normalises a documented squad member without images or official artwork', () => {
    const result = normaliseSportmonksPlayer({
      id: 99,
      player_id: 200,
      team_id: 10,
      player: { id: 200, display_name: 'Example Player' },
      team: { id: 10, name: 'Example Club' },
      position: { developer_name: 'MIDFIELDER' },
    }, { seasonStart: '2026-08-01' })
    expect(result.value).toMatchObject({
      providerPlayerId: '200',
      providerClubId: '10',
      displayName: 'Example Player',
      position: 'MID',
      squadStatus: 'rotation',
    })
  })
})

describe('provider trial report', () => {
  it('measures 300-player coverage and rating integrity', () => {
    const positions = ['GK', 'DEF', 'MID', 'FWD'] as const
    const players: ProviderPlayer[] = Array.from({ length: 300 }, (_, index) => ({ providerPlayerId: `p-${index}`, providerClubId: `c-${index % 20}`, displayName: `Player ${index}`, clubName: `Club ${index % 20}`, position: positions[index % 4]!, squadStatus: 'first_team', effectiveFrom: '2026-07-01', effectiveTo: null }))
    const report = auditProviderTrial({ players, fixtures: [{ providerFixtureId: 'f-1', competitionId: '8', seasonId: '27', gameweek: 1, kickoffAt: '2026-08-15T14:00:00Z', status: 'finished', homeClubId: 'c-1', awayClubId: 'c-2' }], appearances: [{ providerAppearanceId: 'a-1', providerFixtureId: 'f-1', providerPlayerId: 'p-1', minutesPlayed: 90, rating: 7.4, appeared: true, verificationStatus: 'pending', sourceName: 'trial', sourceReference: 'trial', retrievedAt: context.retrievedAt }] })
    expect(report.coverage.launchTargetMet).toBe(true)
    expect(report.ratingAvailabilityPercent).toBe(100)
    expect(report.trialPassesTechnicalGate).toBe(true)
  })
})

describe('market player slugs', () => {
  it('preserves base Latin letters when names contain accents', () => {
    expect(toMarketSlug('Adrián Niño')).toBe('adrian-nino')
    expect(toMarketSlug('Aitor Mañas')).toBe('aitor-manas')
  })
})
