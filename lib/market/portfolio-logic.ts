import { MARKET_RULES } from './settings'

export type ValidateBuyInput = {
  holdingsCount: number
  purchasesToday: number
  balanceMinor: number
  playerPriceMinor: number
  alreadyOwned: boolean
}

export function validateBuyConstraints(input: ValidateBuyInput): { ok: true } | { ok: false; code: string } {
  if (input.alreadyOwned) return { ok: false, code: 'ALREADY_OWNED' }
  if (input.holdingsCount >= MARKET_RULES.maximumHoldings) return { ok: false, code: 'MAX_HOLDINGS' }
  if (input.purchasesToday >= MARKET_RULES.maximumDailyPurchases) return { ok: false, code: 'DAILY_PURCHASE_LIMIT' }
  if (input.balanceMinor < input.playerPriceMinor) return { ok: false, code: 'INSUFFICIENT_BALANCE' }
  return { ok: true }
}

export type ValidateSellInput = {
  salesToday: number
  ownsPlayer: boolean
}

export function validateSellConstraints(input: ValidateSellInput): { ok: true } | { ok: false; code: string } {
  if (!input.ownsPlayer) return { ok: false, code: 'NOT_OWNED' }
  if (input.salesToday >= MARKET_RULES.maximumDailySales) return { ok: false, code: 'DAILY_SALE_LIMIT' }
  return { ok: true }
}

export function isAuthorizedPortfolioAccess(requestUserId: string, portfolioUserId: string): boolean {
  return requestUserId === portfolioUserId
}
