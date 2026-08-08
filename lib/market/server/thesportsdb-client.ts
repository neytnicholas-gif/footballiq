const BASE_URL = 'https://www.thesportsdb.com/api/v2/json'

export type TheSportsDbTrialReport = {
  provider: 'TheSportsDB'
  mode: 'read_only'
  apiVersion: 'v2'
  authenticated: boolean
  arsenalPlayerCount: number
  premierLeagueTeamCount: number
  premierLeaguePlayerCount: number
  uniquePremierLeaguePlayerCount: number
  duplicatePremierLeaguePlayerCount: number
  samplePlayerId: string | null
  playerStatsRows: number
  statsPlayersSampled: number
  playersWithStats: number
  rosterFieldCoverage: Record<string, number>
  statisticsFieldCoverage: Record<string, number>
  observedRosterFields: string[]
  observedStatisticsFields: string[]
  recentLeagueEventCount: number
  eventResultRows: number
  eventResultFieldCoverage: Record<string, number>
  observedEventResultFields: string[]
  liveSoccerEvents: number
  writesPerformed: 0
  valuesChanged: 0
}

type JsonRecord = Record<string, unknown>

function records(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is JsonRecord => Boolean(item) && typeof item === 'object')
}

function firstRecordArray(payload: unknown) {
  if (!payload || typeof payload !== 'object') return []
  for (const value of Object.values(payload)) {
    const rows = records(value)
    if (rows.length > 0) return rows
  }
  return []
}

function hasValue(row: JsonRecord, aliases: string[]) {
  return aliases.some((alias) => row[alias] !== null && row[alias] !== undefined && row[alias] !== '')
}

function fieldCoverage(rows: JsonRecord[], fields: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(fields).map(([field, aliases]) => [
    field,
    rows.length ? Math.round((rows.filter((row) => hasValue(row, aliases)).length / rows.length) * 10_000) / 100 : 0,
  ]))
}

function observedFields(rows: JsonRecord[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))].sort()
}

export function createTheSportsDbClient(apiKey = process.env.THESPORTSDB_API_KEY) {
  if (typeof window !== 'undefined') throw new Error('TheSportsDB access is server-only.')
  if (!apiKey?.trim()) throw new Error('THESPORTSDB_API_KEY is not configured.')
  const key: string = apiKey.trim()

  async function get(path: string) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-API-KEY': key },
      next: { revalidate: 3600 },
    })
    if (!response.ok) throw new Error(`TheSportsDB request failed with HTTP ${response.status}.`)
    return response.json() as Promise<unknown>
  }

  return { get }
}

export async function runTheSportsDbTrial(apiKey = process.env.THESPORTSDB_API_KEY): Promise<TheSportsDbTrialReport> {
  const client = createTheSportsDbClient(apiKey)
  const [arsenalPlayersPayload, teamsPayload, livescorePayload, recentEventsPayload] = await Promise.all([
    client.get('/list/players/133604'),
    client.get('/list/teams/4328'),
    client.get('/livescore/soccer'),
    client.get('/schedule/previous/league/4328'),
  ])
  const arsenalPlayers = firstRecordArray(arsenalPlayersPayload)
  const teams = firstRecordArray(teamsPayload)
  const teamIds = teams
    .map((team) => team.idTeam ?? team.id)
    .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const leaguePlayerLists = await Promise.all(teamIds.map(async (id) => firstRecordArray(
    await client.get(`/list/players/${encodeURIComponent(String(id))}`),
  )))
  const players = leaguePlayerLists.flat()
  const liveEvents = firstRecordArray(livescorePayload)
  const recentEvents = firstRecordArray(recentEventsPayload)
  const uniquePlayers = [...new Map(players.map((player) => [String(player.idPlayer ?? player.id ?? ''), player])).values()]
    .filter((player) => String(player.idPlayer ?? player.id ?? '').length > 0)
  const samplePlayerId = uniquePlayers
    .map((player) => player.idPlayer ?? player.id)
    .find((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const samplePlayerIds = uniquePlayers
    .map((player) => player.idPlayer ?? player.id)
    .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
    .slice(0, 10)
  const statsByPlayer = await Promise.all(samplePlayerIds.map(async (id) => firstRecordArray(
    await client.get(`/lookup/player_stats/${encodeURIComponent(String(id))}`),
  )))
  const stats = statsByPlayer.flat()
  const eventIds = recentEvents
    .map((event) => event.idEvent ?? event.id)
    .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
    .slice(0, 5)
  const eventResults = (await Promise.all(eventIds.map(async (id) => firstRecordArray(
    await client.get(`/lookup/event_results/${encodeURIComponent(String(id))}`),
  )))).flat()

  return {
    provider: 'TheSportsDB',
    mode: 'read_only',
    apiVersion: 'v2',
    authenticated: true,
    arsenalPlayerCount: arsenalPlayers.length,
    premierLeagueTeamCount: teams.length,
    premierLeaguePlayerCount: players.length,
    uniquePremierLeaguePlayerCount: uniquePlayers.length,
    duplicatePremierLeaguePlayerCount: players.length - uniquePlayers.length,
    samplePlayerId: samplePlayerId ? String(samplePlayerId) : null,
    playerStatsRows: stats.length,
    statsPlayersSampled: samplePlayerIds.length,
    playersWithStats: statsByPlayer.filter((rows) => rows.length > 0).length,
    rosterFieldCoverage: fieldCoverage(uniquePlayers, {
      identity: ['idPlayer', 'id'],
      name: ['strPlayer', 'name'],
      team: ['strTeam', 'team'],
      position: ['strPosition', 'position'],
      nationality: ['strNationality', 'nationality'],
      birthDate: ['dateBorn', 'date_born'],
      image: ['strCutout', 'strThumb', 'cutout', 'thumb'],
    }),
    statisticsFieldCoverage: fieldCoverage(stats, {
      playerIdentity: ['idPlayer', 'id'],
      season: ['strSeason', 'season'],
      appearances: ['intAppearances', 'intPlayed', 'appearances', 'played'],
      minutes: ['intMinutes', 'minutes'],
      goals: ['intGoals', 'goals'],
      assists: ['intAssists', 'assists'],
      rating: ['strRating', 'fltRating', 'intRating', 'rating'],
    }),
    observedRosterFields: observedFields(uniquePlayers),
    observedStatisticsFields: observedFields(stats),
    recentLeagueEventCount: recentEvents.length,
    eventResultRows: eventResults.length,
    eventResultFieldCoverage: fieldCoverage(eventResults, {
      playerIdentity: ['idPlayer', 'id'],
      eventIdentity: ['idEvent'],
      minutes: ['intMinutes', 'minutes'],
      goals: ['intGoals', 'goals'],
      assists: ['intAssists', 'assists'],
      rating: ['strRating', 'fltRating', 'intRating', 'rating'],
    }),
    observedEventResultFields: observedFields(eventResults),
    liveSoccerEvents: liveEvents.length,
    writesPerformed: 0,
    valuesChanged: 0,
  }
}
