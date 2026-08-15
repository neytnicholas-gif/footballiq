import { toMarketSlug } from '@/lib/market/provider'
import { footballLeagues, predictionLeagueKey } from '@/lib/football-leagues'
import type { ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { calculateOpeningGameplayValue, calculatePerformanceValueUpdate } from '@/lib/market/real-valuation'
import type { MarketPlayer, MarketPosition } from '@/lib/market/types'

const BASE_URL = 'https://api.sportmonks.com/v3/football'
const PREMIER_LEAGUE_ID = 8
const LA_LIGA_ID = 564
const BUNDESLIGA_ID = 82
const SERIE_A_ID = 384
const LIGUE_1_ID = 301
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
  if (typeof value !== 'string' || !value.trim()) return null
  const trimmed = value.trim()
  if (!/[ÃÂâ]/.test(trimmed)) return trimmed
  const repaired = Buffer.from(trimmed, 'latin1').toString('utf8')
  return repaired.includes('\uFFFD') ? trimmed : repaired
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

type PlayerSeasonQuality = {
  appearances: number
  starts: number
  minutes: number
  averageRating: number | null
  goals: number
  assists: number
  cleanSheets: number
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value))

function statisticValue(detail: JsonRecord) {
  const value = record(detail.value) ?? record(relation(detail, 'data')?.value)
  for (const key of ['average', 'total', 'value', 'count']) {
    const parsed = Number(value?.[key])
    if (Number.isFinite(parsed)) return parsed
  }
  const direct = Number(detail.value)
  return Number.isFinite(direct) ? direct : null
}

function qualityOpeningGameValue(position: MarketPosition, age: number | null, quality?: PlayerSeasonQuality) {
  if (!quality || (quality.appearances === 0 && quality.minutes === 0 && quality.averageRating === null)) {
    return calculateOpeningGameplayValue({
      position, establishedPerformanceScore: 15, recentMinutesScore: 0,
      squadRoleScore: 10, availabilityScore: 80,
      agePotentialScore: age !== null && age <= 23 ? 65 : 35,
    })
  }
  const sampleConfidence = clampScore((quality.minutes / 900) * 100) / 100
  const stabilizedRating = quality.averageRating === null
    ? null
    : 6.6 + ((quality.averageRating - 6.6) * sampleConfidence)
  const ratingScore = stabilizedRating === null ? 45 : clampScore(((stabilizedRating - 5.8) / 2.2) * 100)
  const per90 = quality.minutes > 0 ? 90 / quality.minutes : 0
  const outputRate = position === 'FWD'
    ? (quality.goals * 1.2 + quality.assists * 0.75) * per90
    : position === 'MID'
      ? (quality.goals * 0.65 + quality.assists) * per90
      : position === 'DEF'
        ? (quality.cleanSheets * 0.8 + quality.goals * 0.35 + quality.assists * 0.4) * per90
        : quality.cleanSheets * per90
  const outputTarget: Record<MarketPosition, number> = { GK: 0.38, DEF: 0.42, MID: 0.52, FWD: 0.8 }
  const outputScore = clampScore(((outputRate * sampleConfidence) / outputTarget[position]) * 100)
  const establishedPerformanceScore = ratingScore * 0.82 + outputScore * 0.18
  const recentMinutesScore = clampScore((quality.minutes / 2_700) * 100)
  const squadRoleScore = quality.appearances > 0
    ? clampScore((quality.starts / quality.appearances) * 75 + Math.min(25, quality.appearances))
    : 10
  const agePotentialScore = age === null ? 45 : age <= 21 ? 90 : age <= 24 ? 80 : age <= 28 ? 65 : age <= 31 ? 45 : age <= 34 ? 25 : 10
  return calculateOpeningGameplayValue({
    position, establishedPerformanceScore, recentMinutesScore,
    squadRoleScore, availabilityScore: 100, agePotentialScore,
  })
}

function isEstablishedQuality(quality: PlayerSeasonQuality | undefined) {
  return Boolean(quality && quality.minutes >= 450 && quality.appearances >= 5)
}

function qualityFromStatisticsRow(row: JsonRecord): PlayerSeasonQuality {
  const values = new Map<string, number>()
  for (const detail of relationRows(row, 'details')) {
    const name = String(relation(detail, 'type')?.developer_name ?? detail.developer_name ?? '').toUpperCase()
    const value = statisticValue(detail)
    if (name && value !== null) values.set(name, value)
  }
  return {
    appearances: values.get('APPEARANCES') ?? 0,
    starts: values.get('STARTED') ?? values.get('LINEUPS') ?? values.get('STARTS') ?? 0,
    minutes: values.get('MINUTES_PLAYED') ?? values.get('MINUTES') ?? 0,
    averageRating: values.get('RATING') ?? values.get('AVERAGE_RATING') ?? null,
    goals: values.get('GOALS') ?? 0,
    assists: values.get('ASSISTS') ?? 0,
    cleanSheets: values.get('CLEAN_SHEET') ?? values.get('CLEAN_SHEETS') ?? 0,
  }
}

