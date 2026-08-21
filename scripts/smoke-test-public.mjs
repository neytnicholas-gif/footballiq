const baseUrl = process.env.SMOKE_TEST_BASE_URL ?? 'http://127.0.0.1:3000'
const timeoutMs = Number(process.env.SMOKE_TEST_TIMEOUT_MS ?? 15_000)

if (!baseUrl.startsWith('http://127.0.0.1') && !baseUrl.startsWith('http://localhost') && process.env.SMOKE_TEST_REMOTE_APPROVED !== 'true') {
  throw new Error('Remote smoke tests require SMOKE_TEST_REMOTE_APPROVED=true.')
}

const routes = [
  '/',
  '/games',
  '/quizzes',
  '/quizzes/tactical-lab',
  '/quizzes/would-you-scout-him',
  '/quizzes/referee-decisions',
  '/quizzes/league-world',
  '/quizzes/leagues',
  '/quizzes/quiz-lab/odd-one-out',
  '/quizzes/quiz-lab/truth-trap',
  '/quizzes/quiz-lab/order-the-play',
  '/quizzes/quiz-lab/formation-fix',
  '/quizzes/quiz-lab/link-up-board',
  '/quizzes/start-bench-sell',
  '/quizzes/football-duels',
  '/quizzes/higher-or-lower',
  '/quizzes/who-am-i',
  '/quizzes/career-path',
  '/daily',
  '/predictions',
  '/leaderboard',
  '/market',
  '/market/players',
  '/market/roster',
  '/market/portfolio',
  '/market/reveal',
  '/market/rewards',
  '/market/arena',
  '/market/tools',
  '/market/leagues',
  '/market/leaderboard',
  '/academy',
  '/academy/scout',
  '/academy/scout/scout-room-player-evaluation',
  '/academy/referee',
  '/academy/referee/referee-debrief-penalty-area',
  '/how-to-play',
  '/profile',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/username',
  '/beta',
  '/pro',
  '/partners',
  '/contact',
  '/game-rules',
  '/privacy',
  '/terms',
  '/modes',
  '/offline',
  '/access-denied',
]

const results = []
const pageBodies = new Map()
let failed = false

for (const path of routes) {
  const started = performance.now()
  try {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'text/html', 'User-Agent': 'Early-Shout-public-smoke/1.0' },
    })
    const body = await response.text()
    const validHtml = response.headers.get('content-type')?.includes('text/html')
      && /<html/i.test(body)
      && !/Application error|Internal Server Error|permission denied for table/i.test(body)
    const ok = response.ok && validHtml
    failed ||= !ok
    if (ok) pageBodies.set(new URL(response.url).pathname, body)
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
    headers: { Accept: 'application/json', 'User-Agent': 'Early-Shout-public-smoke/1.0' },
  })
  const payload = await response.json()
  const competitionKeys = new Set((payload.competitions ?? []).map((competition) => competition.key))
  const valid = response.ok
    && payload.source === 'early-shout-game-price-book'
    && Array.isArray(payload.players)
    && payload.players.length === payload.playerCount
    && payload.playerCount >= 500
    && ['premier-league', 'la-liga', 'ligue-1'].every((key) => competitionKeys.has(key))
  failed ||= !valid
  results.push({ path: '/api/market/catalogue', status: response.status, ok: valid, durationMs: Math.round(performance.now() - apiStarted), playerCount: payload.playerCount ?? null })

  const sampleSlug = payload.players?.find((player) => typeof player.slug === 'string' && player.slug)?.slug
  if (sampleSlug) {
    const samplePath = `/market/player/${encodeURIComponent(sampleSlug)}`
    const started = performance.now()
    const playerResponse = await fetch(new URL(samplePath, baseUrl), {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'text/html', 'User-Agent': 'Early-Shout-public-smoke/1.0' },
    })
    const body = await playerResponse.text()
    const validPlayerPage = playerResponse.ok
      && playerResponse.headers.get('content-type')?.includes('text/html')
      && /<html/i.test(body)
      && !/Application error|Internal Server Error|permission denied for table/i.test(body)
    failed ||= !validPlayerPage
    if (validPlayerPage) pageBodies.set(new URL(playerResponse.url).pathname, body)
    results.push({ path: samplePath, status: playerResponse.status, ok: validPlayerPage, durationMs: Math.round(performance.now() - started), bytes: body.length })
  } else {
    failed = true
    results.push({ path: '/market/player/[sample]', status: null, ok: false, error: 'Catalogue did not provide a player slug.' })
  }
} catch (error) {
  failed = true
  results.push({ path: '/api/market/catalogue', status: null, ok: false, durationMs: Math.round(performance.now() - apiStarted), error: error instanceof Error ? error.message : String(error) })
}

const excludedLinkPaths = new Set(['/auth/callback'])
const internalLinks = new Set()
for (const body of pageBodies.values()) {
  for (const match of body.matchAll(/href=(?:"([^"]+)"|'([^']+)')/g)) {
    const href = (match[1] ?? match[2] ?? '').replaceAll('&amp;', '&')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue
    const url = new URL(href, baseUrl)
    if (url.origin !== new URL(baseUrl).origin || excludedLinkPaths.has(url.pathname)) continue
    internalLinks.add(`${url.pathname}${url.search}`)
  }
}

const linkFailures = []
const pendingLinks = [...internalLinks]
const linkWorkerCount = Math.min(8, pendingLinks.length)
await Promise.all(Array.from({ length: linkWorkerCount }, async () => {
  while (pendingLinks.length) {
    const path = pendingLinks.shift()
    if (!path) return
    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'text/html,application/json', 'User-Agent': 'Early-Shout-link-crawl/1.0' },
      })
      if (!response.ok) linkFailures.push({ path, status: response.status })
      await response.body?.cancel()
    } catch (error) {
      linkFailures.push({ path, status: null, error: error instanceof Error ? error.message : String(error) })
    }
  }
}))

failed ||= linkFailures.length > 0

console.log(JSON.stringify({
  baseUrl,
  checkedAt: new Date().toISOString(),
  passed: !failed,
  routeCount: results.length,
  internalLinkCount: internalLinks.size,
  linkFailures,
  results,
}, null, 2))
if (failed) process.exitCode = 1
