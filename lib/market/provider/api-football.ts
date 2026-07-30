import { getFootballIQClubColours } from '@/lib/market/club-colours'
import type {
  DataProviderAdapter,
  ProviderClub,
  ProviderCompetition,
  ProviderFixture,
  ProviderImportContext,
  ProviderPage,
  ProviderPagination,
  ProviderPlayer,
  ProviderPlayerMatchStats,
  ProviderSeason,
} from '@/lib/market/provider/types'

type HttpRequestOptions = {
  path: string
  query?: Record<string, string | number | undefined>
  context: ProviderImportContext
}

class ProviderHttpError extends Error {
  transient: boolean

  constructor(message: string, transient: boolean) {
    super(message)
    this.name = 'ProviderHttpError'
    this.transient = transient
  }
}

type ApiFootballPaging = {
  current?: number
  total?: number
}

type ApiFootballLeagueRow = {
  league?: {
    id?: number
    name?: string
    type?: string
  }
  country?: {
    name?: string
  }
  seasons?: Array<{
    year?: number
    start?: string
    end?: string
    current?: boolean
  }>
}

type ApiFootballTeamRow = {
  team?: {
    id?: number
    name?: string
    code?: string
    updated?: string
  }
}

type ApiFootballPlayerRow = {
  player?: {
    id?: number
    name?: string
    firstname?: string
    lastname?: string
    nationality?: string
    number?: number
    updated?: string
  }
  statistics?: Array<{
    games?: {
      position?: string
      number?: number
    }
  }>
}

type ApiFootballResponse<T> = {
  response?: T[]
  paging?: ApiFootballPaging
  errors?: Record<string, string>
}

type ApiFootballFixtureRow = {
  fixture?: {
    id?: number
    date?: string
    status?: {
      short?: string
      long?: string
    }
    update?: string
  }
  teams?: {
    home?: { id?: number }
    away?: { id?: number }
  }
}

type ApiFootballFixturePlayersTeamRow = {
  team?: {
    id?: number
  }
  players?: Array<{
    player?: {
      id?: number
      update?: string
    }
    statistics?: Array<{
      games?: {
        position?: string
        rating?: string
        minutes?: number
      }
      shots?: {
        total?: number
        on?: number
      }
      goals?: {
        total?: number
        assists?: number
        conceded?: number
      }
      passes?: {
        total?: number
        accuracy?: string
      }
      tackles?: {
        total?: number
        interceptions?: number
      }
      duels?: {
        won?: number
      }
      dribbles?: {
        attempts?: number
      }
      fouls?: {
        drawn?: number
      }
      cards?: {
        yellow?: number
        red?: number
      }
      penalty?: {
        scored?: number
        missed?: number
      }
    }>
  }>
}

const DEFAULT_BASE_URL = 'https://v3.football.api-sports.io'
const DEFAULT_REQUEST_DELAY_MS = 7000
const DEFAULT_429_RETRY_MS = 60000

function getProviderConfig() {
  const rawApiKey = process.env.API_FOOTBALL_KEY ?? ''
  const trimmedKey = rawApiKey.trim().replace(/^"|"$/g, '')
  const parsedDelayMs = Number.parseInt(process.env.MARKET_IMPORT_REQUEST_DELAY_MS?.trim() || '', 10)
  const requestDelayMs = Number.isFinite(parsedDelayMs) && parsedDelayMs >= 0
    ? parsedDelayMs
    : DEFAULT_REQUEST_DELAY_MS

  return {
    baseUrl: (process.env.API_FOOTBALL_BASE_URL || DEFAULT_BASE_URL).trim(),
    apiKey: trimmedKey,
    requestDelayMs,
  }
}

function createQueryString(query: Record<string, string | number | undefined> = {}): string {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function normalizeSpaces(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function mapFixtureStatus(shortStatus: string | undefined): ProviderFixture['status'] {
  const status = (shortStatus || '').toUpperCase()
  if (['FT', 'AET', 'PEN'].includes(status)) return 'completed'
  if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(status)) return 'postponed'
  if (!status) return 'unknown'
  return 'scheduled'
}

function safeNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0
}

