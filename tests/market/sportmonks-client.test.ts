// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { buildSportmonksBundesligaCatalogue, buildSportmonksLaLigaCatalogue, buildSportmonksPremierLeagueCatalogue, createSportmonksClient, runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 })

describe('Sportmonks coverage trial client', () => {
  it('requires a server-only token', () => {
    expect(() => createSportmonksClient('')).toThrow('SPORTMONKS_API_TOKEN is not configured')
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
  })
})
