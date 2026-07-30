const MONEY_SCALE = 10
const BPS_SCALE = 10000

export function parseMoneyToMinor(value: string | number): number {
  const text = typeof value === 'number' ? value.toFixed(3) : value.trim()
  const match = text.match(/^(-)?(\d+)(?:\.(\d+))?$/)
  if (!match) throw new Error(`Invalid money value: ${value}`)
  const sign = match[1] ? -1 : 1
  const whole = Number(match[2])
  const fracRaw = (match[3] ?? '').padEnd(1, '0').slice(0, 1)
  const frac = Number(fracRaw)
  return sign * (whole * MONEY_SCALE + frac)
}

export function formatMinorToMoney(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const absolute = Math.abs(minor)
  const whole = Math.floor(absolute / MONEY_SCALE)
  const fraction = absolute % MONEY_SCALE
  return `${sign}${whole}.${fraction.toString().padStart(1, '0')}`
}

export function percentageReturnBps(currentMinor: number, baselineMinor: number): number {
  if (baselineMinor <= 0) return 0
  return Math.trunc(((currentMinor - baselineMinor) * BPS_SCALE) / baselineMinor)
}

export function formatBpsToPercent(bps: number): string {
  const sign = bps < 0 ? '-' : ''
  const absolute = Math.abs(bps)
  const whole = Math.floor(absolute / 100)
  const fraction = absolute % 100
  return `${sign}${whole}.${fraction.toString().padStart(2, '0')}%`
}

export function formatSignedMinor(minor: number): string {
  const prefix = minor > 0 ? '+' : ''
  return `${prefix}${formatMinorToMoney(minor)}`
}
