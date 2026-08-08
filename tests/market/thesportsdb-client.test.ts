// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import { createTheSportsDbClient, runTheSportsDbTrial } from '@/lib/market/server/thesportsdb-client'

describe('TheSportsDB server-only trial client', () => {
  it('requires a server-side credential', () => {
    expect(() => createTheSportsDbClient('')).toThrow('THESPORTSDB_API_KEY is not configured')
  })

  it('uses v2 header authentication and returns a read-only coverage report', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ list: [{ idPlayer: 'p-1' }, { idPlayer: 'p-2' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ teams: [{ idTeam: 't-1' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ livescore: [{ idEvent: 'e-1' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ players: [{ idPlayer: 'p-1' }, { idPlayer: 'p-2' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ playerstats: [{ idPlayer: 'p-1', intAppearances: '12', intGoals: '4' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ playerstats: [] }), { status: 200 }))

    const report = await runTheSportsDbTrial('private-test-key')

    expect(report).toMatchObject({ authenticated: true, arsenalPlayerCount: 2, premierLeagueTeamCount: 1, uniquePremierLeaguePlayerCount: 2, playerStatsRows: 1, statsPlayersSampled: 2, playersWithStats: 1, liveSoccerEvents: 1, writesPerformed: 0, valuesChanged: 0 })
    expect(report.statisticsFieldCoverage).toMatchObject({ appearances: 100, goals: 100, assists: 0, rating: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(6)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual({ 'X-API-KEY': 'private-test-key' })
    }
    expect(fetchMock.mock.calls.map(([url]) => String(url)).join(' ')).not.toContain('private-test-key')
  })
})
