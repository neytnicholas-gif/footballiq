import { describe, expect, it } from 'vitest'
import { validateOpeningPriceBook, type OpeningPriceBookPlayer } from '@/lib/market/opening-price-validation'
import type { MarketPosition } from '@/lib/market/types'

function group(position: MarketPosition, count: number, minimum: number, points: number): OpeningPriceBookPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    position,
    openingValue: minimum + (index % points) * 100_000,
    confidence: 'established' as const,
  }))
}

function healthyBook() {
  return [
    ...group('GK', 120, 4_700_000, 36),
    ...group('DEF', 400, 4_700_000, 56),
    ...group('MID', 330, 4_700_000, 74),
    ...group('FWD', 310, 4_700_000, 74),
  ]
}

describe('opening-price publication guardrails', () => {
  it('audits every position before publishing a catalogue', () => {
    const audit = validateOpeningPriceBook(healthyBook())
    expect(audit.players).toBe(1_160)
    expect(audit.positionAudit.GK.players).toBe(120)
    expect(audit.positionAudit.DEF.distinctValues).toBeGreaterThanOrEqual(25)
    expect(audit.positionAudit.MID.spread).toBeGreaterThanOrEqual(2_000_000)
    expect(audit.positionAudit.FWD.maximum).toBeGreaterThanOrEqual(10_000_000)
  })

  it('rejects a structurally compressed position even when the full book looks varied', () => {
    const book = healthyBook().map((player) => player.position === 'GK' ? { ...player, openingValue: 6_000_000 } : player)
    expect(() => validateOpeningPriceBook(book)).toThrow('GK prices are too compressed')
  })
})