function mergeSeasonQuality(current: PlayerSeasonQuality | undefined, next: PlayerSeasonQuality) {
  if (!current) return next
  const currentWeight = current.minutes || current.appearances || 0
  const nextWeight = next.minutes || next.appearances || 0
  const ratingWeight = currentWeight + nextWeight
  const averageRating = current.averageRating === null
    ? next.averageRating
    : next.averageRating === null
      ? current.averageRating
      : ratingWeight > 0
        ? ((current.averageRating * currentWeight) + (next.averageRating * nextWeight)) / ratingWeight
        : (current.averageRating + next.averageRating) / 2
  return {
    appearances: current.appearances + next.appearances,
    starts: current.starts + next.starts,
    minutes: current.minutes + next.minutes,
    averageRating,
    goals: current.goals + next.goals,
    assists: current.assists + next.assists,
    cleanSheets: current.cleanSheets + next.cleanSheets,
  }
}

function seasonQualityByPlayer(rows: JsonRecord[]) {
  const result = new Map<number, PlayerSeasonQuality>()
  for (const row of rows) {
    const playerId = Number(row.player_id)
    if (!Number.isSafeInteger(playerId)) continue
    result.set(playerId, mergeSeasonQuality(result.get(playerId), qualityFromStatisticsRow(row)))
  }
  return result
}

function latestEstablishedPlayerQuality(player: JsonRecord) {
  const candidates = relationRows(player, 'statistics')
    .map((row) => ({
      row,
      quality: qualityFromStatisticsRow(row),
      seasonDate: Date.parse(String(relation(row, 'season')?.ending_at ?? relation(row, 'season')?.starting_at ?? '')),
      seasonId: Number(row.season_id ?? relation(row, 'season')?.id ?? 0),
    }))
    .filter((candidate) => isEstablishedQuality(candidate.quality))
    .sort((a, b) => {
      const aDate = Number.isFinite(a.seasonDate) ? a.seasonDate : 0
      const bDate = Number.isFinite(b.seasonDate) ? b.seasonDate : 0
      return bDate - aDate || b.seasonId - a.seasonId
    })
  return candidates[0]?.quality
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await worker(item)
    }
  }))
}

export type SportmonksMarketCatalogue = {
  provider: 'Sportmonks Football API'
  competition: 'Premier League' | 'La Liga' | 'Bundesliga' | 'Serie A' | 'Ligue 1'
  competitionKey: 'premier-league' | 'la-liga' | 'bundesliga' | 'serie-a' | 'ligue-1'
  leagueId: number
  seasonId: string
  seasonName: string | null
  generatedAt: string
  playerCount: number
  marketPhase: 'opening' | 'verified_movement'
  completedFixturesApplied: number
  ratedPlayerCount: number
  qualityPricedPlayerCount: number
  fallbackPricedPlayerCount: number
  qualityCoveragePercent: number
  latestCompletedAt: string | null
  players: MarketPlayer[]
}

export type SportmonksGameweekUpdate = {
  provider_player_id: string
  provider_fixture_id: string
  fixture_date: string
  started: boolean
  minutes_played: number
  rating: number
  retrieved_at: string
}

export type SportmonksCompletedGameweek = {
  gameweekKey: string
  weekNumber: number
  label: string
  opensAt: string
  closesAt: string
  updates: SportmonksGameweekUpdate[]
}

export type SportmonksPredictionFixture = {
  fixture_id: string
  league_key: string
  league_name: string
  gameweek_key: string
  home_team: string
  away_team: string
  kickoff_at: string
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
  home_score: number | null
  away_score: number | null
  is_derby: boolean
  source_updated_at: string
}

export type SportmonksPredictionCompetition = {
  league_key: string
  provider_league_id: number
  league_name: string
  country_name: string
  country_code: string
  is_active: true
  last_seen_at: string
}

export type SportmonksPredictionSync = {
  fixtures: SportmonksPredictionFixture[]
  competitions: SportmonksPredictionCompetition[]
}