function parseRating(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function redactSecret(message: string): string {
  const key = process.env.API_FOOTBALL_KEY
  if (!key || key.length < 5) return message
  return message.split(key).join('[REDACTED]')
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function getProviderMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const candidate = payload as {
    message?: unknown
    error?: unknown
    errors?: unknown
    response?: unknown
  }

  if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
    return candidate.message.trim()
  }
  if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
    return candidate.error.trim()
  }
  if (candidate.errors && typeof candidate.errors === 'object') {
    const values = Object.values(candidate.errors as Record<string, unknown>)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
    if (values.length > 0) {
      return values.join('; ')
    }
  }

  return null
}

function classifyApiFootballError(
  status: number,
  path: string,
  providerMessage: string | null,
  retryAfter: string | null,
): string {
  const lowerMessage = (providerMessage || '').toLowerCase()
  const endpoint = `${path}`

  if (status === 401) {
    return `BLOCKED: API authentication failed (401) at ${endpoint}. Check API_FOOTBALL_KEY value and activation status.`
  }

  if (status === 403) {
    if (lowerMessage.includes('invalid api key') || lowerMessage.includes('invalid key')) {
      return `BLOCKED: API authentication failed (403) at ${endpoint}. API_FOOTBALL_KEY is invalid for API-Football.`
    }
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('access denied')) {
      return `BLOCKED: Provider denied access (403) at ${endpoint}. The key is recognized but endpoint access is restricted.`
    }
    if (lowerMessage.includes('subscription') || lowerMessage.includes('plan')) {
      return `BLOCKED: Endpoint access is restricted by API-Football subscription (403) at ${endpoint}.`
    }
    if (lowerMessage.includes('not activated') || lowerMessage.includes('activate')) {
      return `BLOCKED: API-Football access is not activated for this key/account (403) at ${endpoint}.`
    }
    if (lowerMessage.includes('quota') || lowerMessage.includes('limit')) {
      return `BLOCKED: Provider quota/limit access denied (403) at ${endpoint}.`
    }
    if (lowerMessage.includes('season')) {
      return `BLOCKED: Requested season appears unavailable for current plan/access (403) at ${endpoint}.`
    }

    return `BLOCKED: Provider denied request (403) at ${endpoint}. This is usually key access activation, subscription scope, or endpoint restrictions.`
  }

  if (status === 404) {
    return `ERROR: Provider endpoint not found (404) at ${endpoint}.`
  }

  if (status === 422 || status === 400) {
    return `ERROR: Provider rejected malformed request (${status}) at ${endpoint}.`
  }

  if (status === 429) {
    const suffix = retryAfter ? ` Retry-After=${retryAfter}.` : ''
    return `BLOCKED: Provider rate limit reached (429) at ${endpoint}.${suffix}`
  }

  if (status >= 500) {
    return `ERROR: Provider service unavailable (${status}) at ${endpoint}.`
  }

  return `ERROR: Provider request failed (${status}) at ${endpoint}.`
}

