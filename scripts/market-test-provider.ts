import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

type ProbeResult = {
  endpoint: string
  status: number
  ok: boolean
  providerMessage: string | null
  rateHeaders: Record<string, string>
  remainingDailyRequests: string | null
}

const BASE_URL = (process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io').trim()
const RAW_KEY = process.env.API_FOOTBALL_KEY || ''
const API_KEY = RAW_KEY.trim().replace(/^"|"$/g, '')
const TARGET_SEASON = (process.env.MARKET_TARGET_SEASON || '2026').trim()
const LEAGUE_ID = (process.env.MARKET_TARGET_LEAGUE_ID || '39').trim()
const MAX_CALLS = 5

let requestCount = 0

function buildQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) return ''
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function getProviderMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const candidate = payload as {
    message?: unknown
    error?: unknown
    errors?: unknown
  }

  if (typeof candidate.message === 'string' && candidate.message.trim().length > 0) {
    return candidate.message.trim()
  }
  if (typeof candidate.error === 'string' && candidate.error.trim().length > 0) {
    return candidate.error.trim()
  }
  if (candidate.errors && typeof candidate.errors === 'object') {
    const entries = Object.values(candidate.errors as Record<string, unknown>)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
    if (entries.length > 0) {
      return entries.join('; ')
    }
  }

  return null
}

function pickRateHeaders(response: Response): Record<string, string> {
  const picked: Record<string, string> = {}
  for (const [name, value] of response.headers.entries()) {
    const lower = name.toLowerCase()
    if (lower.includes('rate') || lower.includes('limit') || lower.includes('quota')) {
      picked[name] = value
    }
  }
  return picked
}

function getRemainingDailyRequests(headers: Record<string, string>): string | null {
  const keys = Object.keys(headers)
  const direct = keys.find((key) => key.toLowerCase().includes('remaining'))
  if (direct) return headers[direct]
  return null
}

function classify(status: number, message: string | null): string {
  const lower = (message || '').toLowerCase()

  if (status === 200) return 'ok'
  if (status === 401) return 'invalid_or_missing_key'
  if (status === 429) return 'per_minute_rate_limit'
  if (status === 400 || status === 422) return 'malformed_request'

  if (status === 403) {
    if (lower.includes('invalid api key') || lower.includes('invalid key')) {
      return 'invalid_or_missing_key'
    }
    if (lower.includes('activate') || lower.includes('not activated')) {
      return 'api_football_access_not_activated'
    }
    if (lower.includes('subscription') || lower.includes('plan')) {
      return 'subscription_block'
    }
    if (lower.includes('season')) {
      return 'season_unavailable_on_current_plan'
    }
    if (lower.includes('quota') || lower.includes('limit')) {
      return 'daily_quota_exhausted_or_limited'
    }
    return 'provider_side_denial'
  }

  if (status >= 500) return 'provider_service_error'
  return 'unknown_error'
}

async function probe(endpointPath: string, query?: Record<string, string | number | undefined>): Promise<ProbeResult> {
  if (requestCount >= MAX_CALLS) {
    throw new Error(`BLOCKED: diagnostic call budget exceeded (${MAX_CALLS})`)
  }

  requestCount += 1

  const endpoint = `${endpointPath}${buildQuery(query)}`
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'x-apisports-key': API_KEY,
    },
    cache: 'no-store',
  })

  let providerMessage: string | null = null
  try {
    const payload = (await response.json()) as unknown
    providerMessage = getProviderMessage(payload)
  } catch {
    providerMessage = null
  }

  const rateHeaders = pickRateHeaders(response)
  const remainingDailyRequests = getRemainingDailyRequests(rateHeaders)

  return {
    endpoint,
    status: response.status,
    ok: response.ok,
    providerMessage,
    rateHeaders,
    remainingDailyRequests,
  }
}

