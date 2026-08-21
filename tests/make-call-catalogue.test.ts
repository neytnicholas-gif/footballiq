// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildMakeCallCatalogue,
  MAKE_CALL_GENERATED_ROUNDS,
  MAKE_CALL_TOTAL_ROUNDS,
  type MakeCallCatalogueSourcePlayer,
} from '@/lib/make-call-catalogue'

const competitions = [
  ['premier-league', 'Premier League'],
  ['la-liga', 'La Liga'],
  ['ligue-1', 'Ligue 1'],
] as const
const positions = ['GK', 'DEF', 'MID', 'FWD'] as const

function sourcePlayers() {
  const players: MakeCallCatalogueSourcePlayer[] = []
  for (const [competitionIndex, [competitionKey, competitionName]] of competitions.entries()) {
    for (const [positionIndex, position] of positions.entries()) {
      for (let index = 0; index < 30; index += 1) {
        players.push({
          sourceId: `${competitionKey}:${position}:${index}`,
          stablePlayerId: `${competitionKey}-${position.toLowerCase()}-${index}`,
          displayName: `${competitionName} ${position} Player ${index}`,
          clubName: `${competitionName} Club ${(index % 10) + 1}`,
          competitionKey,
          competitionName,
          position,
          currentValue: 20_000_000 - competitionIndex * 100_000 - positionIndex * 10_000 - index * 100,
        })
      }
    }
  }
  return players
}

describe('Make the Call 500-round catalogue', () => {
  it('builds 499 generated rounds plus the curated opening round', () => {
    const rounds = buildMakeCallCatalogue(sourcePlayers())
    expect(rounds).toHaveLength(MAKE_CALL_GENERATED_ROUNDS)
    expect(rounds.length + 1).toBe(MAKE_CALL_TOTAL_ROUNDS)
    expect(new Set(rounds.map((round) => round.id)).size).toBe(rounds.length)
    expect(new Set(rounds.map((round) => round.slug)).size).toBe(rounds.length)
    expect(new Set(rounds.map((round) => round.players.map((player) => player.stablePlayerId).sort().join('|'))).size).toBe(rounds.length)
  })

  it('keeps every call positionally coherent or explicitly cross-league', () => {
    const rounds = buildMakeCallCatalogue(sourcePlayers())
    for (const round of rounds) {
      expect(round.players).toHaveLength(3)
      expect(new Set(round.players.map((player) => player.id)).size).toBe(3)
      expect(new Set(round.players.map((player) => player.positionLabel)).size).toBe(1)
      expect(round.prompt).toMatch(/START ONE\. BENCH ONE\. SELL ONE\.$/)
      expect(round.prompt.includes('CROSS-LEAGUE SHOWDOWN') || /PREMIER LEAGUE|LA LIGA|LIGUE 1/.test(round.prompt)).toBe(true)
    }
  })

  it('is deterministic so refreshes preserve votes and round links', () => {
    const players = sourcePlayers()
    expect(buildMakeCallCatalogue(players)).toEqual(buildMakeCallCatalogue([...players].reverse()))
  })
})
