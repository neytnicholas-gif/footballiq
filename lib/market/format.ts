export const MARKET_CREDITS_STARTING_BALANCE = 100_000_000
export const MARKET_MAX_PORTFOLIO_SIZE = 11
export const MARKET_WEEKLY_SIGNING_LIMIT = 11

export function formatFiqCompact(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  const millions = safe / 1_000_000
  return `${millions.toFixed(1)}m VX`
}

export function formatFiqLong(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return `${safe.toLocaleString()} VX Credits`
}

export function formatChange(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  const sign = safe > 0 ? '+' : ''
  return `${sign}${safe.toLocaleString()}`
}

export function toUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function formatMarketDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unavailable'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Brussels',
  }).format(date)
}

export function toUtcIsoWeekKey(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = value.getUTCDay() || 7
  value.setUTCDate(value.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function createMarketRequestKey(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