function printProbe(result: ProbeResult) {
  console.log(`endpoint=${result.endpoint}`)
  console.log(`status=${result.status}`)
  console.log(`providerMessage=${result.providerMessage ?? 'none'}`)
  console.log(`rateHeaders=${Object.keys(result.rateHeaders).length > 0 ? JSON.stringify(result.rateHeaders) : 'none'}`)
  console.log(`remainingDailyRequests=${result.remainingDailyRequests ?? 'unknown'}`)
  console.log('---')
}

async function main() {
  if (!API_KEY) {
    console.log('BLOCKED: API_FOOTBALL_KEY is missing in .env.local')
    process.exitCode = 1
    return
  }

  console.log(`baseUrl=${BASE_URL}`)
  console.log('method=GET')
  console.log('header=x-apisports-key')
  console.log(`targetLeagueId=${LEAGUE_ID}`)
  console.log(`targetSeason=${TARGET_SEASON}`)
  console.log('---')

  const summary: string[] = []

  // A. Smallest auth check
  const statusProbe = await probe('/status')
  printProbe(statusProbe)
  const statusClass = classify(statusProbe.status, statusProbe.providerMessage)

  let authValid = statusProbe.ok
  let freePlanWorks = false
  let blockedBySubscriptionOrSeason = false

  if (!statusProbe.ok && statusClass === 'invalid_or_missing_key') {
    summary.push('cause=invalid_or_missing_key')
    summary.push('authenticationValid=false')
    console.log(summary.join('\n'))
    console.log(`requestsUsed=${requestCount}`)
    process.exitCode = 1
    return
  }

  // B. Broad leagues request
  const leaguesProbe = await probe('/leagues')
  printProbe(leaguesProbe)
  if (leaguesProbe.ok) {
    authValid = true
    freePlanWorks = true
  }

  // C. Historical Premier League season probe when leagues is blocked
  let historicalProbe: ProbeResult | null = null
  if (!leaguesProbe.ok) {
    historicalProbe = await probe('/teams', { league: LEAGUE_ID, season: '2023' })
    printProbe(historicalProbe)
    const historicalClass = classify(historicalProbe.status, historicalProbe.providerMessage)

    if (historicalProbe.ok) {
      authValid = true
      freePlanWorks = true
    }

    if (
      historicalClass === 'subscription_block' ||
      historicalClass === 'season_unavailable_on_current_plan' ||
      historicalClass === 'api_football_access_not_activated' ||
      historicalClass === 'provider_side_denial'
    ) {
      blockedBySubscriptionOrSeason = true
    }
  }

  // D. Intended target season (only after auth has shown some signs of validity)
  let targetProbe: ProbeResult | null = null
  if (authValid) {
    targetProbe = await probe('/teams', { league: LEAGUE_ID, season: TARGET_SEASON })
    printProbe(targetProbe)
    const targetClass = classify(targetProbe.status, targetProbe.providerMessage)
    if (targetClass === 'subscription_block' || targetClass === 'season_unavailable_on_current_plan') {
      blockedBySubscriptionOrSeason = true
    }
  }

  // Provider season convention check with explicit league id, when calls remain.
  if (requestCount < MAX_CALLS) {
    const seasonProbe = await probe('/leagues', { id: LEAGUE_ID })
    printProbe(seasonProbe)
  }

  summary.push(`authenticationValid=${authValid}`)
  summary.push(`freePlanAccessAppearsWorking=${freePlanWorks}`)
  summary.push(`blockedBySubscriptionOrSeason=${blockedBySubscriptionOrSeason}`)
  summary.push('seasonConvention=API-Football uses season start year (e.g., 2026 means 2026/27)')

  const finalClass = classify(leaguesProbe.status, leaguesProbe.providerMessage)
  summary.push(`primaryFailureClass=${finalClass}`)

  console.log(summary.join('\n'))
  console.log(`requestsUsed=${requestCount}`)

  if (!authValid || blockedBySubscriptionOrSeason || !leaguesProbe.ok) {
    process.exitCode = 1
  }
}

void main()
