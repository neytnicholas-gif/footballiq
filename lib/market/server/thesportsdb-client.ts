const BASE_URL = 'https://www.thesportsdb.com/api/v2/json'

export type TheSportsDbTrialReport = {
  provider: 'TheSportsDB'
  mode: 'read_only'
  apiVersion: 'v2'
  authenticated: boolean
  arsenalPlayerCount: number
  samplePlayerId: string | null
  playerStatsRows: number
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
  const [playersPayload, livescorePayload] = await Promise.all([
    client.get('/list/players/133604'),
    client.get('/livescore/soccer'),
  ])
  const players = firstRecordArray(playersPayload)
  const liveEvents = firstRecordArray(livescorePayload)
  const samplePlayerId = players
    .map((player) => player.idPlayer ?? player.id)
    .find((id): id is string | number => typeof id === 'string' || typeof id === 'number')
  const statsPayload = samplePlayerId ? await client.get(`/lookup/player_stats/${encodeURIComponent(String(samplePlayerId))}`) : null

  return {
    provider: 'TheSportsDB',
    mode: 'read_only',
    apiVersion: 'v2',
    authenticated: true,
    arsenalPlayerCount: players.length,
    samplePlayerId: samplePlayerId ? String(samplePlayerId) : null,
    playerStatsRows: firstRecordArray(statsPayload).length,
    liveSoccerEvents: liveEvents.length,
    writesPerformed: 0,
    valuesChanged: 0,
  }
}
