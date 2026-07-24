export const DAILY_TIMEZONE = 'Europe/Brussels'

type BrusselsParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getBrusselsParts(date = new Date()): BrusselsParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

export function getBrusselsDateKey(date = new Date()) {
  const p = getBrusselsParts(date)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function getBrusselsDisplayDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getDailySeedFromKey(key: string) {
  return Number(key.replaceAll('-', '')) || 1
}

export function getSecondsUntilBrusselsMidnight(date = new Date()) {
  const p = getBrusselsParts(date)
  const currentPseudo = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  const nextMidnightPseudo = Date.UTC(p.year, p.month - 1, p.day + 1, 0, 0, 0)
  return Math.max(0, Math.floor((nextMidnightPseudo - currentPseudo) / 1000))
}

export function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
