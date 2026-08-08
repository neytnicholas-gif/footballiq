// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { buildSportmonksPremierLeagueCatalogue, createSportmonksClient, runSportmonksCoverageTrial } from '@/lib/market/server/sportmonks-client'

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

    const catalogue = await buildSportmonksPremierLeagueCatalogue('private-token')

    expect(catalogue).toMatchObject({ competition: 'Premier League', seasonId: '99', playerCount: 2 })
    expect(catalogue.players.map((player) => player.display_name)).toEqual(['Sam Striker', 'Alex Keeper'])
    expect(catalogue.players.every((player) => player.active && player.provenance_status === 'verified')).toBe(true)
    expect(catalogue.players.every((player) => player.current_value === player.previous_value)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