export type SportmonksRequestTelemetry = {
  requestsMade: number
  rateLimits: Array<{
    requestedEntity: string
    lowestRemaining: number
    resetsInSeconds: number
  }>
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

class SportmonksRateLimitError extends Error {}

function assertLicensedRuntime() {
  const vercelEnvironment = process.env.VERCEL_ENV
  if (vercelEnvironment && vercelEnvironment !== 'production') {
    throw new Error('Sportmonks API calls are disabled outside the licensed Production environment.')
  }
  if (vercelEnvironment === 'production') {
    const productionHostname = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().toLowerCase()
    if (productionHostname !== 'earlyshout.com') {
      throw new Error('Sportmonks API calls are disabled until earlyshout.com is the Vercel Production domain.')
    }
  }
}

export function createSportmonksClient(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  if (typeof window !== 'undefined') throw new Error('Sportmonks access is server-only.')
  assertLicensedRuntime()
  if (!apiToken?.trim()) throw new Error('SPORTMONKS_API_TOKEN is not configured.')
  const token: string = apiToken.trim()
  let requestsMade = 0
  const rateLimits = new Map<string, SportmonksRequestTelemetry['rateLimits'][number]>()
  const warnedEntities = new Set<string>()

  function observeRateLimit(payload: JsonRecord | null) {
    const rateLimit = payload ? record(payload.rate_limit) : null
    const requestedEntity = textValue(rateLimit?.requested_entity)
    const remaining = Number(rateLimit?.remaining)
    const resetsInSeconds = Number(rateLimit?.resets_in_seconds)
    if (!requestedEntity || !Number.isInteger(remaining) || remaining < 0 || !Number.isFinite(resetsInSeconds) || resetsInSeconds < 0) return
    const previous = rateLimits.get(requestedEntity)
    rateLimits.set(requestedEntity, {
      requestedEntity,
      lowestRemaining: Math.min(previous?.lowestRemaining ?? remaining, remaining),
      resetsInSeconds: Math.ceil(resetsInSeconds),
    })
    if (remaining <= 200 && !warnedEntities.has(requestedEntity)) {
      warnedEntities.add(requestedEntity)
      console.warn(JSON.stringify({
        event: 'sportmonks.rate_limit.low', requestedEntity, remaining,
        resetsInSeconds: Math.ceil(resetsInSeconds),
      }))
    }
  }

  function getTelemetry(): SportmonksRequestTelemetry {
    return {
      requestsMade,
      rateLimits: [...rateLimits.values()].sort((a, b) => a.requestedEntity.localeCompare(b.requestedEntity)),
    }
  }

  async function get(path: string, options: { fresh?: boolean } = {}) {
    let lastStatus = 0
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        requestsMade += 1
        const response = await fetch(`${BASE_URL}${path}`, {
          headers: { Authorization: token },
          ...(options.fresh ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
          signal: AbortSignal.timeout(20_000),
        })
        lastStatus = response.status
        if (response.ok) {
          const payload = record(await response.json())
          if (!payload || !('data' in payload)) throw new Error('Sportmonks returned an invalid response.')
          observeRateLimit(payload)
          return payload.data
        }
        const errorPayload = record(await response.json().catch(() => null))
        observeRateLimit(errorPayload)
        if (response.status === 429) {
          const rateLimit = errorPayload ? record(errorPayload.rate_limit) : null
          const entity = textValue(rateLimit?.requested_entity) ?? 'requested entity'
          const reset = Number(rateLimit?.resets_in_seconds)
          throw new SportmonksRateLimitError(
            `Sportmonks ${entity} rate limit reached; retry after ${Number.isFinite(reset) ? Math.max(1, Math.ceil(reset)) : 3_600} seconds.`,
          )
        }
        if (response.status < 500) break
        const retryAfter = Number(response.headers.get('retry-after'))
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5_000) : 500 * (attempt + 1)))
      } catch (error) {
        if (error instanceof SportmonksRateLimitError) throw error
        if (attempt === 2) throw error
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    throw new Error(`Sportmonks request failed with HTTP ${lastStatus || 'unknown'}.`)
  }

  async function getAllPages(path: string, options: { fresh?: boolean; maxPages?: number } = {}) {
    const output: JsonRecord[] = []
    const maxPages = Math.max(1, Math.min(options.maxPages ?? 30, 100))
    for (let page = 1; page <= maxPages; page += 1) {
      const separator = path.includes('?') ? '&' : '?'
      const pageRows = records(await get(`${path}${separator}per_page=50&page=${page}`, options))
      if (pageRows.length === 0) break
      output.push(...pageRows)
      if (pageRows.length < 50) break
    }
    return output
  }

  return { get, getAllPages, getTelemetry }
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
  const squads = (await Promise.all(teamIds.map(async (teamId) => {
    const team = teams.find((candidate) => String(candidate.id) === String(teamId))
    const seasonSquad = records(await client.get(
      `/squads/seasons/${encodeURIComponent(seasonId)}/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
    ))
    if (seasonSquad.length) return seasonSquad
    const currentSquad = records(await client.get(
      `/squads/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
    ))
    if (currentSquad.length) return currentSquad
    const extendedSquad = records(await client.get(
      `/squads/teams/${encodeURIComponent(String(teamId))}/extended?include=position`,
    ))
    if (extendedSquad.length) {
      return extendedSquad.map((player) => ({
        player_id: player.id,
        player,
        team,
        position: relation(player, 'position'),
      }))
    }
    const teamWithPlayers = record(await client.get(
      `/teams/${encodeURIComponent(String(teamId))}?include=players.player;players.position`,
    ))
    return relationRows(teamWithPlayers ?? {}, 'players').map((membership) => ({
      ...membership,
      team,
    } as JsonRecord))
  }))).flat()
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

