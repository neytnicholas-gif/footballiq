import { beforeEach, describe, expect, it } from 'vitest'
import {
  anonymousApplySimulatedMatchweek,
  anonymousBuyPlayer,
  anonymousSellPlayer,
  anonymousToggleWatchlist,
  createDefaultAnonymousState,
  readAnonymousState,
  writeAnonymousState,
} from '@/lib/market/anonymous-state'
import { buildSampleMarketPlayers } from '@/lib/market/sample-data'

describe('anonymous market state', () => {
  const players = buildSampleMarketPlayers()
  const storageKey = 'fiq-market-anon-v1'

  beforeEach(() => {
    window.localStorage.clear()
    writeAnonymousState(createDefaultAnonymousState())
  })

  it('initializes with versioned default state', () => {
    const state = readAnonymousState()
    expect(state.version).toBe(1)
    expect(state.cash).toBeGreaterThan(0)
    expect(state.holdings).toHaveLength(0)
  })

  it('ignores invalid serialized state', () => {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 999 }))
    const state = readAnonymousState()
    expect(state.version).toBe(1)
    expect(state.holdings).toHaveLength(0)
  })

  it('persists and reloads anonymous state', () => {
    const state = readAnonymousState()
    state.cash = 123.45
    writeAnonymousState(state)

    const loaded = readAnonymousState()
    expect(loaded.cash).toBeCloseTo(123.45, 5)
  })

  it('buys and sells with cash + duplicate validation', () => {
    const slug = players[0].slug
    const buy = anonymousBuyPlayer(players, slug, 'buy-1')
    expect(buy.error).toBeNull()
    expect(buy.data?.ok).toBe(true)

    const dup = anonymousBuyPlayer(players, slug, 'buy-2')
    expect(dup.data).toBeNull()
    expect(String(dup.error?.message).toLowerCase()).toContain('already')

    const sell = anonymousSellPlayer(players, slug, 'sell-1')
    expect(sell.error).toBeNull()
    expect(sell.data?.ok).toBe(true)

    const sellAgain = anonymousSellPlayer(players, slug, 'sell-2')
    expect(sellAgain.data).toBeNull()
    expect(String(sellAgain.error?.message).toLowerCase()).toContain('do not hold')
  })

  it('enforces budget constraints', () => {
    const state = readAnonymousState()
    state.cash = 1
    writeAnonymousState(state)

    const buy = anonymousBuyPlayer(players, players[0].slug, 'budget-1')
    expect(buy.data).toBeNull()
    expect(String(buy.error?.message).toLowerCase()).toContain('cash')
  })

  it('simulates a matchweek and blocks duplicate week simulation', () => {
    const state = readAnonymousState()
    state.cash = 300_000_000
    writeAnonymousState(state)

    const gk = players.find((p) => p.position === 'GK')
    const defs = players.filter((p) => p.position === 'DEF').slice(0, 4)
    const mids = players.filter((p) => p.position === 'MID').slice(0, 3)
    const fwds = players.filter((p) => p.position === 'FWD').slice(0, 3)
    const starters = [gk, ...defs, ...mids, ...fwds]

    for (const p of starters) {
      expect(p).toBeDefined()
      const res = anonymousBuyPlayer(players, p!.slug, `starter-${p!.id}`)
      expect(res.error).toBeNull()
      expect(res.data?.ok).toBe(true)
    }

    const first = anonymousApplySimulatedMatchweek(
      players,
      'MW1',
      [{ player_id: players[0].id, new_value: players[0].current_value + 100_000, rating: 7.8, minutes_played: 90, confidence_score: 0.9 }],
    )
    expect(first.error).toBeNull()
    expect(first.data?.ok).toBe(true)

    const second = anonymousApplySimulatedMatchweek(players, 'MW1', [])
    expect(second.data).toBeNull()
    expect(String(second.error?.message).toLowerCase()).toContain('already')
  })

  it('toggles watchlist state', () => {
    const player = players[0]
    const first = anonymousToggleWatchlist(player.slug, players)
    expect(first.error).toBeNull()
    expect(first.data?.watchlisted).toBe(true)

    const second = anonymousToggleWatchlist(player.slug, players)
    expect(second.error).toBeNull()
    expect(second.data?.watchlisted).toBe(false)
  })
})
