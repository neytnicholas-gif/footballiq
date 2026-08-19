import { describe, expect, it } from 'vitest'
import { getMarketPriceStatus, hasVerifiedPriceMovement } from '@/lib/market/price-status'

describe('market price status', () => {
  it('does not treat isolated preview movements as verified market updates', () => {
    expect(hasVerifiedPriceMovement([
      { current_value: 12_000_000, previous_value: 10_000_000, data_source_label: 'preview valuation experiment' },
    ])).toBe(false)
  })

  it('detects a real player movement even when the visitor has no personal reveal', () => {
    expect(hasVerifiedPriceMovement([
      { current_value: 12_000_000, previous_value: 10_000_000, data_source_label: 'Sportmonks' },
    ])).toBe(true)

    expect(getMarketPriceStatus({
      previewExperimentActive: false,
      latestRevealWeek: null,
      hasVerifiedMovement: true,
    })).toMatchObject({
      title: 'Verified price movements are live',
    })
  })

  it('keeps the opening-price message when no player has moved', () => {
    expect(getMarketPriceStatus({
      previewExperimentActive: false,
      latestRevealWeek: null,
      hasVerifiedMovement: false,
    })).toMatchObject({
      title: 'Opening prices are set',
    })
  })

  it('prioritises a signed-in player reveal over the general market message', () => {
    expect(getMarketPriceStatus({
      previewExperimentActive: false,
      latestRevealWeek: 'Gameweek 1',
      hasVerifiedMovement: true,
    })).toMatchObject({
      title: 'The Gameweek 1 update is ready',
      notice: null,
    })
  })
})