async function requestApiFootball<T>(options: HttpRequestOptions): Promise<T> {
  const config = getProviderConfig()

  if (!config.apiKey) {
    throw new Error('BLOCKED: API_FOOTBALL_KEY is missing.')
  }

  const url = `${config.baseUrl}${options.path}${createQueryString(options.query)}`
  const maxAttempts = 3

  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-apisports-key': config.apiKey,
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const retryAfterHeader = response.headers.get('retry-after')
        const shouldRetry = response.status === 429 || response.status === 408 || response.status >= 500

        let providerMessage: string | null = null
        try {
          const payload = (await response.json()) as unknown
          providerMessage = getProviderMessage(payload)
        } catch {
          providerMessage = null
        }

        const classifiedMessage = classifyApiFootballError(
          response.status,
          options.path,
          providerMessage,
          retryAfterHeader,
        )

        if (response.status === 429) {
          const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN
          const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : DEFAULT_429_RETRY_MS
          options.context.onProviderRequest?.({
            path: options.path,
            status: 'rate-limited',
            waitMs: retryAfterMs,
          })
          await sleep(retryAfterMs)
          continue
        }

        if (!shouldRetry || attempt >= maxAttempts) {
          throw new ProviderHttpError(classifiedMessage, false)
        }

        const retryAfterMs = 400 * 2 ** (attempt - 1)
        await sleep(retryAfterMs)
        continue
      }

      const payload = (await response.json()) as T
      options.context.onProviderRequest?.({
        path: options.path,
        status: 'success',
        waitMs: config.requestDelayMs,
      })
      if (config.requestDelayMs > 0) {
        await sleep(config.requestDelayMs)
      }
      return payload
    } catch (error) {
      if (error instanceof ProviderHttpError && !error.transient) {
        throw new Error(redactSecret(error.message))
      }

      const safeMessage = redactSecret(error instanceof Error ? error.message : 'Unknown provider error')
      if (attempt >= maxAttempts || (error instanceof ProviderHttpError && !error.transient)) {
        throw new Error(safeMessage)
      }
      await sleep(400 * 2 ** (attempt - 1))
    }
  }

  throw new Error('Provider request failed unexpectedly.')
}

function mapPositionGroup(rawPosition: string | undefined): ProviderPlayer['positionGroup'] {
  const normalized = (rawPosition ?? '').toLowerCase().trim()
  if (normalized.includes('goal')) return 'Goalkeeper'
  if (normalized.includes('def')) return 'Defender'
  if (normalized.includes('mid')) return 'Midfielder'
  if (normalized.includes('for') || normalized.includes('strik') || normalized.includes('att')) return 'Forward'
  return 'Unknown'
}

function toPage<T>(items: T[], pagination: ProviderPagination, paging?: ApiFootballPaging): ProviderPage<T> {
  const currentPage = paging?.current ?? pagination.page
  const totalPages = paging?.total
  const hasNextPage = typeof totalPages === 'number' ? currentPage < totalPages : items.length >= pagination.perPage

  return {
    items,
    page: currentPage,
    hasNextPage,
    totalPages,
  }
}

async function getLeagueRows(
  context: ProviderImportContext,
  options?: {
    searchTerm?: string
    leagueId?: string
  }
): Promise<ApiFootballLeagueRow[]> {
  const query = options?.leagueId
    ? { id: options.leagueId }
    : {
        search: options?.searchTerm,
        country: 'England',
        type: 'League',
      }

  const payload = await requestApiFootball<ApiFootballResponse<ApiFootballLeagueRow>>({
    path: '/leagues',
    query,
    context,
  })

  const providerErrors = payload.errors ?? {}
  if (Object.keys(providerErrors).length > 0) {
    throw new Error(`Provider returned errors for league discovery: ${JSON.stringify(providerErrors)}`)
  }

  return payload.response ?? []
}

