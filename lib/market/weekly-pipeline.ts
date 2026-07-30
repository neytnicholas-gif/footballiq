import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { getMarketProviderAdapter } from '@/lib/market/provider'
import { getMarketViews, setMarketWeeklyStatus } from '@/lib/market/demo-store'
import { processValuationMatch, ratingToMilli, type ValuationRules, type ValuationState } from '@/lib/market/valuation-engine'
import { MARKET_RULES } from '@/lib/market/settings'
import type {
  DataProviderAdapter,
  ProviderFixture,
  ProviderImportContext,
  ProviderPlayerMatchStats,
} from '@/lib/market/provider/types'

export type WeeklyImportOptions = {
  seasonKey: string
  dryRun: boolean
  resume: boolean
  requestDelayMs?: number
  adapterOverride?: DataProviderAdapter
  progressLogger?: (line: string) => void
}

export type WeeklyNormalizedStatRow = {
  idempotencyKey: string
  providerFixtureId: string
  providerPlayerId: string
  fixtureDate: string
  started: boolean
  minutesPlayed: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  providerRating?: number
  sourceTimestamp: string
  confidence: 'high' | 'medium' | 'low'
  eligibility: 'eligible' | 'blocked'
  reason: string
}

export type WeeklyImportReport = {
  source: string
  dryRun: boolean
  resumed: boolean
  startedAt: string
  finishedAt: string
  seasonKey: string
  fixturesProcessed: number
  playerStatRowsProcessed: number
  duplicateFixtures: number
  duplicateStatRows: number
  skippedNonCompletedFixtures: number
  blockedLowConfidenceRows: number
  requestsUsed: number
  rateLimitRetries: number
  notes: string[]
}

export type WeeklyValuationPreviewRow = {
  providerPlayerId: string
  fixtureId: string
  confidence: 'high' | 'medium' | 'low'
  eligibility: 'eligible' | 'blocked'
  reason: string
  currentValueMinor: number | null
  previousPerformanceBankMilli: number | null
  input: {
    minutesPlayed: number
    goals: number
    assists: number
    yellowCards: number
    redCards: number
    providerRating?: number
  }
  updatedBankMilli: number | null
  proposedValueMovementMinor: number | null
  proposedNewValueMinor: number | null
}

export type WeeklyValuationPreviewReport = {
  generatedAt: string
  seasonKey: string
  fixturesProcessed: number
  playerStatRowsProcessed: number
  valuationPreviewsGenerated: number
  eligibleUpdates: number
  blockedUpdates: number
  biggestProjectedRisers: WeeklyValuationPreviewRow[]
  biggestProjectedFallers: WeeklyValuationPreviewRow[]
  skippedPlayers: WeeklyValuationPreviewRow[]
  lowConfidenceData: WeeklyValuationPreviewRow[]
  unresolvedMemberships: {
    excludedReviewCount: number
    notes: string
  }
  approvalStatus: {
    approvedReviewDecisions: number
    pendingUnresolvedMemberships: number
  }
  rows: WeeklyValuationPreviewRow[]
}

type WeeklyRawArtifact = {
  generatedAt: string
  source: string
  seasonKey: string
  fixtures: ProviderFixture[]
  playerStats: ProviderPlayerMatchStats[]
}

type WeeklyProgressState = {
  version: 1
  source: string
  seasonKey: string
  startedAt: string
  updatedAt: string
  nextFixturesPage: number
  nextStatsPage: number
  fixtures: ProviderFixture[]
  playerStats: ProviderPlayerMatchStats[]
  requestsUsed: number
  rateLimitRetries: number
}

type WeeklyNormalizedArtifact = {
  generatedAt: string
  source: string
  seasonKey: string
  fixturesProcessed: number
  playerStatRowsProcessed: number
  rows: WeeklyNormalizedStatRow[]
}

