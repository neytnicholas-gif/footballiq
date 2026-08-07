import type { FixtureStatus, ProviderAppearance, ProviderFixture, ProviderPlayer, SquadStatus } from '@/lib/market/performance-ingestion'
import type { MarketPosition } from '@/lib/market/types'

export const SPORTMONKS_PROVIDER_NAME = 'Sportmonks Football API'

type StatisticDetail = { data?: { value?: unknown }; type?: { developer_name?: string | null } }
export type SportmonksLineupRow = { id?: number | string; fixture_id?: number | string; player_id?: number | string; details?: StatisticDetail[] | null }
export type SportmonksSquadRow = {
  id?: number | string
  player_id?: number | string
  team_id?: number | string
  season_id?: number | string
  player?: { id?: number | string; display_name?: string | null; name?: string | null } | null
  team?: { id?: number | string; name?: string | null } | null
  position?: { developer_name?: string | null; name?: string | null } | null
  transfer?: { date?: string | null; type?: { developer_name?: string | null } | null } | null
}
export type SportmonksFixtureRow = {
  id?: number | string; league_id?: number | string; season_id?: number | string; round_id?: number | string | null; starting_at?: string
  state?: { developer_name?: string | null; short_name?: string | null } | null
  participants?: Array<{ id?: number | string; meta?: { location?: string | null } | null }> | null
}
export type SportmonksAppearanceContext = { sourceReference: string; retrievedAt: string }
export type SportmonksNormalisationIssue = { code: 'missing_identity' | 'missing_fixture_context' | 'missing_clubs' | 'unknown_fixture_status' | 'invalid_statistic'; message: string }

export type SportmonksPlayerContext = {
  seasonStart: string
}

function id(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  return String(value).trim() || null
}
function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}
function statistic(row: SportmonksLineupRow, name: 'RATING' | 'MINUTES_PLAYED') {
  const detail = row.details?.find((item) => item.type?.developer_name?.toUpperCase() === name)
  return detail ? number(detail.data?.value) : null
}

function providerDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
  const normalized = explicitZone ? value : `${value.trim().replace(' ', 'T')}Z`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function mapPosition(value: string | null | undefined): MarketPosition | null {
  const position = (value ?? '').toUpperCase().replace(/[\s-]+/g, '_')
  if (['GOALKEEPER', 'KEEPER', 'GK'].includes(position)) return 'GK'
  if (['DEFENDER', 'DEFENCE', 'DEFENSE', 'DEF'].includes(position)) return 'DEF'
  if (['MIDFIELDER', 'MIDFIELD', 'MID'].includes(position)) return 'MID'
  if (['FORWARD', 'ATTACKER', 'STRIKER', 'FWD'].includes(position)) return 'FWD'
  return null
}

function squadStatus(row: SportmonksSquadRow): SquadStatus {
  const transferType = row.transfer?.type?.developer_name?.toUpperCase()
  if (transferType?.includes('LOAN_OUT')) return 'loaned_out'
  if (transferType?.includes('OUT')) return 'departed'
  return 'rotation'
}

export function normaliseSportmonksPlayer(row: SportmonksSquadRow, context: SportmonksPlayerContext) {
  const issues: SportmonksNormalisationIssue[] = []
  const providerPlayerId = id(row.player_id ?? row.player?.id)
  const providerClubId = id(row.team_id ?? row.team?.id)
  const displayName = (row.player?.display_name ?? row.player?.name ?? '').trim()
  const clubName = (row.team?.name ?? '').trim()
  const position = mapPosition(row.position?.developer_name ?? row.position?.name)
  if (!providerPlayerId || !providerClubId || !displayName || !clubName || !position) {
    issues.push({ code: 'missing_identity', message: 'Squad player requires stable player/club IDs, names and a supported position.' })
    return { value: null, issues }
  }
  const value: ProviderPlayer = {
    providerPlayerId,
    providerClubId,
    displayName,
    clubName,
    position,
    squadStatus: squadStatus(row),
    effectiveFrom: context.seasonStart,
    effectiveTo: row.transfer?.date ?? null,
  }
  return { value, issues }
}

