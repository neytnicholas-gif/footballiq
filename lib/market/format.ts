export const MARKET_CREDITS_STARTING_BALANCE = 100_000_000
export const MARKET_MAX_PORTFOLIO_SIZE = 11
export const MARKET_DAILY_BUY_LIMIT = 3
export const MARKET_DAILY_SELL_LIMIT = 3

export function formatFiqCompact(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  const millions = safe / 1_000_000
  return `${millions.toFixed(1)}m FIQ`
}

export function formatFiqLong(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe.toLocaleString()} FootballIQ Credits`
}

export function formatChange(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  const sign = safe > 0 ? '+' : ''
  return `${sign}${safe.toLocaleString()}`
}

export function toUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function createMarketRequestKey(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