const TMP_DIR = path.join(process.cwd(), 'tmp')
const RAW_FILE = path.join(TMP_DIR, 'market-weekly-raw.json')
const PROGRESS_FILE = path.join(TMP_DIR, 'market-weekly-progress.json')
const PREVIEW_FILE = path.join(TMP_DIR, 'market-weekly-preview.json')
const VALUATION_PREVIEW_FILE = path.join(TMP_DIR, 'market-weekly-valuation-preview.json')
const EXCLUDED_REVIEW_FILE = path.join(TMP_DIR, 'market-excluded-review.json')
const REVIEW_DECISIONS_FILE = path.join(TMP_DIR, 'market-import-review-decisions.json')

function nowISO(): string {
  return new Date().toISOString()
}

function valuationRules(): ValuationRules {
  return {
    baselineRatingMilli: MARKET_RULES.universalBaselineRatingMilli,
    priceStepMinor: MARKET_RULES.priceStepMinor,
    minimumPriceMinor: MARKET_RULES.minimumPriceMinor,
    maximumPriceMinor: MARKET_RULES.maximumPriceMinor,
    minimumMinutes: MARKET_RULES.minimumMinutes,
    substituteMinimumMinutes: MARKET_RULES.substituteMinimumMinutes,
    maximumWeeklyPriceChangeMinor: MARKET_RULES.maximumWeeklyPriceChangeMinor,
    calculationVersion: MARKET_RULES.valuationCalculationVersion,
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath)
  } catch {
    return null
  }
}

function normalizeFixtureRows(raw: ProviderFixture[]): {
  completed: ProviderFixture[]
  duplicateFixtures: number
  skippedNonCompletedFixtures: number
} {
  const byId = new Map<string, ProviderFixture>()
  let duplicateFixtures = 0
  let skippedNonCompletedFixtures = 0

  for (const fixture of raw) {
    if (!fixture.providerFixtureId) {
      continue
    }
    if (byId.has(fixture.providerFixtureId)) {
      duplicateFixtures += 1
      continue
    }
    byId.set(fixture.providerFixtureId, fixture)
  }

  const completed = Array.from(byId.values()).filter((fixture) => {
    const isCompleted = fixture.status === 'completed'
    if (!isCompleted) skippedNonCompletedFixtures += 1
    return isCompleted
  })

  return {
    completed,
    duplicateFixtures,
    skippedNonCompletedFixtures,
  }
}

function confidenceForRow(stat: ProviderPlayerMatchStats, fixtureCompleted: boolean): {
  confidence: 'high' | 'medium' | 'low'
  eligibility: 'eligible' | 'blocked'
  reason: string
} {
  if (!fixtureCompleted) {
    return {
      confidence: 'low',
      eligibility: 'blocked',
      reason: 'Fixture is not completed.',
    }
  }

  if (!stat.providerPlayerId || !stat.providerFixtureId) {
    return {
      confidence: 'low',
      eligibility: 'blocked',
      reason: 'Missing provider identifiers.',
    }
  }

  if (!Number.isFinite(stat.minutesPlayed) || stat.minutesPlayed < 0) {
    return {
      confidence: 'low',
      eligibility: 'blocked',
      reason: 'Invalid minutes played value.',
    }
  }

  if (typeof stat.providerRating === 'number') {
    if (stat.providerRating < 0 || stat.providerRating > 10) {
      return {
        confidence: 'low',
        eligibility: 'blocked',
        reason: 'Provider rating is outside expected range 0-10.',
      }
    }

    return {
      confidence: 'high',
      eligibility: 'eligible',
      reason: 'Completed fixture with valid rating and minutes.',
    }
  }

  return {
    confidence: 'medium',
    eligibility: 'eligible',
    reason: 'Completed fixture with no provider rating; preview remains non-fabricated.',
  }
}

