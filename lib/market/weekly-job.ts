import { getMarketProviderAdapter } from '@/lib/market/provider'
import { setMarketWeeklyStatus } from '@/lib/market/demo-store'
import { MARKET_RULES } from '@/lib/market/settings'
import {
  processValuationMatch,
  ratingToMilli,
  type ValuationRules,
  type ValuationState,
} from '@/lib/market/valuation-engine'
import type { ImportReport } from '@/lib/market/provider/types'

type WeeklyRunInput = {
  seasonKey: string
  dryRun: boolean
  runKey: string
}

type WeeklyRunReport = {
  runKey: string
  dryRun: boolean
  startedAt: string
  finishedAt: string
  importedFixtures: number
  importedStats: number
  processedValuations: number
  skippedSuspicious: number
  skippedDuplicates: number
  notes: string[]
  errors: string[]
}

const activeRuns = new Set<string>()

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

export async function runWeeklyMarketProcessing(input: WeeklyRunInput): Promise<WeeklyRunReport> {
  if (activeRuns.has(input.runKey)) {
    throw new Error(`Run key already in progress: ${input.runKey}`)
  }

  activeRuns.add(input.runKey)

  const startedAt = nowISO()
  const adapter = getMarketProviderAdapter()

  const errors: string[] = []
  const notes: string[] = []

  let importedFixtures = 0
  let importedStats = 0
  let processedValuations = 0
  let skippedSuspicious = 0
  let skippedDuplicates = 0

  const processedStatIds = new Set<string>()

  try {
    const fixtures = await adapter.fetchFixtures(
      input.seasonKey,
      { page: 1, perPage: 500 },
      { dryRun: input.dryRun, requestedAt: startedAt, source: adapter.name },
    )
    importedFixtures = fixtures.items.length

    const stats = await adapter.fetchPlayerMatchStats(
      input.seasonKey,
      { page: 1, perPage: 1000 },
      { dryRun: input.dryRun, requestedAt: startedAt, source: adapter.name },
    )
    importedStats = stats.items.length

    const rules = valuationRules()

    const playerStates = new Map<string, ValuationState>()

    for (const stat of stats.items) {
      if (typeof stat.providerRating !== 'number' || stat.providerRating < 0 || stat.providerRating > 10) {
        skippedSuspicious += 1
        continue
      }

      const existingState = playerStates.get(stat.providerPlayerId)
      const state =
        existingState ??
        {
          playerId: stat.providerPlayerId,
          currentPriceMinor: 100,
          performanceBankMilli: 0,
          weeklyMovementMinor: 0,
        }

      if (!existingState) {
        playerStates.set(stat.providerPlayerId, state)
      }

      const result = processValuationMatch(
        state,
        {
          statId: `${stat.providerPlayerId}:${stat.providerFixtureId}`,
          playerId: stat.providerPlayerId,
          fixtureDate: stat.fixtureDate,
          appeared: stat.minutesPlayed > 0,
          started: stat.started,
          minutesPlayed: stat.minutesPlayed,
          ratingMilli: ratingToMilli(stat.providerRating),
        },
        rules,
        processedStatIds,
      )

      if (!result.applied && result.skippedReason === 'duplicate') {
        skippedDuplicates += 1
      }
      if (result.applied) {
        processedValuations += 1
      }
    }

    notes.push('Weekly run is prepared as callable server-side job and can be scheduler-triggered after deployment approval.')
    if (input.dryRun) {
      notes.push('Dry-run mode active: no persistent writes were attempted.')
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown weekly run error')
  } finally {
    activeRuns.delete(input.runKey)
  }

  const finishedAt = nowISO()

  setMarketWeeklyStatus({
    lastValuationAt: finishedAt,
    lastFixtureProcessedAt: importedFixtures > 0 ? finishedAt : null,
    queuedFixtures: Math.max(importedFixtures - importedStats, 0),
    message: `Fixtures=${importedFixtures}, stats=${importedStats}, processed=${processedValuations}, errors=${errors.length}`,
    dryRun: input.dryRun,
    source: adapter.name,
  })

  return {
    runKey: input.runKey,
    dryRun: input.dryRun,
    startedAt,
    finishedAt,
    importedFixtures,
    importedStats,
    processedValuations,
    skippedSuspicious,
    skippedDuplicates,
    notes,
    errors,
  }
}

export function weeklyReportToImportReport(report: WeeklyRunReport): ImportReport {
  return {
    source: 'weekly-processing',
    dryRun: report.dryRun,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    imported: {
      competitions: 0,
      seasons: 0,
      clubs: 0,
      squads: 0,
      fixtures: report.importedFixtures,
      matchStats: report.importedStats,
    },
    skipped: {
      unresolvedPlayers: 0,
      duplicates: report.skippedDuplicates,
      suspiciousRecords: report.skippedSuspicious,
      records: report.skippedDuplicates + report.skippedSuspicious,
    },
    issues: report.errors.map((message) => ({ code: 'WEEKLY_RUN_ERROR', message })),
    notes: report.notes,
  }
}
