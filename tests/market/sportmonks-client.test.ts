// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { buildSportmonksBundesligaCatalogue, buildSportmonksLaLigaCatalogue, buildSportmonksLigue1Catalogue, buildSportmonksPremierLeagueCatalogue, buildSportmonksSerieACatalogue, createSportmonksClient, fetchSportmonksCompletedGameweeks, isCatalogueReady, runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })

describe('Sportmonks coverage trial client', () => {
  it('requires a server-only token', () => {
    expect(() => createSportmonksClient('')).toThrow('SPORTMONKS_API_TOKEN is not configured')
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

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Premier League', seasonId: '99', playerCount: 2, marketPhase: 'opening', completedFixturesApplied: 0 })
    expect(catalogue.players.map((player) => player.display_name)).toEqual(['Sam Striker', 'Alex Keeper'])
    expect(catalogue.players.every((player) => player.active && player.provenance_status === 'verified')).toBe(true)
    expect(catalogue.players.every((player) => player.current_value === player.previous_value)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
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
      .mockResolvedValueOnce(response({ id: 500, lineups: [
        { id: 1, fixture_id: 500, player_id: 20, details: [detail('MINUTES_PLAYED', 90), detail('RATING', 8.1)] },
        { id: 2, fixture_id: 500, player_id: 30, details: [detail('MINUTES_PLAYED', 90)] },
      ] }))

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')
    const moved = catalogue.players.find((player) => player.id === 20)!
    const frozen = catalogue.players.find((player) => player.id === 30)!

    expect(catalogue).toMatchObject({ marketPhase: 'verified_movement', completedFixturesApplied: 1, ratedPlayerCount: 1 })
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

    const catalogue = await buildSportmonksLigue1Catalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Ligue 1', competitionKey: 'ligue-1', leagueId: 301, seasonId: '27962', playerCount: 1 })
    expect(catalogue.players[0]).toMatchObject({ slug: 'pierre-example-ligue-1', competition_key: 'ligue-1', competition_name: 'Ligue 1' })
    expect(isCatalogueReady(catalogue)).toBe(false)
  })
})
