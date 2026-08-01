const BRUSSELS_TIME_ZONE = 'Europe/Brussels'

const brusselsDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRUSSELS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const brusselsWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BRUSSELS_TIME_ZONE,
  weekday: 'short',
})

const brusselsDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRUSSELS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const brusselsLongDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BRUSSELS_TIME_ZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const weekdayIndex: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

function formatParts(formatter: Intl.DateTimeFormat, value: Date) {
  return Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

export function getBrusselsDateISO(value: Date | string = new Date()) {
  const map = formatParts(brusselsDateFormatter, toDate(value))
  return `${map.year}-${map.month}-${map.day}`
}

export function shiftIsoDate(isoDate: string, dayDelta: number) {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part))
  const shifted = new Date(Date.UTC(year, month - 1, day + dayDelta))
  return shifted.toISOString().slice(0, 10)
}

export function getBrusselsWeekStartISO(value: Date | string = new Date()) {
  const date = toDate(value)
  const dayLabel = brusselsWeekdayFormatter.format(date)
  const offset = weekdayIndex[dayLabel]
  const today = getBrusselsDateISO(date)
  return shiftIsoDate(today, -offset)
}

export function getBrusselsMonthStartISO(value: Date | string = new Date()) {
  const today = getBrusselsDateISO(value)
  return `${today.slice(0, 7)}-01`
}

function getBrusselsOffsetMinutes(value: Date) {
  const parts = formatParts(brusselsDateTimeFormatter, value)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return Math.round((asUtc - value.getTime()) / 60_000)
}

export function getBrusselsDateStartUtcIso(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map((part) => Number(part))
  let utcTime = Date.UTC(year, month - 1, day, 0, 0, 0)

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offsetMinutes = getBrusselsOffsetMinutes(new Date(utcTime))
    utcTime = Date.UTC(year, month - 1, day, 0, 0, 0) - (offsetMinutes * 60_000)
  }

  return new Date(utcTime).toISOString()
}

export function getBrusselsPeriodStartUtcIso(
  period: 'daily' | 'weekly' | 'monthly',
  value: Date | string = new Date(),
) {
  const periodDate =
    period === 'daily'
      ? getBrusselsDateISO(value)
      : period === 'weekly'
        ? getBrusselsWeekStartISO(value)
        : getBrusselsMonthStartISO(value)

  return getBrusselsDateStartUtcIso(periodDate)
}

export function formatBrusselsDateLong(value: Date | string = new Date()) {
  return brusselsLongDateFormatter.format(toDate(value))
}

export function isSameBrusselsDay(left: Date | string, right: Date | string) {
  return getBrusselsDateISO(left) === getBrusselsDateISO(right)
}

export function isSameBrusselsWeek(left: Date | string, right: Date | string) {
  return getBrusselsWeekStartISO(left) === getBrusselsWeekStartISO(right)
}

export function isSameBrusselsMonth(left: Date | string, right: Date | string) {
  return getBrusselsMonthStartISO(left) === getBrusselsMonthStartISO(right)
}