function normalizeWeeklyStats(
  fixturesCompleted: ProviderFixture[],
  stats: ProviderPlayerMatchStats[],
): {
  rows: WeeklyNormalizedStatRow[]
  duplicateStatRows: number
  blockedLowConfidenceRows: number
} {
  const completedFixtureIds = new Set(fixturesCompleted.map((fixture) => fixture.providerFixtureId))
  const dedupe = new Set<string>()
  const rows: WeeklyNormalizedStatRow[] = []

  let duplicateStatRows = 0
  let blockedLowConfidenceRows = 0

  for (const stat of stats) {
    const dedupeKey = `${stat.providerFixtureId}:${stat.providerPlayerId}`
    if (dedupe.has(dedupeKey)) {
      duplicateStatRows += 1
      continue
    }
    dedupe.add(dedupeKey)

    const fixtureCompleted = completedFixtureIds.has(stat.providerFixtureId)
    const classification = confidenceForRow(stat, fixtureCompleted)

    if (classification.confidence === 'low') {
      blockedLowConfidenceRows += 1
    }

    rows.push({
      idempotencyKey: dedupeKey,
      providerFixtureId: stat.providerFixtureId,
      providerPlayerId: stat.providerPlayerId,
      fixtureDate: stat.fixtureDate,
      started: stat.started,
      minutesPlayed: stat.minutesPlayed,
      goals: stat.goals,
      assists: stat.assists,
      yellowCards: stat.yellowCards,
      redCards: stat.redCards,
      providerRating: stat.providerRating,
      sourceTimestamp: stat.providerUpdatedAt || nowISO(),
      confidence: classification.confidence,
      eligibility: classification.eligibility,
      reason: classification.reason,
    })
  }

  return {
    rows,
    duplicateStatRows,
    blockedLowConfidenceRows,
  }
}

async function loadProgressState(): Promise<WeeklyProgressState | null> {
  const progress = await readOptionalJson<WeeklyProgressState>(PROGRESS_FILE)
  if (!progress || progress.version !== 1) return null
  return progress
}

async function writeProgressState(state: WeeklyProgressState): Promise<void> {
  await writeJson(PROGRESS_FILE, state)
}

function resolveSourceMode(): 'cached' | 'provider' {
  const value = (process.env.MARKET_WEEKLY_SOURCE_MODE || 'cached').trim().toLowerCase()
  return value === 'provider' ? 'provider' : 'cached'
}

function createContext(
  dryRun: boolean,
  source: string,
  onProgress: ((line: string) => void) | undefined,
  counters: { requestsUsed: number; rateLimitRetries: number },
): ProviderImportContext {
  return {
    dryRun,
    requestedAt: nowISO(),
    source,
    onProviderRequest: (event) => {
      if (event.status === 'success') counters.requestsUsed += 1
      if (event.status === 'rate-limited') {
        counters.rateLimitRetries += 1
        onProgress?.(`Rate limited at ${event.path}; waiting ${event.waitMs ?? 0}ms.`)
      }
    },
  }
}

