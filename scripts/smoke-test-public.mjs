const baseUrl = process.env.SMOKE_TEST_BASE_URL ?? 'http://127.0.0.1:3000'
const timeoutMs = Number(process.env.SMOKE_TEST_TIMEOUT_MS ?? 15_000)

if (!baseUrl.startsWith('http://127.0.0.1') && !baseUrl.startsWith('http://localhost') && process.env.SMOKE_TEST_REMOTE_APPROVED !== 'true') {
  throw new Error('Remote smoke tests require SMOKE_TEST_REMOTE_APPROVED=true.')
}

const routes = [
  '/', '/market', '/market/players', '/market/roster', '/market/reveal', '/market/rewards', '/market/arena', '/market/tools',
  '/market/leaderboard', '/quizzes', '/daily', '/leaderboard', '/game-rules', '/privacy', '/terms',
]

const results = []
let failed = false

for (const path of routes) {
  const started = performance.now()
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'text/html', 'User-Agent': 'FootballIQ-public-smoke/1.0' },
    })
    const body = await response.text()
    const validHtml = response.headers.get('content-type')?.includes('text/html')
      && /<html/i.test(body)
      && !/Application error|Internal Server Error|permission denied for table/i.test(body)
    const ok = response.ok && validHtml
    failed ||= !ok
    results.push({ path, status: response.status, ok, durationMs: Math.round(performance.now() - started), bytes: body.length })
  } catch (error) {
    failed = true
    results.push({ path, status: null, ok: false, durationMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) })
  }
}

const apiStarted = performance.now()
try {
  const response = await fetch(new URL('/api/market/catalogue', baseUrl), {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json', 'User-Agent': 'FootballIQ-public-smoke/1.0' },
  })
  const payload = await response.json()
  const competitionKeys = new Set((payload.competitions ?? []).map((competition) => competition.key))
  const valid = response.ok
    && payload.source === 'footballiq-game-price-book'
    && Array.isArray(payload.players)
    && payload.players.length === payload.playerCount
    && payload.playerCount >= 500
    && ['premier-league', 'la-liga', 'ligue-1'].every((key) => competitionKeys.has(key))
  failed ||= !valid
  results.push({ path: '/api/market/catalogue', status: response.status, ok: valid, durationMs: Math.round(performance.now() - apiStarted), playerCount: payload.playerCount ?? null })
} catch (error) {
  failed = true
  results.push({ path: '/api/market/catalogue', status: null, ok: false, durationMs: Math.round(performance.now() - apiStarted), error: error instanceof Error ? error.message : String(error) })
}

console.log(JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), passed: !failed, results }, null, 2))
if (failed) process.exitCode = 1
