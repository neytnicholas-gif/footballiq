// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { buildSportmonksBundesligaCatalogue, buildSportmonksLaLigaCatalogue, buildSportmonksLigue1Catalogue, buildSportmonksPremierLeagueCatalogue, buildSportmonksSerieACatalogue, createSportmonksClient, fetchSportmonksCompletedGameweeks, fetchSportmonksPredictionFixtures, isCatalogueReady, runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })

describe('Sportmonks coverage trial client', () => {
  it('requires a server-only token', () => {
    expect(() => createSportmonksClient('')).toThrow('SPORTMONKS_API_TOKEN is not configured')
  })

  it('blocks every Sportmonks request from a Vercel Preview deployment', () => {
    const previousEnvironment = process.env.VERCEL_ENV
    process.env.VERCEL_ENV = 'preview'
    try {
      expect(() => createSportmonksClient('private-token')).toThrow('disabled outside the licensed Production environment')
    } finally {
      if (previousEnvironment === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previousEnvironment
    }
  })

  it('records the lowest remaining allowance reported for each API entity', async () => {
    const client = createSportmonksClient('private-token')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { id: 8 },
        rate_limit: { requested_entity: 'League', remaining: 1_999, resets_in_seconds: 3_599 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { id: 564 },
        rate_limit: { requested_entity: 'League', remaining: 1_998, resets_in_seconds: 3_598 },
      }), { status: 200 }))

    await client.get('/leagues/8')
    await client.get('/leagues/564')

    expect(client.getTelemetry()).toEqual({
      requestsMade: 2,
      rateLimits: [{ requestedEntity: 'League', lowestRemaining: 1_998, resetsInSeconds: 3_598 }],
    })
  })

  it('stops immediately on a depleted entity allowance and preserves the reset evidence', async () => {
    const client = createSportmonksClient('private-token')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      error: 'Too Many Requests',
      retry_after: 1_847,
      rate_limit: { requested_entity: 'Fixture', remaining: 0, resets_in_seconds: 1_847 },
    }), { status: 429 }))

    await expect(client.get('/fixtures/1')).rejects.toThrow('Fixture rate limit reached; retry after 1847 seconds')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.getTelemetry()).toEqual({
      requestsMade: 1,
      rateLimits: [{ requestedEntity: 'Fixture', lowestRemaining: 0, resetsInSeconds: 1_847 }],
    })
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('sportmonks.rate_limit.low'))
  })

  it('groups cross-league results by calendar week instead of unrelated provider round ids', async () => {
    const detail = (developer_name: string, value: number) => ({ data: { value }, type: { developer_name } })
    const finished = (id: number, starting_at: string, round_id: number) => ({ id, starting_at, round_id, state: { short_name: 'FT' } })
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 8, currentSeason: { id: 1 } }))
      .mockResolvedValueOnce(response({ id: 1, fixtures: [finished(101, '2026-08-02 14:00:00', 9001)] }))
      .mockResolvedValueOnce(response({ id: 564, currentSeason: { id: 2 } }))
      .mockResolvedValueOnce(response({ id: 2, fixtures: [finished(102, '2026-08-08 14:00:00', 7002)] }))
      .mockResolvedValueOnce(response({ id: 301, currentSeason: { id: 3 } }))
      .mockResolvedValueOnce(response({ id: 3, fixtures: [] }))
      .mockResolvedValueOnce(response({ id: 102, lineups: [{ player_id: 22, type_id: 11, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 7.2)] }] }))
      .mockResolvedValueOnce(response({ id: 101, lineups: [{ player_id: 11, type_id: 11, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 7.1)] }] }))

    const batches = await fetchSportmonksCompletedGameweeks('private-token')

    expect(batches.map((batch) => batch.gameweekKey)).toEqual(['sportmonks-2026-31', 'sportmonks-2026-32'])
    expect(batches.flatMap((batch) => batch.updates).map((update) => update.provider_fixture_id).sort()).toEqual(['101', '102'])
  })

  it('normalizes real fixture cards, scores and derby flags across the three licensed leagues', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response([
      {
        id: 9001, league_id: 8, starting_at: '2026-08-16 15:30:00',
        state: { short_name: 'NS' },
        participants: [
          { name: 'Arsenal', meta: { location: 'home' } },
          { name: 'Tottenham Hotspur', meta: { location: 'away' } },
        ],
        scores: [],
      },
      {
        id: 9002, league_id: 564, starting_at: '2026-08-15 19:00:00',
        state: { short_name: 'FT' },
        participants: [
          { name: 'Real Madrid', meta: { location: 'home' } },
          { name: 'Barcelona', meta: { location: 'away' } },
        ],
        scores: [
          { description: 'CURRENT', score: { participant: 'home', goals: 2 } },
          { description: 'CURRENT', score: { participant: 'away', goals: 1 } },
        ],
      },
      {
        id: 9003, league_id: 301, starting_at: '2026-08-17 18:00:00',
        state: { short_name: 'NS' },
        participants: [
          { name: 'Lyon', meta: { location: 'home' } },
          { name: 'Marseille', meta: { location: 'away' } },
        ],
        scores: [],
      },
    ]))

    const fixtures = await fetchSportmonksPredictionFixtures('private-token')

    expect(fixtures).toHaveLength(3)
    expect(fixtures.map((fixture) => fixture.league_key)).toEqual(['premier-league', 'la-liga', 'ligue-1'])
    expect(fixtures[0]).toMatchObject({ fixture_id: '9001', is_derby: true, status: 'scheduled' })
    expect(fixtures[1]).toMatchObject({ fixture_id: '9002', is_derby: true, status: 'completed', home_score: 2, away_score: 1 })
    expect(fixtures[2]).toMatchObject({ fixture_id: '9003', is_derby: false, status: 'scheduled' })
  })

  it('rechecks a processed fixture and accepts a late player rating exactly once', async () => {
    const detail = (developer_name: string, value: number) => ({ data: { value }, type: { developer_name } })
    const fixture = { id: 101, starting_at: '2026-08-08 14:00:00', state: { short_name: 'FT' } }
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 8, currentSeason: { id: 1 } }))
      .mockResolvedValueOnce(response({ id: 1, fixtures: [fixture] }))
      .mockResolvedValueOnce(response({ id: 564, currentSeason: { id: 2 } }))
      .mockResolvedValueOnce(response({ id: 2, fixtures: [] }))
      .mockResolvedValueOnce(response({ id: 301, currentSeason: { id: 3 } }))
      .mockResolvedValueOnce(response({ id: 3, fixtures: [] }))
      .mockResolvedValueOnce(response({ id: 101, lineups: [
        { player_id: 11, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 7.1)] },
        { player_id: 22, details: [detail('MINUTES_PLAYED', 72), detail('RATING', 7.4)] },
      ] }))

    const batches = await fetchSportmonksCompletedGameweeks('private-token', new Set(['101:11']))

    expect(batches.flatMap((batch) => batch.updates)).toMatchObject([
      { provider_fixture_id: '101', provider_player_id: '22', minutes_played: 72, rating: 7.4 },
    ])
  })

  it('audits squads and match ratings without exposing or writing the token', async () => {
    const detail = (developer_name: string, value: number) => ({ data: { value }, type: { developer_name } })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 8, currentSeason: { id: 99, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 1 }, { id: 2 }]))
      .mockResolvedValueOnce(response([{ player_id: 10, position: { developer_name: 'GOALKEEPER' } }]))
      .mockResolvedValueOnce(response([{ player_id: 20, position: { developer_name: 'FORWARD' } }]))
      .mockResolvedValueOnce(response({ id: 19427734, lineups: [
        { player_id: 10, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 7.4)] },
        { player_id: 20, details: [detail('MINUTES_PLAYED', 0)] },
      ] }))
      .mockResolvedValueOnce(response({ id: 564, currentSeason: { id: 100 } }))
      .mockResolvedValueOnce(response({ id: 82, currentSeason: { id: 101 } }))
      .mockResolvedValueOnce(response({ id: 384, currentSeason: { id: 102 } }))
      .mockResolvedValueOnce(response({ id: 301, currentSeason: { id: 103 } }))

    const report = await runSportmonksCoverageTrial('private-token')

    expect(report).toMatchObject({ teamCount: 2, uniquePlayerCount: 2, usablePlayerCount: 2, lineupRows: 2, appearedPlayers: 1, playersWithRatings: 1, writesPerformed: 0, valuesChanged: 0 })
    expect(report.topFiveLeagueAccess.every((league) => league.accessible)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(9)
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).not.toContain('private-token')
      expect(init?.headers).toEqual({ Authorization: 'private-token' })
    }
  })

  it('builds stable, tradeable players from verified squad identities', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 8, currentSeason: { id: 99, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 1, name: 'North FC' }]))
      .mockResolvedValueOnce(response([
        { player_id: 10, player: { id: 10, display_name: 'Alex Keeper', date_of_birth: '2000-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'GOALKEEPER' } },
        { player_id: 20, player: { id: 20, display_name: 'Sam Striker', date_of_birth: '2002-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'FORWARD' } },
      ]))
      .mockResolvedValueOnce(response({ id: 99, fixtures: [] }))
      .mockResolvedValueOnce(response([]))

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Premier League', seasonId: '99', playerCount: 2, marketPhase: 'opening', completedFixturesApplied: 0 })
    expect(catalogue.players.map((player) => player.display_name)).toEqual(['Sam Striker', 'Alex Keeper'])
    expect(catalogue.players.every((player) => player.active && player.provenance_status === 'verified')).toBe(true)
    expect(catalogue.players.every((player) => player.current_value === player.previous_value)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('aggregates split-season rows, recovers transfer history, and keeps unknown players below proven performers', async () => {
    const stat = (developer_name: string, value: number) => ({ value: { total: value, average: value }, type: { developer_name } })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({
        id: 8,
        currentSeason: { id: 99, name: '2026/2027' },
        seasons: [{ id: 99, ending_at: '2027-05-30' }, { id: 88, ending_at: '2026-05-30' }],
      }))
      .mockResolvedValueOnce(response([{ id: 1, name: 'North FC' }]))
      .mockResolvedValueOnce(response([
        { player_id: 10, player: { id: 10, display_name: 'Proven Star', date_of_birth: '2002-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'FORWARD' } },
        { player_id: 20, player: { id: 20, display_name: 'Recent Transfer', date_of_birth: '2002-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'FORWARD' } },
        { player_id: 30, player: { id: 30, display_name: 'Unknown Prospect', date_of_birth: '2002-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'FORWARD' } },
      ]))
      .mockResolvedValueOnce(response({ id: 99, fixtures: [] }))
      .mockResolvedValueOnce(response([
        { player_id: 10, details: [stat('APPEARANCES', 3), stat('STARTED', 3), stat('MINUTES_PLAYED', 300), stat('RATING', 7.8), stat('GOALS', 4)] },
        { player_id: 10, details: [stat('APPEARANCES', 3), stat('STARTED', 2), stat('MINUTES_PLAYED', 300), stat('RATING', 7.0), stat('GOALS', 2)] },
        { player_id: 30, details: [stat('APPEARANCES', 5), stat('STARTED', 0), stat('MINUTES_PLAYED', 50), stat('RATING', 9.0), stat('GOALS', 1)] },
      ]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 20, statistics: [{
        player_id: 20,
        season_id: 70,
        season: { id: 70, ending_at: '2026-05-30' },
        details: [stat('APPEARANCES', 25), stat('STARTED', 20), stat('MINUTES_PLAYED', 1_900), stat('RATING', 6.9), stat('GOALS', 9)],
      }] }))
      .mockResolvedValueOnce(response({ id: 30, statistics: [] }))

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')
    const proven = catalogue.players.find((player) => player.id === 10)!
    const transfer = catalogue.players.find((player) => player.id === 20)!
    const unknown = catalogue.players.find((player) => player.id === 30)!

    expect(catalogue).toMatchObject({
      qualityPricedPlayerCount: 2,
      fallbackPricedPlayerCount: 1,
      qualityCoveragePercent: 66.67,
    })
    expect(proven.opening_season_value).toBeGreaterThan(unknown.opening_season_value)
    expect(transfer.opening_season_value).toBeGreaterThan(unknown.opening_season_value)
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/players/30?'))).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(8)
  })

  it('moves prices only from finished fixtures with verified ratings and minutes', async () => {
    const detail = (developer_name: string, value: number) => ({ data: { value }, type: { developer_name } })
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 8, currentSeason: { id: 99, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 1 }]))
      .mockResolvedValueOnce(response([
        { player_id: 20, player: { id: 20, display_name: 'Sam Striker', date_of_birth: '2002-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'FORWARD' } },
        { player_id: 30, player: { id: 30, display_name: 'No Rating', date_of_birth: '2001-01-01' }, team: { id: 1, name: 'North FC' }, position: { developer_name: 'MIDFIELDER' } },
      ]))
      .mockResolvedValueOnce(response({ id: 99, fixtures: [{ id: 500, round_id: 1, starting_at: '2026-08-15 14:00:00', state: { short_name: 'FT' } }] }))
      .mockResolvedValueOnce(response([{
        player_id: 20,
        details: [
          { value: { average: 7.7 }, type: { developer_name: 'RATING' } },
          { value: { total: 32 }, type: { developer_name: 'APPEARANCES' } },
          { value: { total: 29 }, type: { developer_name: 'STARTED' } },
          { value: { total: 2600 }, type: { developer_name: 'MINUTES_PLAYED' } },
          { value: { total: 20 }, type: { developer_name: 'GOALS' } },
          { value: { total: 8 }, type: { developer_name: 'ASSISTS' } },
        ],
      }]))
      .mockResolvedValueOnce(response({ id: 500, lineups: [
        { id: 1, fixture_id: 500, player_id: 20, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 8.1)] },
        { id: 2, fixture_id: 500, player_id: 30, details: [detail('MINUTES_PLAYED', 90)] },
      ] }))

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')
    const moved = catalogue.players.find((player) => player.id === 20)!
    const frozen = catalogue.players.find((player) => player.id === 30)!

    expect(catalogue).toMatchObject({ marketPhase: 'verified_movement', completedFixturesApplied: 1, ratedPlayerCount: 1 })
    expect(moved.opening_season_value).toBeGreaterThan(frozen.opening_season_value)
    expect(moved.current_value).toBeGreaterThan(moved.opening_season_value)
    expect(moved.matchweek_performance_history).toEqual([{ week: 1, rating: 8.1, minutes: 90 }])
    expect(frozen.current_value).toBe(frozen.opening_season_value)
  })

  it('builds namespaced La Liga players for the shared cross-league market', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 564, currentSeason: { id: 27965, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 10, name: 'Madrid FC' }]))
      .mockResolvedValueOnce(response([
        { player_id: 77, player: { id: 77, display_name: 'Alex Example', date_of_birth: '2001-01-01' }, team: { id: 10, name: 'Madrid FC' }, position: { developer_name: 'MIDFIELDER' } },
      ]))
      .mockResolvedValueOnce(response({ id: 27965, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksLaLigaCatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'La Liga', competitionKey: 'la-liga', leagueId: 564, seasonId: '27965', playerCount: 1 })
    expect(catalogue.players[0]).toMatchObject({ slug: 'alex-example-la-liga', competition_key: 'la-liga', competition_name: 'La Liga' })
  })

  it('builds namespaced Bundesliga players for the shared cross-league market', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 82, currentSeason: { id: 28321, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 20, name: 'Berlin FC' }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([
        { player_id: 88, player: { id: 88, display_name: 'Max Example', date_of_birth: '2000-01-01' }, team: { id: 20, name: 'Berlin FC' }, position: { developer_name: 'DEFENDER' } },
      ]))
      .mockResolvedValueOnce(response({ id: 28321, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksBundesligaCatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Bundesliga', competitionKey: 'bundesliga', leagueId: 82, seasonId: '28321', playerCount: 1 })
    expect(catalogue.players[0]).toMatchObject({ slug: 'max-example-bundesliga', competition_key: 'bundesliga', competition_name: 'Bundesliga' })
    expect(isCatalogueReady(catalogue)).toBe(false)
  })

  it('builds namespaced Serie A players for the shared cross-league market', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 384, currentSeason: { id: 27895, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 30, name: 'Milano FC' }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([
        { player_id: 99, player: { id: 99, display_name: 'Marco Example', date_of_birth: '2000-01-01' }, team: { id: 30, name: 'Milano FC' }, position: { developer_name: 'MIDFIELDER' } },
      ]))
      .mockResolvedValueOnce(response({ id: 27895, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksSerieACatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Serie A', competitionKey: 'serie-a', leagueId: 384, seasonId: '27895', playerCount: 1 })
    expect(catalogue.players[0]).toMatchObject({ slug: 'marco-example-serie-a', competition_key: 'serie-a', competition_name: 'Serie A' })
    expect(isCatalogueReady(catalogue)).toBe(false)
  })

  it('uses the verified extended squad when standard current squads are empty', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 384, currentSeason: { id: 27895, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 30, name: 'Milano FC' }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([
        { id: 120, display_name: 'Extended Player', date_of_birth: '2000-01-01', position: { developer_name: 'MIDFIELDER' } },
      ]))
      .mockResolvedValueOnce(response({ id: 27895, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksSerieACatalogue('private-token')

    expect(catalogue.players[0]).toMatchObject({ id: 120, display_name: 'Extended Player', club_name: 'Milano FC', position: 'MID' })
  })

  it('uses the team player relation when all squad endpoints are empty', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 384, currentSeason: { id: 27895, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 30, name: 'Milano FC' }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 30, players: [
        { player_id: 121, player: { id: 121, display_name: 'Nested Player', date_of_birth: '2000-01-01' }, position: { developer_name: 'FORWARD' } },
      ] }))
      .mockResolvedValueOnce(response({ id: 27895, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksSerieACatalogue('private-token')

    expect(catalogue.players[0]).toMatchObject({ id: 121, display_name: 'Nested Player', club_name: 'Milano FC', position: 'FWD' })
  })

  it('builds namespaced Ligue 1 players for the shared cross-league market', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ id: 301, currentSeason: { id: 27962, name: '2026/2027' } }))
      .mockResolvedValueOnce(response([{ id: 40, name: 'Paris FC' }]))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([
        { player_id: 111, player: { id: 111, display_name: 'Pierre Example', date_of_birth: '2000-01-01' }, team: { id: 40, name: 'Paris FC' }, position: { developer_name: 'FORWARD' } },
      ]))
      .mockResolvedValueOnce(response({ id: 27962, fixtures: [] }))
      .mockResolvedValue(response({}))

    const catalogue = await buildSportmonksLigue1Catalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Ligue 1', competitionKey: 'ligue-1', leagueId: 301, seasonId: '27962', playerCount: 1 })
    expect(catalogue.players[0]).toMatchObject({ slug: 'pierre-example-ligue-1', competition_key: 'ligue-1', competition_name: 'Ligue 1' })
    expect(isCatalogueReady(catalogue)).toBe(false)
  })
})