async function collectWeeklyRawData(options: WeeklyImportOptions): Promise<{
  raw: WeeklyRawArtifact
  resumed: boolean
  requestsUsed: number
  rateLimitRetries: number
}> {
  const adapter = options.adapterOverride ?? getMarketProviderAdapter()
  const sourceMode = resolveSourceMode()

  if (sourceMode === 'cached') {
    const cached = await readOptionalJson<WeeklyRawArtifact>(RAW_FILE)
    if (cached && cached.seasonKey === options.seasonKey) {
      options.progressLogger?.('Using cached weekly raw artifact (no provider requests).')
      return {
        raw: cached,
        resumed: false,
        requestsUsed: 0,
        rateLimitRetries: 0,
      }
    }
  }

  const counters = { requestsUsed: 0, rateLimitRetries: 0 }
  const context = createContext(options.dryRun, adapter.name, options.progressLogger, counters)

  process.env.MARKET_IMPORT_REQUEST_DELAY_MS = String(
    Number.isFinite(options.requestDelayMs ?? NaN) ? options.requestDelayMs : Number(process.env.MARKET_IMPORT_REQUEST_DELAY_MS || 7000),
  )

  const loadedProgress = options.resume ? await loadProgressState() : null
  const canResume = Boolean(
    loadedProgress && loadedProgress.source === adapter.name && loadedProgress.seasonKey === options.seasonKey,
  )

  const state: WeeklyProgressState = canResume
    ? loadedProgress!
    : {
        version: 1,
        source: adapter.name,
        seasonKey: options.seasonKey,
        startedAt: nowISO(),
        updatedAt: nowISO(),
        nextFixturesPage: 1,
        nextStatsPage: 1,
        fixtures: [],
        playerStats: [],
        requestsUsed: 0,
        rateLimitRetries: 0,
      }

  let page = state.nextFixturesPage
  while (true) {
    const fixturePage = await adapter.fetchFixtures(options.seasonKey, { page, perPage: 100 }, context)
    state.fixtures.push(...fixturePage.items)
    state.nextFixturesPage = page + 1
    state.requestsUsed = counters.requestsUsed
    state.rateLimitRetries = counters.rateLimitRetries
    state.updatedAt = nowISO()
    await writeProgressState(state)

    options.progressLogger?.(`Fetched fixtures page ${page}: ${fixturePage.items.length}`)

    if (!fixturePage.hasNextPage) break
    page += 1
  }

  const completedFixtureIds = Array.from(
    new Set(
      state.fixtures
        .filter((fixture) => fixture.status === 'completed' && fixture.providerFixtureId)
        .map((fixture) => fixture.providerFixtureId),
    ),
  )

  const completedFixtureDateMap = state.fixtures.reduce<Record<string, string>>((accumulator, fixture) => {
    if (fixture.providerFixtureId && fixture.fixtureDate) {
      accumulator[fixture.providerFixtureId] = fixture.fixtureDate
    }
    return accumulator
  }, {})

  process.env.MARKET_WEEKLY_FIXTURE_IDS = completedFixtureIds.join(',')
  process.env.MARKET_WEEKLY_FIXTURE_DATE_MAP = JSON.stringify(completedFixtureDateMap)

  page = state.nextStatsPage
  while (true) {
    const statPage = await adapter.fetchPlayerMatchStats(options.seasonKey, { page, perPage: 1000 }, context)
    state.playerStats.push(...statPage.items)
    state.nextStatsPage = page + 1
    state.requestsUsed = counters.requestsUsed
    state.rateLimitRetries = counters.rateLimitRetries
    state.updatedAt = nowISO()
    await writeProgressState(state)

    options.progressLogger?.(`Fetched player-stat page ${page}: ${statPage.items.length}`)

    if (!statPage.hasNextPage || page >= completedFixtureIds.length) break
    page += 1
  }

  const raw: WeeklyRawArtifact = {
    generatedAt: nowISO(),
    source: adapter.name,
    seasonKey: options.seasonKey,
    fixtures: state.fixtures,
    playerStats: state.playerStats,
  }

  await writeJson(RAW_FILE, raw)

  return {
    raw,
    resumed: canResume,
    requestsUsed: counters.requestsUsed,
    rateLimitRetries: counters.rateLimitRetries,
  }
}

async function readExcludedReviewCount(): Promise<number> {
  const file = await readOptionalJson<{ excludedCount?: number }>(EXCLUDED_REVIEW_FILE)
  return file?.excludedCount ?? 0
}

async function readApprovedReviewCount(): Promise<number> {
  const decisions = await readOptionalJson<{ decisions?: Record<string, unknown> }>(REVIEW_DECISIONS_FILE)
  return Object.keys(decisions?.decisions ?? {}).length
}

function pickPlayerStateByProviderId(providerPlayerId: string): ValuationState | null {
  const rows = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })
  const matched = rows.find((row) => row.player.providerPlayerId === providerPlayerId)

  if (matched) {
    return {
      playerId: providerPlayerId,
      currentPriceMinor: matched.player.currentPriceMinor,
      performanceBankMilli: matched.player.performanceBankMilli,
      weeklyMovementMinor: 0,
    }
  }

  return null
}

