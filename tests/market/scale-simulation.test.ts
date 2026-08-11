import { describe, expect, it } from 'vitest'
import { calculateBankedPerformanceMovement, VALUE_CEILING, VALUE_FLOOR, VALUE_INCREMENT } from '@/lib/market/real-valuation'
import type { MarketPosition } from '@/lib/market/types'

type SimPlayer = { id: number; position: MarketPosition; value: number; bank: number; weekMovement: number }

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('10,000-portfolio launch arithmetic simulation', () => {
  it('preserves portfolio, price, residual-bank and formation invariants across eight gameweeks', () => {
    const rng = random(20_260_811)
    const positions: MarketPosition[] = ['GK', 'DEF', 'MID', 'FWD']
    const players: SimPlayer[] = Array.from({ length: 1_201 }, (_, id) => ({
      id,
      position: positions[id % positions.length]!,
      value: VALUE_FLOOR + Math.floor(rng() * 111) * VALUE_INCREMENT,
      bank: 0,
      weekMovement: 0,
    }))
    const pools = new Map(positions.map((position) => [position, players.filter((player) => player.position === position)]))
    const shape: Array<[MarketPosition, number]> = [['GK', 1], ['DEF', 4], ['MID', 3], ['FWD', 3]]
    const portfolios = Array.from({ length: 10_000 }, () => shape.flatMap(([position, count]) => {
      const pool = pools.get(position)!
      const start = Math.floor(rng() * pool.length)
      return Array.from({ length: count }, (_, offset) => pool[(start + offset) % pool.length]!.id)
    }))

    let formationViolations = 0
    for (const roster of portfolios) {
      const counts = shape.map(([position]) => roster.filter((id) => players[id]!.position === position).length)
      if (roster.length !== 11 || new Set(roster).size !== 11 || counts.join(',') !== '1,4,3,3') formationViolations += 1
    }
    expect(formationViolations).toBe(0)

    let valuationViolations = 0
    let reconciliationViolations = 0
    for (let week = 1; week <= 8; week += 1) {
      const before = portfolios.map((roster) => roster.reduce((sum, id) => sum + players[id]!.value, 0))
      for (const player of players) {
        player.weekMovement = 0
        const appearances = rng() < 0.12 ? 0 : rng() < 0.08 ? 2 : 1
        for (let appearance = 0; appearance < appearances; appearance += 1) {
          const ratingDeltaMilli = Math.round((rng() * 1_800) - 900)
          const previousBank = player.bank
          const previousValue = player.value
          const result = calculateBankedPerformanceMovement({
            ratingDeltaMilli, previousBankMilli: previousBank,
            rollingWeekMovement: player.weekMovement, currentValue: previousValue,
          })
          const boundedSignal = Math.max(-660, Math.min(660, ratingDeltaMilli))
          const appliedSteps = (result.newValue - previousValue) / VALUE_INCREMENT
          if (result.bankAfterEventMilli + appliedSteps * 220 !== previousBank + boundedSignal
            || result.newValue < VALUE_FLOOR || result.newValue > VALUE_CEILING
            || result.newValue % VALUE_INCREMENT !== 0) valuationViolations += 1
          player.value = result.newValue
          player.bank = result.bankAfterEventMilli
          player.weekMovement += result.movement
        }
        if (Math.abs(player.weekMovement) > 600_000) valuationViolations += 1
      }

      portfolios.forEach((roster, index) => {
        const after = roster.reduce((sum, id) => sum + players[id]!.value, 0)
        if (after - before[index]! !== roster.reduce((sum, id) => sum + players[id]!.weekMovement, 0)) reconciliationViolations += 1
      })
    }
    expect(valuationViolations).toBe(0)
    expect(reconciliationViolations).toBe(0)
  })
})
