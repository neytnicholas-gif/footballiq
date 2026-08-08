import { toMarketSlug } from '@/lib/market/provider'
import type { ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { calculatePerformanceValueUpdate } from '@/lib/market/real-valuation'
import type { MarketPlayer, MarketPosition } from '@/lib/market/types'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const PREMIER_LEAGUE_ID = 8
const VERIFIED_SAMPLE_FIXTURE_ID = 19427734
const TOP_FIVE_LEAGUES = [
  { id: 8, name: 'Premier League' },
  { id: 564, name: 'La Liga' },
  { id: 82, name: 'Bundesliga' },
  { id: 384, name: 'Serie A' },
  { id: 301, name: 'Ligue 1' },
] as const

type JsonRecord = Record<string, unknown>

export type SportmonksCoverageReport = {
  provider: 'Sportmonks Football API'
  mode: 'read_only'
  authenticated: true
  leagueId: number
  seasonId: string
  seasonName: string | null
  teamCount: number
  squadRows: number
  uniquePlayerCount: number
  usablePlayerCount: number
  positionCoverage: Record<'GK' | 'DEF' | 'MID' | 'FWD', number>
  sampleFixtureId: number
  lineupRows: number
  appearedPlayers: number
  playersWithMinutes: number
  playersWithRatings: number
  ratingAvailabilityPercent: number
  minutesAvailabilityPercent: number
  topFiveLeagueAccess: Array<{ id: number; name: string; accessible: boolean; currentSeasonId: string | null }>
  writesPerformed: 0
  valuesChanged: 0
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter((row): row is JsonRecord => Boolean(row)) : []
}

function relation(row: JsonRecord, ...names: string[]) {
  for (const name of names) {
    const value = row[name]
    const direct = record(value)
    if (direct) return direct
    const first = records(value)[0]
    if (first) return first
  }
  return null
}

function relationRows(row: JsonRecord, ...names: string[]) {
  for (const name of names) {
    const value = records(row[name])
    if (value.length) return value
  }
  return []
}

function numericDetail(row: JsonRecord, developerName: string) {
  const details = relationRows(row, 'details')
  const detail = details.find((item) => relation(item, 'type')?.developer_name === developerName)
  const data = detail ? relation(detail, 'data') : null
  const raw = data?.value
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function mapPosition(row: JsonRecord) {
  const value = String(relation(row, 'position')?.developer_name ?? relation(row, 'position')?.name ?? '').toUpperCase()
  if (value.includes('GOALKEEPER')) return 'GK' as const
  if (value.includes('DEFENDER')) return 'DEF' as const
  if (value.includes('MIDFIELDER')) return 'MID' as const
  if (value.includes('FORWARD') || value.includes('ATTACKER')) return 'FWD' as const
  return null
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function playerAge(player: JsonRecord) {
  const explicit = Number(player.age)
  if (Number.isFinite(explicit) && explicit >= 15 && explicit <= 50) return Math.round(explicit)
  const birthDate = textValue(player.date_of_birth ?? player.dateofbirth ?? player.birthdate)
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getUTCFullYear() - born.getUTCFullYear()
  if (today.getUTCMonth() < born.getUTCMonth() || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())) age -= 1
  return age >= 15 && age <= 50 ? age : null
}

function openingGameValue(position: MarketPosition, age: number | null) {
  const positionBase: Record<MarketPosition, number> = { GK: 5_500_000, DEF: 6_200_000, MID: 6_800_000, FWD: 7_200_000 }
  const ageAdjustment = age === null ? 0
    : age <= 21 ? 700_000
      : age <= 24 ? 1_000_000
        : age <= 28 ? 800_000
          : age <= 31 ? 300_000
            : age <= 34 ? -300_000
              : -700_000
  return Math.max(4_000_000, Math.min(15_000_000, positionBase[position] + ageAdjustment))
}

export type SportmonksMarketCatalogue = {
  provider: 'Sportmonks Football API'
  competition: 'Premier League'
  seasonId: string
  seasonName: string | null
  generatedAt: string
  playerCount: number
  marketPhase: 'opening' | 'verified_movement'
  completedFixturesApplied: number
  ratedPlayerCount: number
  latestCompletedAt: string | null
  players: MarketPlayer[]
}

function isFinishedFixture(row: JsonRecord) {
  const state = relation(row, 'state')
  const value = String(state?.developer_name ?? state?.short_name ?? '').toUpperCase().replace(/[\s-]+/g, '_')
  return ['FT', 'AET', 'AFTER_EXTRA_TIME', 'FINISHED'].includes(value)
}

function fixtureDate(row: JsonRecord) {
  const value = textValue(row.starting_at)
  if (!value) return null
  const parsed = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function createSportmonksClient(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  if (typeof window !== 'undefined') throw new Error('Sportmonks access is server-only.')
  if (!apiToken?.trim()) throw new Error('SPORTMONKS_API_TOKEN is not configured.')
  const token: string = apiToken.trim()

  async function get(path: string) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: token },
      next: { revalidate: 3600 },
    })
    if (!response.ok) throw new Error(`Sportmonks request failed with HTTP ${response.status}.`)
    const payload = record(await response.json())
    if (!payload || !('data' in payload)) throw new Error('Sportmonks returned an invalid response.')
    return payload.data
  }

  return { get }
}