export const apiFootballAdapter: DataProviderAdapter = {
  name: 'api-football',

  async fetchCompetitions(pagination, context) {
    const explicitLeagueId = process.env.MARKET_TARGET_LEAGUE_ID?.trim()
    const rows = await getLeagueRows(context, {
      searchTerm: 'Premier League',
      leagueId: explicitLeagueId || undefined,
    })

    const competitions: ProviderCompetition[] = rows.flatMap((row) => {
      const leagueId = row.league?.id
      const leagueName = row.league?.name
      if (!leagueId || !leagueName) return []

      return [
        {
          providerCompetitionId: String(leagueId),
          name: normalizeSpaces(leagueName),
          key: `league-${leagueId}`,
          country: row.country?.name,
          current: row.seasons?.some((season) => season.current === true),
        },
      ]
    })

    return toPage(competitions.slice(0, pagination.perPage), pagination, { current: pagination.page, total: 1 })
  },

  async fetchSeasons(competitionKey, pagination, context) {
    const leagueId = competitionKey.replace('league-', '')
    const payload = await requestApiFootball<ApiFootballResponse<ApiFootballLeagueRow>>({
      path: '/leagues',
      query: {
        id: leagueId,
      },
      context,
    })

    const rows = payload.response ?? []
    const seasons: ProviderSeason[] = rows.flatMap((row) =>
      (row.seasons ?? []).flatMap((season) => {
        if (!season.year || !season.start || !season.end) return []
        return [
          {
            providerSeasonId: `${leagueId}-${season.year}`,
            key: `season-${season.year}`,
            startsAt: season.start,
            endsAt: season.end,
          },
        ]
      }),
    )

    const paged = seasons.slice(0, pagination.perPage)
    return toPage(paged, pagination, { current: pagination.page, total: 1 })
  },

  async fetchClubs(seasonKey, pagination, context) {
    const leagueId = process.env.MARKET_TARGET_LEAGUE_ID
    if (!leagueId) {
      throw new Error('BLOCKED: MARKET_TARGET_LEAGUE_ID is missing.')
    }

    const seasonValue = seasonKey.replace('season-', '')
    const payload = await requestApiFootball<ApiFootballResponse<ApiFootballTeamRow>>({
      path: '/teams',
      query: {
        league: leagueId,
        season: seasonValue,
      },
      context,
    })

    const clubs: ProviderClub[] = (payload.response ?? []).flatMap((row) => {
      const teamId = row.team?.id
      const teamName = row.team?.name
      if (!teamId || !teamName) return []

      const name = normalizeSpaces(teamName)
      const colourPreset = getFootballIQClubColours(name)

      return [
        {
          providerClubId: String(teamId),
          name,
          shortName: normalizeSpaces(row.team?.code || name),
          slug: slugify(name),
          primaryColour: colourPreset.primary,
          secondaryColour: colourPreset.secondary,
          accentColour: colourPreset.accent,
          foregroundColour: colourPreset.foreground,
          colourConfidence: colourPreset.confidence,
          providerUpdatedAt: row.team?.updated,
        },
      ]
    })

    return toPage(clubs.slice(0, pagination.perPage), pagination, payload.paging)
  },

  async fetchSquad(clubProviderId, seasonKey, pagination, context) {
    const seasonValue = seasonKey.replace('season-', '')
    const payload = await requestApiFootball<ApiFootballResponse<ApiFootballPlayerRow>>({
      path: '/players',
      query: {
        team: clubProviderId,
        season: seasonValue,
        page: pagination.page,
      },
      context,
    })

    const players: ProviderPlayer[] = (payload.response ?? []).flatMap((row) => {
      const playerId = row.player?.id
      const fullName = row.player?.name
      if (!playerId || !fullName) return []

      const statistics = row.statistics ?? []
      const detailedPosition = statistics
        .map((item) => item.games?.position)
        .find((item): item is string => Boolean(item && item.trim().length > 0))

      const shirtNumber = statistics
        .map((item) => item.games?.number)
        .find((item): item is number => typeof item === 'number')

      const normalizedFullName = normalizeSpaces(fullName)
      const firstName = normalizeSpaces(row.player?.firstname ?? '')
      const lastName = normalizeSpaces(row.player?.lastname ?? '')
      const displayName = firstName || lastName
        ? normalizeSpaces(`${firstName} ${lastName}`)
        : normalizedFullName

      return [
        {
          providerPlayerId: String(playerId),
          fullName: normalizedFullName,
          displayName,
          positionGroup: mapPositionGroup(detailedPosition),
          detailedPosition: detailedPosition ? normalizeSpaces(detailedPosition) : undefined,
          nationality: row.player?.nationality ? normalizeSpaces(row.player.nationality) : undefined,
          shirtNumber,
          availabilityStatus: 'available',
          providerUpdatedAt: row.player?.updated,
        },
      ]
    })

    return toPage(players, pagination, payload.paging)
  },

  async fetchFixtures(_seasonKey, pagination, _context) {
    const leagueId = process.env.MARKET_TARGET_LEAGUE_ID
    if (!leagueId) {
      throw new Error('BLOCKED: MARKET_TARGET_LEAGUE_ID is missing.')
    }

    const seasonValue = _seasonKey.replace('season-', '')
    const payload = await requestApiFootball<ApiFootballResponse<ApiFootballFixtureRow>>({
      path: '/fixtures',
      query: {
        league: leagueId,
        season: seasonValue,
        page: pagination.page,
      },
      context: _context,
    })

    const fixtures: ProviderFixture[] = (payload.response ?? []).flatMap((row) => {
      const fixtureId = row.fixture?.id
      const fixtureDate = row.fixture?.date
      const homeId = row.teams?.home?.id
      const awayId = row.teams?.away?.id
      if (!fixtureId || !fixtureDate || !homeId || !awayId) return []

      return [
        {
          providerFixtureId: String(fixtureId),
          fixtureDate,
          homeClubProviderId: String(homeId),
          awayClubProviderId: String(awayId),
          status: mapFixtureStatus(row.fixture?.status?.short),
        },
      ]
    })

    return toPage(fixtures, pagination, payload.paging)
  },

  async fetchPlayerMatchStats(_seasonKey, pagination, _context) {
    const fixtureIds = (process.env.MARKET_WEEKLY_FIXTURE_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (fixtureIds.length === 0) {
      return toPage<ProviderPlayerMatchStats>([], pagination, { current: pagination.page, total: 1 })
    }

    const fixtureId = fixtureIds[pagination.page - 1]
    if (!fixtureId) {
      return toPage<ProviderPlayerMatchStats>([], pagination, {
        current: pagination.page,
        total: fixtureIds.length,
      })
    }

    const dateMap = (() => {
      try {
        return JSON.parse(process.env.MARKET_WEEKLY_FIXTURE_DATE_MAP || '{}') as Record<string, string>
      } catch {
        return {}
      }
    })()

    const payload = await requestApiFootball<ApiFootballResponse<ApiFootballFixturePlayersTeamRow>>({
      path: '/fixtures/players',
      query: {
        fixture: fixtureId,
      },
      context: _context,
    })

    const fixtureDate = dateMap[fixtureId] || new Date().toISOString()

    const stats: ProviderPlayerMatchStats[] = (payload.response ?? []).flatMap((teamRow) =>
      (teamRow.players ?? []).flatMap((playerRow) => {
        const playerId = playerRow.player?.id
        const stat = playerRow.statistics?.[0]
        if (!playerId || !stat) return []

        const minutesPlayed = safeNumber(stat.games?.minutes)
        const rating = parseRating(stat.games?.rating)
        const yellowCards = safeNumber(stat.cards?.yellow)
        const redCards = safeNumber(stat.cards?.red)
        const goalsConceded = safeNumber(stat.goals?.conceded)

        return [
          {
            providerFixtureId: fixtureId,
            providerPlayerId: String(playerId),
            fixtureDate,
            started: (stat.games?.position || '').toLowerCase() !== 'substitute',
            minutesPlayed,
            providerRating: rating,
            goals: safeNumber(stat.goals?.total),
            assists: safeNumber(stat.goals?.assists),
            shots: safeNumber(stat.shots?.total),
            shotsOnTarget: safeNumber(stat.shots?.on),
            keyPasses: safeNumber(stat.dribbles?.attempts),
            passes: safeNumber(stat.passes?.total),
            passAccuracy: stat.passes?.accuracy ? Number.parseFloat(stat.passes.accuracy) : undefined,
            tackles: safeNumber(stat.tackles?.total),
            interceptions: safeNumber(stat.tackles?.interceptions),
            clearances: 0,
            blocks: safeNumber(stat.duels?.won),
            saves: 0,
            goalsConceded,
            cleanSheet: minutesPlayed > 0 && goalsConceded === 0,
            yellowCards,
            redCards,
            penaltiesScored: safeNumber(stat.penalty?.scored),
            penaltiesMissed: safeNumber(stat.penalty?.missed),
            ownGoals: 0,
            providerUpdatedAt: playerRow.player?.update,
            rawProviderPayload: playerRow,
          },
        ]
      }),
    )

    return {
      items: stats,
      page: pagination.page,
      hasNextPage: pagination.page < fixtureIds.length,
      totalPages: fixtureIds.length,
    }
  },
}
