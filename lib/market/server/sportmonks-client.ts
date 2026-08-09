import { toMarketSlug } from '@/lib/market/provider'
import type { ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { calculatePerformanceValueUpdate } from '@/lib/market/real-valuation'
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

  async function get(path: string, options: { fresh?: boolean } = {}) {
    let lastStatus = 0
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${BASE_URL}${path}`, {
          headers: { Authorization: token },
          ...(options.fresh ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
          signal: AbortSignal.timeout(20_000),
        })
        lastStatus = response.status
        if (response.ok) {
          const payload = record(await response.json())
          if (!payload || !('data' in payload)) throw new Error('Sportmonks returned an invalid response.')
          return payload.data
        }
        if (response.status !== 429 && response.status < 500) break
        const retryAfter = Number(response.headers.get('retry-after'))
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5_000) : 500 * (attempt + 1)))
      } catch (error) {
        if (attempt === 2) throw error
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
    throw new Error(`Sportmonks request failed with HTTP ${lastStatus || 'unknown'}.`)
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
  const league = record(await client.get(`/leagues/${leagueConfig.leagueId}?include=currentSeason`))
  const season = league ? relation(league, 'currentseason', 'currentSeason') : null
  const seasonId = String(season?.id ?? '')
  if (!seasonId) throw new Error(`${leagueConfig.competition} current-season access is unavailable.`)

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
    const baseSlug = `${toMarketSlug(name)}${leagueConfig.competitionKey === 'premier-league' ? '' : `-${leagueConfig.competitionKey}`}`
    const slug = slugs.has(baseSlug) ? `${baseSlug}-${id}` : baseSlug
    slugs.add(slug)
    players.push({
      id, slug, display_name: name, short_name: textValue(player?.short_name ?? player?.common_name), club_name: clubName,
      competition_key: leagueConfig.competitionKey, competition_name: leagueConfig.competition,
      position, age, nationality: textValue(player?.nationality_name ?? player?.nationality), active: true,
      current_value: value, previous_value: previousValue, opening_season_value: openingValue,
      value_updated_at: now, data_updated_at: now,
      data_source_label: 'Sportmonks-sourced squad data · FootballIQ opening game price',
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
    provider: 'Sportmonks Football API', competition: leagueConfig.competition,
    competitionKey: leagueConfig.competitionKey, leagueId: leagueConfig.leagueId, seasonId,
    seasonName: textValue(season?.name), generatedAt: now, playerCount: players.length,
    marketPhase: performancesByPlayer.size > 0 ? 'verified_movement' : 'opening',
    completedFixturesApplied: completedFixtures.length, ratedPlayerCount: performancesByPlayer.size,
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
  }
}

export function isCatalogueReady(catalogue: SportmonksMarketCatalogue) {
  const coverage = catalogueCoverage(catalogue)
  return coverage.clubCount >= 16 && coverage.playerCount >= 300
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
  const competitions = [premierLeague, laLiga, ...optionalCatalogues]
  const unavailableCompetitions = optionalResults.flatMap((result) => {
    if (result.catalogue && isCatalogueReady(result.catalogue)) return []
    const coverage = result.catalogue ? catalogueCoverage(result.catalogue) : null
    return [{
      competition: result.catalogue?.competition ?? 'Provider league',
      reason: result.error ?? 'Current provider squad coverage is incomplete',
      playerCount: coverage?.playerCount ?? 0,
      clubCount: coverage?.clubCount ?? 0,
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
  processedFixtureIds: ReadonlySet<string> = new Set(),
): Promise<SportmonksCompletedGameweek[]> {
  const client = createSportmonksClient(apiToken)
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
  const selected = finished.filter((fixture) => !processedFixtureIds.has(String(fixture.id)))
  if (selected.length === 0) return []
  const updatesByWeek = new Map<string, SportmonksGameweekUpdate[]>()

  for (let offset = 0; offset < selected.length; offset += 5) {
    const chunk = selected.slice(offset, offset + 5)
    const settled = await Promise.allSettled(chunk.map(async (fixture) => ({
      fixture,
      payload: record(await client.get(`/fixtures/${encodeURIComponent(String(fixture.id))}?include=lineups.details.type;state`, { fresh: true })),
    })))
    const payloads = settled.flatMap((result) => {
      if (result.status === 'fulfilled') return [result.value]
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
  if (selected.length > 0 && updatesByWeek.size === 0) throw new Error('Completed fixtures could not be converted into verified player updates; valuation was aborted safely.')
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
}

export async function fetchSportmonksCompletedGameweek(apiToken = process.env.SPORTMONKS_API_TOKEN): Promise<SportmonksCompletedGameweek> {
  const batches = await fetchSportmonksCompletedGameweeks(apiToken)
  return batches.at(-1)!
}