export async function buildWeeklyValuationPreview(
  report: WeeklyImportReport,
  normalized: WeeklyNormalizedArtifact,
): Promise<WeeklyValuationPreviewReport> {
  const rules = valuationRules()
  const processed = new Set<string>()
  const states = new Map<string, ValuationState>()
  const rows: WeeklyValuationPreviewRow[] = []

  for (const row of normalized.rows) {
    const state = states.get(row.providerPlayerId) ?? pickPlayerStateByProviderId(row.providerPlayerId)

    if (!state) {
      rows.push({
        providerPlayerId: row.providerPlayerId,
        fixtureId: row.providerFixtureId,
        confidence: 'low',
        eligibility: 'blocked',
        reason: 'Player is not currently present in staged playable market dataset.',
        currentValueMinor: null,
        previousPerformanceBankMilli: null,
        input: {
          minutesPlayed: row.minutesPlayed,
          goals: row.goals,
          assists: row.assists,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          providerRating: row.providerRating,
        },
        updatedBankMilli: null,
        proposedValueMovementMinor: null,
        proposedNewValueMinor: null,
      })
      continue
    }

    if (!states.has(row.providerPlayerId)) {
      states.set(row.providerPlayerId, state)
    }

    if (row.confidence === 'low' || row.eligibility === 'blocked') {
      rows.push({
        providerPlayerId: row.providerPlayerId,
        fixtureId: row.providerFixtureId,
        confidence: row.confidence,
        eligibility: 'blocked',
        reason: row.reason,
        currentValueMinor: state.currentPriceMinor,
        previousPerformanceBankMilli: state.performanceBankMilli,
        input: {
          minutesPlayed: row.minutesPlayed,
          goals: row.goals,
          assists: row.assists,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          providerRating: row.providerRating,
        },
        updatedBankMilli: state.performanceBankMilli,
        proposedValueMovementMinor: 0,
        proposedNewValueMinor: state.currentPriceMinor,
      })
      continue
    }

    const beforePrice = state.currentPriceMinor
    const beforeBank = state.performanceBankMilli

    const result = processValuationMatch(
      state,
      {
        statId: row.idempotencyKey,
        playerId: row.providerPlayerId,
        fixtureDate: row.fixtureDate,
        appeared: row.minutesPlayed > 0,
        started: row.started,
        minutesPlayed: row.minutesPlayed,
        ratingMilli: typeof row.providerRating === 'number' ? ratingToMilli(row.providerRating) : null,
      },
      rules,
      processed,
    )

    rows.push({
      providerPlayerId: row.providerPlayerId,
      fixtureId: row.providerFixtureId,
      confidence: row.confidence,
      eligibility: result.applied ? 'eligible' : 'blocked',
      reason: result.applied ? row.reason : `Blocked by valuation rule: ${result.skippedReason ?? 'unknown'}`,
      currentValueMinor: beforePrice,
      previousPerformanceBankMilli: beforeBank,
      input: {
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
        assists: row.assists,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
        providerRating: row.providerRating,
      },
      updatedBankMilli: result.bankAfterEventMilli,
      proposedValueMovementMinor: result.priceChangeMinor,
      proposedNewValueMinor: result.newPriceMinor,
    })
  }

  const eligible = rows.filter((row) => row.eligibility === 'eligible')
  const blocked = rows.filter((row) => row.eligibility === 'blocked')

  const byMovement = [...eligible].sort(
    (left, right) => (right.proposedValueMovementMinor ?? 0) - (left.proposedValueMovementMinor ?? 0),
  )

  const preview: WeeklyValuationPreviewReport = {
    generatedAt: nowISO(),
    seasonKey: report.seasonKey,
    fixturesProcessed: report.fixturesProcessed,
    playerStatRowsProcessed: report.playerStatRowsProcessed,
    valuationPreviewsGenerated: rows.length,
    eligibleUpdates: eligible.length,
    blockedUpdates: blocked.length,
    biggestProjectedRisers: byMovement.filter((row) => (row.proposedValueMovementMinor ?? 0) > 0).slice(0, 25),
    biggestProjectedFallers: [...byMovement].reverse().filter((row) => (row.proposedValueMovementMinor ?? 0) < 0).slice(0, 25),
    skippedPlayers: blocked.slice(0, 100),
    lowConfidenceData: blocked.filter((row) => row.confidence === 'low').slice(0, 100),
    unresolvedMemberships: {
      excludedReviewCount: await readExcludedReviewCount(),
      notes: 'Unresolved memberships remain excluded from playable dataset until approved in admin review.',
    },
    approvalStatus: {
      approvedReviewDecisions: await readApprovedReviewCount(),
      pendingUnresolvedMemberships: 0,
    },
    rows,
  }

  preview.approvalStatus.pendingUnresolvedMemberships = Math.max(
    preview.unresolvedMemberships.excludedReviewCount - preview.approvalStatus.approvedReviewDecisions,
    0,
  )

  await writeJson(VALUATION_PREVIEW_FILE, preview)
  return preview
}