type SupportedMarketLeague = Pick<SportmonksMarketCatalogue, 'competition' | 'competitionKey' | 'leagueId'>

async function buildSportmonksLeagueCatalogue(
  leagueConfig: SupportedMarketLeague,
  apiToken = process.env.SPORTMONKS_API_TOKEN,
): Promise<SportmonksMarketCatalogue> {
  const client = createSportmonksClient(apiToken)
  const league = record(await client.get(`/leagues/${leagueConfig.leagueId}?include=currentSeason;seasons`))
  const season = league ? relation(league, 'currentseason', 'currentSeason') : null
  const seasonId = String(season?.id ?? '')
  if (!seasonId) throw new Error(`${leagueConfig.competition} current-season access is unavailable.`)
  const previousSeason = relationRows(league ?? {}, 'seasons')
    .filter((candidate) => String(candidate.id ?? '') !== seasonId)
    .sort((a, b) => {
      const aDate = Date.parse(String(a.ending_at ?? a.starting_at ?? ''))
      const bDate = Date.parse(String(b.ending_at ?? b.starting_at ?? ''))
      if (Number.isFinite(aDate) || Number.isFinite(bDate)) return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0)
      return Number(b.id ?? 0) - Number(a.id ?? 0)
    })[0]
  const previousSeasonId = previousSeason?.id ? String(previousSeason.id) : null

  const teams = records(await client.get(`/teams/seasons/${encodeURIComponent(seasonId)}`))
  const teamIds = teams.map((team) => team.id).filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const squads = (await Promise.all(teamIds.map(async (teamId) => {
    const team = teams.find((candidate) => String(candidate.id) === String(teamId))
    const seasonSquad = records(await client.get(
      `/squads/seasons/${encodeURIComponent(seasonId)}/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
    ))
    if (seasonSquad.length) return seasonSquad
    const currentSquad = records(await client.get(
      `/squads/teams/${encodeURIComponent(String(teamId))}?include=player;team;position`,
    ))
    if (currentSquad.length) return currentSquad
    const extendedSquad = records(await client.get(
      `/squads/teams/${encodeURIComponent(String(teamId))}/extended?include=position`,
    ))
    if (extendedSquad.length) {
      return extendedSquad.map((player) => ({
        player_id: player.id,
        player,
        team,
        position: relation(player, 'position'),
      }))
    }
    const teamWithPlayers = record(await client.get(
      `/teams/${encodeURIComponent(String(teamId))}?include=players.player;players.position`,
    ))
    return relationRows(teamWithPlayers ?? {}, 'players').map((membership) => ({
      ...membership,
      team,
    } as JsonRecord))
  }))).flat()
  const seasonSchedule = record(await client.get(`/seasons/${encodeURIComponent(seasonId)}?include=fixtures.state`))
  const [currentQualityResult, previousQualityResult] = await Promise.allSettled([
    client.getAllPages(`/statistics/seasons/players/${encodeURIComponent(seasonId)}?include=details.type`),
    previousSeasonId
      ? client.getAllPages(`/statistics/seasons/players/${encodeURIComponent(previousSeasonId)}?include=details.type`)
      : Promise.resolve([]),
  ])
  const currentQualityRows = currentQualityResult.status === 'fulfilled' ? currentQualityResult.value : []
  const previousQualityRows = previousQualityResult.status === 'fulfilled' ? previousQualityResult.value : []
  if (currentQualityResult.status === 'rejected') {
    console.error(JSON.stringify({ event: 'sportmonks.season_quality.failed', competition: leagueConfig.competition, seasonId }))
  }
  if (previousQualityResult.status === 'rejected') {
    console.error(JSON.stringify({ event: 'sportmonks.season_quality.failed', competition: leagueConfig.competition, seasonId: previousSeasonId }))
  }
  const currentQualityByPlayer = seasonQualityByPlayer(currentQualityRows)
  const previousQualityByPlayer = seasonQualityByPlayer(previousQualityRows)
  const squadPlayerIds = [...new Set(squads.map((row) => Number(row.player_id ?? relation(row, 'player')?.id)).filter(Number.isSafeInteger))]
  const missingEstablishedPlayerIds = previousSeasonId
    ? squadPlayerIds.filter((id) => !isEstablishedQuality(currentQualityByPlayer.get(id)) && !isEstablishedQuality(previousQualityByPlayer.get(id)))
    : []
  const historicalQualityByPlayer = new Map<number, PlayerSeasonQuality>()
  await mapWithConcurrency(missingEstablishedPlayerIds, 4, async (playerId) => {
    try {
      const player = record(await client.get(
        `/players/${encodeURIComponent(String(playerId))}?include=statistics.details.type;statistics.season`,
      ))
      if (!player) return
      const quality = latestEstablishedPlayerQuality(player)
      if (quality) historicalQualityByPlayer.set(playerId, quality)
    } catch {
      // Coverage below decides whether this price book is safe to publish.
    }
  })
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
  let qualityPricedPlayerCount = 0

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
    const currentQuality = currentQualityByPlayer.get(id)
    const establishedQuality = isEstablishedQuality(currentQuality)
      ? currentQuality
      : isEstablishedQuality(previousQualityByPlayer.get(id))
        ? previousQualityByPlayer.get(id)
        : historicalQualityByPlayer.get(id)
    if (establishedQuality) qualityPricedPlayerCount += 1
    const openingValue = qualityOpeningGameValue(position, age, establishedQuality)
    const performances = (performancesByPlayer.get(id) ?? []).sort((a, b) => Date.parse(b.matchDate) - Date.parse(a.matchDate))
    const currentUpdate = calculatePerformanceValueUpdate({ position, currentValue: openingValue, rollingWeekMovement: 0, performances })
    const previousUpdate = calculatePerformanceValueUpdate({ position, currentValue: openingValue, rollingWeekMovement: 0, performances: performances.slice(1) })
    const value = currentUpdate?.newValue ?? openingValue
    const previousValue = previousUpdate?.newValue ?? openingValue
    const baseSlug = `${toMarketSlug(name)}${leagueConfig.competitionKey === 'premier-league' ? '' : `-${leagueConfig.competitionKey}`}`
    const slug = slugs.has(baseSlug) ? `${baseSlug}-${id}` : baseSlug
    slugs.add(slug)
    players.push({
      id, slug, display_name: name, short_name: textValue(player?.short_name ?? player?.common_name), club_name: clubName,
      competition_key: leagueConfig.competitionKey, competition_name: leagueConfig.competition,
      position, age, nationality: textValue(player?.nationality_name ?? player?.nationality), active: true,
      current_value: value, previous_value: previousValue, opening_season_value: openingValue,
      value_updated_at: now, data_updated_at: now,
      data_source_label: 'Sportmonks-sourced squad data · Early Shout opening game price',
      source_reference: `sportmonks-player-${id}`, provenance_status: 'verified', owner_verified: true,
      is_trade_locked: false, trade_lock_reason: null, trade_lock_started_at: null, trade_lock_ends_at: null,
      value_trend: value > previousValue ? 'rising' : value < previousValue ? 'falling' : 'flat',
      recent_form_indicator: currentUpdate ? currentUpdate.rollingRating >= 7.2 ? 'hot' : currentUpdate.rollingRating < 6.5 ? 'cool' : 'steady' : 'steady',
      role_security_indicator: performances[0]?.minutesPlayed && performances[0].minutesPlayed >= 75 ? 'secure' : 'rotation', availability_status: 'available',
      decision_support_note: currentUpdate
        ? `Verified ${currentUpdate.appearancesUsed}-appearance rolling rating: ${currentUpdate.rollingRating.toFixed(2)}. Latest movement follows Early Shout v2 controls.`
        : 'Opening game price. This value remains frozen until verified ratings and minutes are available.',
      matchweek_performance_history: performances.slice(0, 5).reverse().map((event, index) => ({ week: event.gameweek ?? index + 1, rating: event.rating!, minutes: event.minutesPlayed })),
      created_at: now, updated_at: now,
    })
  }

  players.sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name))
  const fallbackPricedPlayerCount = Math.max(0, players.length - qualityPricedPlayerCount)
  const qualityCoveragePercent = players.length
    ? Math.round((qualityPricedPlayerCount / players.length) * 10_000) / 100
    : 0
  return {
    provider: 'Sportmonks Football API', competition: leagueConfig.competition,
    competitionKey: leagueConfig.competitionKey, leagueId: leagueConfig.leagueId, seasonId,
    seasonName: textValue(season?.name), generatedAt: now, playerCount: players.length,
    marketPhase: performancesByPlayer.size > 0 ? 'verified_movement' : 'opening',
    completedFixturesApplied: completedFixtures.length, ratedPlayerCount: performancesByPlayer.size,
    qualityPricedPlayerCount, fallbackPricedPlayerCount, qualityCoveragePercent,
    latestCompletedAt: completedFixtures[0] ? fixtureDate(completedFixtures[0]) : null,
    players,
  }
}

export function buildSportmonksPremierLeagueCatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  return buildSportmonksLeagueCatalogue({ leagueId: PREMIER_LEAGUE_ID, competition: 'Premier League', competitionKey: 'premier-league' }, apiToken)
}

export function buildSportmonksLaLigaCatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  return buildSportmonksLeagueCatalogue({ leagueId: LA_LIGA_ID, competition: 'La Liga', competitionKey: 'la-liga' }, apiToken)
}

export function buildSportmonksBundesligaCatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  return buildSportmonksLeagueCatalogue({ leagueId: BUNDESLIGA_ID, competition: 'Bundesliga', competitionKey: 'bundesliga' }, apiToken)
}

export function buildSportmonksSerieACatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  return buildSportmonksLeagueCatalogue({ leagueId: SERIE_A_ID, competition: 'Serie A', competitionKey: 'serie-a' }, apiToken)
}

export function buildSportmonksLigue1Catalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  return buildSportmonksLeagueCatalogue({ leagueId: LIGUE_1_ID, competition: 'Ligue 1', competitionKey: 'ligue-1' }, apiToken)
}

export function catalogueCoverage(catalogue: SportmonksMarketCatalogue) {
  return {
    playerCount: catalogue.players.length,
    clubCount: new Set(catalogue.players.map((player) => player.club_name)).size,
    qualityCoveragePercent: catalogue.qualityCoveragePercent,
  }
}

export function isCatalogueReady(catalogue: SportmonksMarketCatalogue) {
  const coverage = catalogueCoverage(catalogue)
  return coverage.clubCount >= 16 && coverage.playerCount >= 300 && coverage.qualityCoveragePercent >= 65
}

export async function buildSportmonksCombinedCatalogue(apiToken = process.env.SPORTMONKS_API_TOKEN) {
  const [premierLeague, laLiga, ...optionalResults] = await Promise.all([
    buildSportmonksPremierLeagueCatalogue(apiToken),
    buildSportmonksLaLigaCatalogue(apiToken),
    ...[
      buildSportmonksLigue1Catalogue(apiToken),
    ].map((promise) => promise.then(
        (catalogue) => ({ catalogue, error: null }),
        (error: unknown) => ({ catalogue: null, error: error instanceof Error ? error.message : 'Provider request failed' }),
      )),
  ])
  const optionalCatalogues = optionalResults
    .map((result) => result.catalogue)
    .filter((catalogue): catalogue is SportmonksMarketCatalogue => Boolean(catalogue && isCatalogueReady(catalogue)))
  const unsafeRequiredCatalogue = [premierLeague, laLiga].find((catalogue) => !isCatalogueReady(catalogue))
  if (unsafeRequiredCatalogue) {
    const coverage = catalogueCoverage(unsafeRequiredCatalogue)
    throw new Error(
      `${unsafeRequiredCatalogue.competition} price book is not ready: ${coverage.playerCount} players, ${coverage.clubCount} clubs, ${coverage.qualityCoveragePercent}% quality-priced.`,
    )
  }
  const competitions = [premierLeague, laLiga, ...optionalCatalogues]
  const unavailableCompetitions = optionalResults.flatMap((result) => {
    if (result.catalogue && isCatalogueReady(result.catalogue)) return []
    const coverage = result.catalogue ? catalogueCoverage(result.catalogue) : null
    return [{
      competition: result.catalogue?.competition ?? 'Provider league',
      reason: result.error ?? 'Current provider squad coverage is incomplete',
      playerCount: coverage?.playerCount ?? 0,
      clubCount: coverage?.clubCount ?? 0,
      qualityCoveragePercent: coverage?.qualityCoveragePercent ?? 0,
    }]
  })
  return {
    provider: 'Sportmonks Football API' as const,
    competition: competitions.map((catalogue) => catalogue.competition).join(' + '),
    generatedAt: new Date().toISOString(),
    playerCount: competitions.reduce((total, catalogue) => total + catalogue.playerCount, 0),
    competitions,
    unavailableCompetitions,
    players: competitions.flatMap((catalogue) => catalogue.players)
      .sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name)),
  }
}

function isoWeek(date: Date) {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  return { year: thursday.getUTCFullYear(), week: Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7) }
}

function mondayFor(date: Date) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1))
  return monday
}

export async function fetchSportmonksCompletedGameweeks(
  apiToken = process.env.SPORTMONKS_API_TOKEN,
  processedPerformanceKeys: ReadonlySet<string> = new Set(),
  observeTelemetry?: (telemetry: SportmonksRequestTelemetry) => void,
): Promise<SportmonksCompletedGameweek[]> {
  const client = createSportmonksClient(apiToken)
  try {
  const leagueConfigs = [
    { id: PREMIER_LEAGUE_ID, name: 'Premier League' },
    { id: LA_LIGA_ID, name: 'La Liga' },
    { id: LIGUE_1_ID, name: 'Ligue 1' },
  ] as const
  const retrievedAt = new Date().toISOString()
  const fixtures: JsonRecord[] = []

  for (const leagueConfig of leagueConfigs) {
    const league = record(await client.get(`/leagues/${leagueConfig.id}?include=currentSeason`, { fresh: true }))
    const season = league ? relation(league, 'currentseason', 'currentSeason') : null
    if (!season?.id) continue
    const schedule = record(await client.get(`/seasons/${encodeURIComponent(String(season.id))}?include=fixtures.state`, { fresh: true }))
    fixtures.push(...relationRows(schedule ?? {}, 'fixtures').filter(isFinishedFixture))
  }

  const cutoff = Date.now() - 28 * 86_400_000
  const finished = fixtures.filter((fixture) => {
    const date = fixtureDate(fixture)
    return date !== null && Date.parse(date) >= cutoff
  })
    .sort((a, b) => Date.parse(fixtureDate(b)!) - Date.parse(fixtureDate(a)!))
  if (finished.length === 0) return []
  const updatesByWeek = new Map<string, SportmonksGameweekUpdate[]>()
  let eligibleAppearanceCount = 0
  let failedFixtureCount = 0

  for (let offset = 0; offset < finished.length; offset += 5) {
    const chunk = finished.slice(offset, offset + 5)
    const settled = await Promise.allSettled(chunk.map(async (fixture) => ({
      fixture,
      payload: record(await client.get(`/fixtures/${encodeURIComponent(String(fixture.id))}?include=lineups.details.type;state`, { fresh: true })),
    })))
    const payloads = settled.flatMap((result) => {
      if (result.status === 'fulfilled') return [result.value]
      failedFixtureCount += 1
      console.error('[market-gameweek] fixture detail fetch failed', result.reason)
      return []
    })
    for (const { fixture, payload } of payloads) {
      const providerFixtureId = String(fixture.id)
      for (const lineup of payload ? relationRows(payload, 'lineups') : []) {
        const playerId = Number(lineup.player_id)
        const minutes = numericDetail(lineup, 'MINUTES_PLAYED')
        const rating = numericDetail(lineup, 'RATING')
        if (!Number.isSafeInteger(playerId) || !Number.isInteger(minutes) || minutes! <= 0 || minutes! > 130 || rating === null || rating < 0 || rating > 10) continue
        eligibleAppearanceCount += 1
        if (processedPerformanceKeys.has(`${providerFixtureId}:${playerId}`)) continue
        const fixtureAt = new Date(fixtureDate(fixture)!)
        const { year, week } = isoWeek(fixtureAt)
        const key = `${year}-${String(week).padStart(2, '0')}`
        const updates = updatesByWeek.get(key) ?? []
        updates.push({
          provider_player_id: String(playerId), provider_fixture_id: providerFixtureId,
          fixture_date: fixtureDate(fixture)!, started: Boolean(lineup.type_id === 11 || lineup.formation_position),
          minutes_played: minutes!, rating, retrieved_at: retrievedAt,
        })
        updatesByWeek.set(key, updates)
      }
    }
  }
  if (updatesByWeek.size === 0 && failedFixtureCount > 0) throw new Error('One or more completed fixtures could not be checked; valuation will retry safely.')
  if (updatesByWeek.size === 0 && eligibleAppearanceCount > 0) return []
  if (updatesByWeek.size === 0) throw new Error('Completed fixtures did not contain eligible Sportmonks ratings and minutes.')

  return [...updatesByWeek.entries()].map(([key, updates]) => {
    const firstDate = new Date(updates.reduce((earliest, update) => update.fixture_date < earliest ? update.fixture_date : earliest, updates[0]!.fixture_date))
    const opensAt = mondayFor(firstDate)
    const closesAt = new Date(opensAt)
    closesAt.setUTCDate(closesAt.getUTCDate() + 7)
    const weekNumber = Number(key.slice(-2))
    return {
      gameweekKey: `sportmonks-${key}`,
      weekNumber,
      label: `Results · ${key}`,
      opensAt: opensAt.toISOString(), closesAt: closesAt.toISOString(), updates,
    }
  }).sort((a, b) => a.opensAt.localeCompare(b.opensAt))
  } finally {
    observeTelemetry?.(client.getTelemetry())
  }
}

const DERBY_PAIRS = new Set([
  'arsenal|tottenham hotspur','everton|liverpool','manchester city|manchester united',
  'barcelona|real madrid','atletico madrid|real madrid','real betis|sevilla','athletic club|real sociedad',
  'marseille|paris saint germain','lyon|saint etienne','lens|lille','monaco|nice',
])

function normalizedTeamName(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
}

function isKnownDerby(home: string, away: string) {
  return DERBY_PAIRS.has([normalizedTeamName(home),normalizedTeamName(away)].sort().join('|'))
}

function predictionFixtureStatus(row: JsonRecord): SportmonksPredictionFixture['status'] {
  const state = relation(row,'state')
  const value = String(state?.developer_name ?? state?.short_name ?? '').toUpperCase().replace(/[\s-]+/g,'_')
  if (['FT','AET','AFTER_EXTRA_TIME','FINISHED'].includes(value)) return 'completed'
  if (['INPLAY','LIVE','HT','BREAK','EXTRA_TIME'].includes(value)) return 'live'
  if (['POSTPONED','DELAYED'].includes(value)) return 'postponed'
  if (['CANCELLED','ABANDONED'].includes(value)) return 'cancelled'
  return 'scheduled'
}

function currentFixtureScore(row: JsonRecord) {
  const scores = relationRows(row,'scores')
  const preferred = scores.filter((score)=>String(score.description ?? '').toUpperCase()==='CURRENT')
  const source = preferred.length ? preferred : scores
  const values:{home:number|null;away:number|null}={home:null,away:null}
  for(const score of source){
    const detail=record(score.score)
    const side=String(detail?.participant ?? '').toLowerCase()
    const goals=Number(detail?.goals)
    if((side==='home'||side==='away')&&Number.isInteger(goals)&&goals>=0)values[side]=goals
  }
  return values
}

export async function fetchSportmonksPredictionFixtures(
  apiToken = process.env.SPORTMONKS_API_TOKEN,
  observeTelemetry?: (telemetry: SportmonksRequestTelemetry) => void,
): Promise<SportmonksPredictionSync> {
  const client=createSportmonksClient(apiToken)
  try{
    // Sportmonks licenses leagues per subscription. Discover the token's real
    // coverage instead of presenting unavailable competitions or hard-coding a
    // paid tier. The curated order keeps the most recognisable rooms first.
    const providerLeagues=await client.getAllPages('/leagues?include=country',{fresh:true,maxPages:10})
    const matchedByKey=new Map<string,{providerId:number;name:string;country:string;countryCode:string}>()
    for(const row of providerLeagues){
      const providerId=Number(row.id)
      const providerName=textValue(row.name)
      const country=relation(row,'country')
      const countryName=textValue(country?.name) ?? ''
      if(!Number.isSafeInteger(providerId)||!providerName)continue
      const curated=predictionLeagueKey(providerName,countryName)
      if(!curated||matchedByKey.has(curated.key))continue
      matchedByKey.set(curated.key,{providerId,name:curated.name,country:curated.country,countryCode:curated.countryCode})
    }
    const selected=footballLeagues.flatMap((league)=>{
      const match=matchedByKey.get(league.key)
      return match ? [{league,...match}] : []
    }).slice(0,30)
    if(selected.length===0)throw new Error('No supported prediction leagues are available on this Sportmonks subscription.')

    const start=new Date(Date.now()-2*86_400_000).toISOString().slice(0,10)
    const end=new Date(Date.now()+16*86_400_000).toISOString().slice(0,10)
    const providerIds=selected.map((entry)=>entry.providerId)
    const rows=await client.getAllPages(`/fixtures/between/${start}/${end}?include=participants;state;scores&filters=fixtureLeagues:${providerIds.join(',')}`,{fresh:true,maxPages:30})
    const configs=new Map(selected.map((entry)=>[entry.providerId,{key:entry.league.key,name:entry.league.name}]))
    const now=new Date().toISOString()
    const fixtures=rows.flatMap((row)=>{
      const config=configs.get(Number(row.league_id));const kickoff=fixtureDate(row);const fixtureId=String(row.id ?? '')
      const participants=relationRows(row,'participants')
      const home=participants.find((team)=>String(record(team.meta)?.location ?? '').toLowerCase()==='home')
      const away=participants.find((team)=>String(record(team.meta)?.location ?? '').toLowerCase()==='away')
      const homeTeam=textValue(home?.name);const awayTeam=textValue(away?.name)
      if(!config||!kickoff||!fixtureId||!homeTeam||!awayTeam)return []
      const date=new Date(kickoff);const {year,week}=isoWeek(date);const score=currentFixtureScore(row);const status=predictionFixtureStatus(row)
      return [{fixture_id:fixtureId,league_key:config.key,league_name:config.name,gameweek_key:`${year}-${String(week).padStart(2,'0')}`,home_team:homeTeam,away_team:awayTeam,kickoff_at:kickoff,status,home_score:status==='completed'?score.home:null,away_score:status==='completed'?score.away:null,is_derby:isKnownDerby(homeTeam,awayTeam),source_updated_at:now}]
    })
    const competitions=selected.map(({league,providerId,country,countryCode})=>({
      league_key:league.key,provider_league_id:providerId,league_name:league.name,
      country_name:country,country_code:countryCode,is_active:true as const,last_seen_at:now,
    }))
    return {fixtures,competitions}
  }finally{observeTelemetry?.(client.getTelemetry())}
}

export async function fetchSportmonksCompletedGameweek(apiToken = process.env.SPORTMONKS_API_TOKEN): Promise<SportmonksCompletedGameweek> {
  const batches = await fetchSportmonksCompletedGameweeks(apiToken)
  return batches.at(-1)!
}
