import { setTimeout as delay } from 'node:timers/promises'

const baseUrl = process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:3000'
const concurrency = Math.min(Number(process.env.LOAD_TEST_CONCURRENCY ?? 25), 200)
const durationSeconds = Math.min(Number(process.env.LOAD_TEST_DURATION_SECONDS ?? 20), 120)
const maxRequests = Math.min(Number(process.env.LOAD_TEST_MAX_REQUESTS ?? 500), 5_000)
const maxErrorRatePct = Number(process.env.LOAD_TEST_MAX_ERROR_RATE_PCT ?? 0.5)
const maxP95Ms = Number(process.env.LOAD_TEST_MAX_P95_MS ?? 2_000)
const minimumPlayerCount = Number(process.env.LOAD_TEST_MIN_PLAYER_COUNT ?? 500)
const target = new URL('/api/market/catalogue', baseUrl).toString()

if (!target.startsWith('http://127.0.0.1') && !target.startsWith('http://localhost') && process.env.LOAD_TEST_REMOTE_APPROVED !== 'true') {
  throw new Error('Remote load tests require LOAD_TEST_REMOTE_APPROVED=true.')
}
if (!Number.isFinite(concurrency) || concurrency < 1 || !Number.isFinite(durationSeconds) || durationSeconds < 1) {
  throw new Error('Concurrency and duration must be positive numbers.')
}
if (![maxErrorRatePct, maxP95Ms, minimumPlayerCount].every(Number.isFinite)) {
  throw new Error('Load-test thresholds must be valid numbers.')
}

const deadline = Date.now() + durationSeconds * 1000
const latencies = []
const statuses = new Map()
let bytes = 0
let errors = 0
let claimedRequests = 0
let invalidPayloads = 0
let minimumObservedPlayerCount = Number.POSITIVE_INFINITY
const cacheStatuses = new Map()

async function worker() {
  while (Date.now() < deadline) {
    if (claimedRequests >= maxRequests) return
    claimedRequests += 1
    const started = performance.now()
    try {
      const response = await fetch(target, {
        headers: { Accept: 'application/json', 'User-Agent': 'EarlyShout-capacity-check/1.0' },
      })
      const body = await response.arrayBuffer()
      latencies.push(performance.now() - started)
      bytes += body.byteLength
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1)
      const cacheStatus = response.headers.get('x-vercel-cache') ?? 'unknown'
      cacheStatuses.set(cacheStatus, (cacheStatuses.get(cacheStatus) ?? 0) + 1)
      if (response.ok) {
        try {
          const payload = JSON.parse(new TextDecoder().decode(body))
          const playerCount = Number(payload.playerCount)
          const valid = payload.source === 'early-shout-game-price-book'
            && Array.isArray(payload.players)
            && payload.players.length === playerCount
            && playerCount >= minimumPlayerCount
          if (!valid) invalidPayloads += 1
          else minimumObservedPlayerCount = Math.min(minimumObservedPlayerCount, playerCount)
        } catch {
          invalidPayloads += 1
        }
      }
    } catch {
      errors += 1
    }
    await delay(0)
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()))
latencies.sort((a, b) => a - b)

const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0
const requests = latencies.length + errors
const errorRatePct = Number(((errors / Math.max(1, requests)) * 100).toFixed(3))
const report = {
  target,
  concurrency,
  durationSeconds,
  maxRequests,
  requests,
  requestsPerSecond: Number((requests / durationSeconds).toFixed(2)),
  statuses: Object.fromEntries(statuses),
  cacheStatuses: Object.fromEntries(cacheStatuses),
  errors,
  invalidPayloads,
  minimumObservedPlayerCount: Number.isFinite(minimumObservedPlayerCount) ? minimumObservedPlayerCount : null,
  errorRatePct,
  latencyMs: {
    p50: Number(percentile(0.5).toFixed(1)),
    p95: Number(percentile(0.95).toFixed(1)),
    p99: Number(percentile(0.99).toFixed(1)),
    max: Number((latencies.at(-1) ?? 0).toFixed(1)),
  },
  transferredMiB: Number((bytes / 1024 / 1024).toFixed(2)),
}

console.log(JSON.stringify(report, null, 2))
const failed = errorRatePct > maxErrorRatePct
  || invalidPayloads > 0
  || percentile(0.95) > maxP95Ms
  || [...statuses.keys()].some((status) => status < 200 || status >= 400)
if (failed) process.exitCode = 1