export function mapSportmonksFixtureStatus(row: SportmonksFixtureRow): FixtureStatus | null {
  const state = (row.state?.developer_name ?? row.state?.short_name ?? '').toUpperCase().replace(/[\s-]+/g, '_')
  if (['FT', 'AET', 'AFTER_EXTRA_TIME', 'FINISHED'].includes(state)) return 'finished'
  if (['NS', 'TBA', 'SCHEDULED', 'NOT_STARTED'].includes(state)) return 'scheduled'
  if (['POSTP', 'POSTPONED', 'DELAYED'].includes(state)) return 'postponed'
  if (['CANC', 'CANCELLED', 'CANCELED', 'ABAN', 'ABANDONED'].includes(state)) return 'cancelled'
  return null
}

export function normaliseSportmonksFixture(row: SportmonksFixtureRow) {
  const issues: SportmonksNormalisationIssue[] = []
  const providerFixtureId = id(row.id), competitionId = id(row.league_id), seasonId = id(row.season_id)
  const kickoffAt = providerDateTime(row.starting_at)
  const status = mapSportmonksFixtureStatus(row)
  const homeClubId = id(row.participants?.find((club) => club.meta?.location?.toLowerCase() === 'home')?.id)
  const awayClubId = id(row.participants?.find((club) => club.meta?.location?.toLowerCase() === 'away')?.id)
  if (!providerFixtureId || !competitionId || !seasonId || !kickoffAt) issues.push({ code: 'missing_fixture_context', message: 'Fixture identity, competition, season and kickoff are required.' })
  if (!homeClubId || !awayClubId) issues.push({ code: 'missing_clubs', message: 'Both home and away provider club IDs are required.' })
  if (!status) issues.push({ code: 'unknown_fixture_status', message: 'The provider fixture state is not mapped and must be reviewed.' })
  if (issues.length || !providerFixtureId || !competitionId || !seasonId || !kickoffAt || !status || !homeClubId || !awayClubId) return { value: null, issues }
  const round = number(row.round_id)
  const value: ProviderFixture = { providerFixtureId, competitionId, seasonId, gameweek: round !== null && Number.isInteger(round) ? round : null, kickoffAt, status, homeClubId, awayClubId }
  return { value, issues }
}

export function normaliseSportmonksAppearance(row: SportmonksLineupRow, context: SportmonksAppearanceContext) {
  const issues: SportmonksNormalisationIssue[] = []
  const providerAppearanceId = id(row.id), providerFixtureId = id(row.fixture_id), providerPlayerId = id(row.player_id)
  const minutes = statistic(row, 'MINUTES_PLAYED'), rating = statistic(row, 'RATING')
  if (!providerAppearanceId || !providerFixtureId || !providerPlayerId) issues.push({ code: 'missing_identity', message: 'Lineup, fixture and player provider IDs are required.' })
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 130)) issues.push({ code: 'invalid_statistic', message: 'Provider minutes are outside the accepted range.' })
  if (rating !== null && (rating < 0 || rating > 10)) issues.push({ code: 'invalid_statistic', message: 'Provider rating is outside the documented 0-10 range.' })
  if (issues.length || !providerAppearanceId || !providerFixtureId || !providerPlayerId) return { value: null, issues }
  const value: ProviderAppearance = {
    providerAppearanceId, providerFixtureId, providerPlayerId, minutesPlayed: minutes ?? 0, rating, appeared: (minutes ?? 0) > 0,
    verificationStatus: 'pending', sourceName: SPORTMONKS_PROVIDER_NAME, sourceReference: context.sourceReference, retrievedAt: context.retrievedAt,
  }
  return { value, issues }
}
