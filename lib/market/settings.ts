import type { MarketSettings } from '@/lib/market/types'

export const MARKET_RULES: MarketSettings = {
  activeSeasonId: 'demo-2026-27',
  startingBalanceMinor: 1200,
  maximumHoldings: 5,
  maximumDailyPurchases: 3,
  maximumDailySales: 3,
  universalBaselineRatingMilli: 7000,
  minimumMinutes: 25,
  substituteMinimumMinutes: 20,
  priceStepMinor: 1,
  minimumPriceMinor: 10,
  maximumPriceMinor: 200,
  maximumWeeklyPriceChangeMinor: 8,
  valuationCalculationVersion: 'v1.0.0',
  weeklyUpdateDay: 1,
  fiqCurrencyLabel: 'FIQ',
}

export const MARKET_COPY = {
  demoLabel: 'Development data',
  noLiveData: 'Development season dataset only (not 2026/27 production data)',
  noCashValue: 'FIQ currency is virtual and has no real-world monetary value.',
}

export function currentMarketDateISO(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