export async function runWeeklyImportDry(options: WeeklyImportOptions): Promise<{
  report: WeeklyImportReport
  normalized: WeeklyNormalizedArtifact
  valuationPreview: WeeklyValuationPreviewReport
}> {
  const startedAt = nowISO()
  const collection = await collectWeeklyRawData(options)

  const fixtureSummary = normalizeFixtureRows(collection.raw.fixtures)
  const normalizedStats = normalizeWeeklyStats(fixtureSummary.completed, collection.raw.playerStats)

  const normalized: WeeklyNormalizedArtifact = {
    generatedAt: nowISO(),
    source: collection.raw.source,
    seasonKey: options.seasonKey,
    fixturesProcessed: fixtureSummary.completed.length,
    playerStatRowsProcessed: normalizedStats.rows.length,
    rows: normalizedStats.rows,
  }

  await writeJson(PREVIEW_FILE, normalized)

  const report: WeeklyImportReport = {
    source: collection.raw.source,
    dryRun: true,
    resumed: collection.resumed,
    startedAt,
    finishedAt: nowISO(),
    seasonKey: options.seasonKey,
    fixturesProcessed: fixtureSummary.completed.length,
    playerStatRowsProcessed: normalizedStats.rows.length,
    duplicateFixtures: fixtureSummary.duplicateFixtures,
    duplicateStatRows: normalizedStats.duplicateStatRows,
    skippedNonCompletedFixtures: fixtureSummary.skippedNonCompletedFixtures,
    blockedLowConfidenceRows: normalizedStats.blockedLowConfidenceRows,
    requestsUsed: collection.requestsUsed,
    rateLimitRetries: collection.rateLimitRetries,
    notes: [
      'Dry-run only: no database writes were performed.',
      'Raw and normalized datasets are stored separately under tmp/.',
      'No missing provider ratings were fabricated.',
    ],
  }

  const valuationPreview = await buildWeeklyValuationPreview(report, normalized)

  setMarketWeeklyStatus({
    lastValuationAt: report.finishedAt,
    lastFixtureProcessedAt: report.fixturesProcessed > 0 ? report.finishedAt : null,
    queuedFixtures: 0,
    message: `weekly-dry-run fixtures=${report.fixturesProcessed}, stats=${report.playerStatRowsProcessed}, blocked=${report.blockedLowConfidenceRows}`,
    dryRun: true,
    source: report.source,
  })

  return {
    report,
    normalized,
    valuationPreview,
  }
}

export async function loadWeeklyValuationPreviewFromFile(): Promise<WeeklyValuationPreviewReport | null> {
  return readOptionalJson<WeeklyValuationPreviewReport>(VALUATION_PREVIEW_FILE)
}

export const WEEKLY_PIPELINE_FILES = {
  raw: RAW_FILE,
  progress: PROGRESS_FILE,
  normalizedPreview: PREVIEW_FILE,
  valuationPreview: VALUATION_PREVIEW_FILE,
}