export async function runSportmonksCoverageTrial(apiToken = process.env.SPORTMONKS_API_TOKEN): Promise<SportmonksCoverageReport> {
  const client = createSportmonksClient(apiToken)
  const league = record(await client.get(`/leagues/${PREMIER_LEAGUE_ID}?include=currentSeason`))
  if (!league) throw new Error('Premier League access did not return league data.')
  const season = relation(league, 'currentseason', 'currentSeason')
  const seasonId = String(season?.id ?? '')
  if (!seasonId) throw new Error('Premier League current-season access is unavailable on this subscription.')

  const teams = records(await client.get(`/teams/seasons/${encodeURIComponent(seasonId)}`))
  const teamIds = teams.map((team) => team.id).filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const squads = (await Promise.all(teamIds.map(async (teamId) => records(await client.get(
    `/squads/seasons/${encodeURIComponent(seasonId)}/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
  ))))).flat()
  const uniquePlayers = new Map(squads.map((row) => [String(row.player_id ?? relation(row, 'player')?.id ?? ''), row]))
  uniquePlayers.delete('')
  const usablePlayers = [...uniquePlayers.values()].filter((row) => mapPosition(row))
  const positionCoverage = usablePlayers.reduce<Record<'GK' | 'DEF' | 'MID' | 'FWD', number>>((counts, row) => {
    const position = mapPosition(row)
    if (position) counts[position] += 1
    return counts
  }, { GK: 0, DEF: 0, MID: 0, FWD: 0 })

  const fixture = record(await client.get(`/fixtures/${VERIFIED_SAMPLE_FIXTURE_ID}?include=lineups.details.type;state;participants`))
  if (!fixture) throw new Error('The Premier League sample fixture was unavailable.')
  const lineups = relationRows(fixture, 'lineups')
  const minutes = lineups.map((row) => numericDetail(row, 'MINUTES_PLAYED'))
  const ratings = lineups.map((row) => numericDetail(row, 'RATING'))
  const appearedPlayers = minutes.filter((value) => value !== null && value > 0).length
  const playersWithMinutes = minutes.filter((value) => value !== null).length
  const playersWithRatings = ratings.filter((value) => value !== null).length
  const otherLeagueResults = await Promise.allSettled(TOP_FIVE_LEAGUES.slice(1).map(async ({ id }) => (
    record(await client.get(`/leagues/${id}?include=currentSeason`))
  )))
  const topFiveLeagueAccess = TOP_FIVE_LEAGUES.map(({ id, name }, index) => {
    const result = otherLeagueResults[index - 1]
    const row = index === 0 ? league : result?.status === 'fulfilled' ? result.value : null
    const currentSeason = row ? relation(row, 'currentseason', 'currentSeason') : null
    return { id, name, accessible: Boolean(row && currentSeason?.id), currentSeasonId: currentSeason?.id ? String(currentSeason.id) : null }
  })

  return {
    provider: 'Sportmonks Football API', mode: 'read_only', authenticated: true,
    leagueId: PREMIER_LEAGUE_ID, seasonId, seasonName: typeof season?.name === 'string' ? season.name : null,
    teamCount: teams.length, squadRows: squads.length, uniquePlayerCount: uniquePlayers.size, usablePlayerCount: usablePlayers.length,
    positionCoverage, sampleFixtureId: VERIFIED_SAMPLE_FIXTURE_ID, lineupRows: lineups.length, appearedPlayers,
    playersWithMinutes, playersWithRatings,
    ratingAvailabilityPercent: appearedPlayers ? Math.round((playersWithRatings / appearedPlayers) * 10_000) / 100 : 0,
    minutesAvailabilityPercent: lineups.length ? Math.round((playersWithMinutes / lineups.length) * 10_000) / 100 : 0,
    topFiveLeagueAccess,
    writesPerformed: 0, valuesChanged: 0,
  }
}

export async function buildSportmonksPremierLeagueCatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN): Promise<SportmonksMarketCatalogue> {
  const client = createSportmonksClient(apiToken)
  const league = record(await client.get(`/leagues/${PREMIER_LEAGUE_ID}?include=currentSeason`))
  const season = league ? relation(league, 'currentseason', 'currentSeason') : null
  const seasonId = String(season?.id ?? '')
  if (!seasonId) throw new Error('Premier League current-season access is unavailable.')

  const teams = records(await client.get(`/teams/seasons/${encodeURIComponent(seasonId)}`))
  const teamIds = teams.map((team) => team.id).filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const squads = (await Promise.all(teamIds.map(async (teamId) => records(await client.get(
    `/squads/seasons/${encodeURIComponent(seasonId)}/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
  ))))).flat()
  const seasonSchedule = record(await client.get(`/seasons/${encodeURIComponent(seasonId)}?include=fixtures.state`))
  const completedFixtures = relationRows(seasonSchedule ?? {}, 'fixtures')
    .filter((fixture) => isFinishedFixture(fixture) && fixtureDate(fixture))
    .sort((a, b) => Date.parse(fixtureDate(b)!) - Date.parse(fixtureDate(a)!))
    .slice(0, 10)
  const fixtureLineups = await Promise.all(completedFixtures.map(async (fixture) => ({
    fixture,
    payload: record(await client.get(`/fixtures/${encodeURIComponent(String(fixture.id))}?include=lineups.details.type`)),
  })))
  const now = new Date().toISOString()
  const seen = new Set<number>()
  const slugs = new Set<string>()
  const players: MarketPlayer[] = []
  const performancesByPlayer = new Map<number, ValidatedPerformance[]>()

  for (const { fixture, payload } of fixtureLineups) {
    const lineups = payload ? relationRows(payload, 'lineups') : []
    const matchDate = fixtureDate(fixture)
    if (!matchDate) continue
    for (const lineup of lineups) {
      const playerId = Number(lineup.player_id)
      const minutes = numericDetail(lineup, 'MINUTES_PLAYED')
      const rating = numericDetail(lineup, 'RATING')
      if (!Number.isSafeInteger(playerId) || !Number.isInteger(minutes) || minutes! <= 0 || minutes! > 130 || rating === null || rating < 0 || rating > 10) continue
      const providerFixtureId = String(fixture.id)
      const event: ValidatedPerformance = {
        providerAppearanceId: String(lineup.id ?? `${providerFixtureId}-${playerId}`), providerFixtureId, providerPlayerId: String(playerId),
        minutesPlayed: minutes!, rating, appeared: true, verificationStatus: 'verified', sourceName: 'Sportmonks Football API',
        sourceReference: `sportmonks-fixture-${providerFixtureId}`, retrievedAt: now,
        idempotencyKey: `Sportmonks Football API:${providerFixtureId}:${playerId}`, eligibleForValuation: true,
        matchDate, gameweek: Number.isInteger(Number(fixture.round_id)) ? Number(fixture.round_id) : null,
      }
      const history = performancesByPlayer.get(playerId) ?? []
      history.push(event)
      performancesByPlayer.set(playerId, history)
    }
  }

  for (const row of squads) {
    const player = relation(row, 'player')
    const team = relation(row, 'team')
    const id = Number(row.player_id ?? player?.id)
    const position = mapPosition(row)
    const name = textValue(player?.display_name ?? player?.common_name ?? player?.name)
    const clubName = textValue(team?.name)
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id) || !position || !name || !clubName) continue
    seen.add(id)
    const age = playerAge(player ?? {})
    const openingValue = openingGameValue(position, age)
    const performances = (performancesByPlayer.get(id) ?? []).sort((a, b) => Date.parse(b.matchDate) - Date.parse(a.matchDate))
    const currentUpdate = calculatePerformanceValueUpdate({ position, currentValue: openingValue, rollingWeekMovement: 0, performances })
    const previousUpdate = calculatePerformanceValueUpdate({ position, currentValue: openingValue, rollingWeekMovement: 0, performances: performances.slice(1) })
    const value = currentUpdate?.newValue ?? openingValue
    const previousValue = previousUpdate?.newValue ?? openingValue
    const baseSlug = toMarketSlug(name)
    const slug = slugs.has(baseSlug) ? `${baseSlug}-${id}` : baseSlug
    slugs.add(slug)
    players.push({
      id, slug, display_name: name, short_name: textValue(player?.short_name ?? player?.common_name), club_name: clubName,
      position, age, nationality: textValue(player?.nationality_name ?? player?.nationality), active: true,
      current_value: value, previous_value: previousValue, opening_season_value: openingValue,
      value_updated_at: now, data_updated_at: now,
      data_source_label: 'Sportmonks verified squad data · FootballIQ opening price',
      source_reference: `sportmonks-player-${id}`, provenance_status: 'verified', owner_verified: true,
      is_trade_locked: false, trade_lock_reason: null, trade_lock_started_at: null, trade_lock_ends_at: null,
      value_trend: value > previousValue ? 'rising' : value < previousValue ? 'falling' : 'flat',
      recent_form_indicator: currentUpdate ? currentUpdate.rollingRating >= 7.2 ? 'hot' : currentUpdate.rollingRating < 6.5 ? 'cool' : 'steady' : 'steady',
      role_security_indicator: performances[0]?.minutesPlayed && performances[0].minutesPlayed >= 75 ? 'secure' : 'rotation', availability_status: 'available',
      decision_support_note: currentUpdate
        ? `Verified ${currentUpdate.appearancesUsed}-appearance rolling rating: ${currentUpdate.rollingRating.toFixed(2)}. Latest movement follows FootballIQ v2 controls.`
        : 'Opening game price. This value remains frozen until verified ratings and minutes are available.',
      matchweek_performance_history: performances.slice(0, 5).reverse().map((event, index) => ({ week: event.gameweek ?? index + 1, rating: event.rating!, minutes: event.minutesPlayed })),
      created_at: now, updated_at: now,
    })
  }

  players.sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name))
  return {
    provider: 'Sportmonks Football API', competition: 'Premier League', seasonId,
    seasonName: textValue(season?.name), generatedAt: now, playerCount: players.length,
    marketPhase: performancesByPlayer.size > 0 ? 'verified_movement' : 'opening',
    completedFixturesApplied: completedFixtures.length, ratedPlayerCount: performancesByPlayer.size,
    latestCompletedAt: completedFixtures[0] ? fixtureDate(completedFixtures[0]) : null,
    players,
  }
}
