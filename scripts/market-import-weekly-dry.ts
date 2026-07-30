import { loadEnvConfig } from '@next/env'
import { runWeeklyImportDry, WEEKLY_PIPELINE_FILES } from '../lib/market/weekly-pipeline'

loadEnvConfig(process.cwd())

async function main() {
  try {
    const seasonKey = process.env.MARKET_TARGET_SEASON
      ? `season-${process.env.MARKET_TARGET_SEASON.trim()}`
      : 'season-2026'

    const result = await runWeeklyImportDry({
      seasonKey,
      dryRun: true,
      resume: false,
      progressLogger: (line) => console.log(line),
    })

    console.log(`PASS: weekly dry-run import finished for ${seasonKey}`)
    console.log(`RESULT: fixturesProcessed=${result.report.fixturesProcessed}`)
    console.log(`RESULT: playerStatRowsProcessed=${result.report.playerStatRowsProcessed}`)
    console.log(`RESULT: blockedLowConfidenceRows=${result.report.blockedLowConfidenceRows}`)
    console.log(`RESULT: valuationPreviewsGenerated=${result.valuationPreview.valuationPreviewsGenerated}`)
    console.log(`RESULT: eligibleUpdates=${result.valuationPreview.eligibleUpdates}`)
    console.log(`RESULT: blockedUpdates=${result.valuationPreview.blockedUpdates}`)
    console.log(`RESULT: requestsUsed=${result.report.requestsUsed}`)
    console.log(`RESULT: rateLimitRetries=${result.report.rateLimitRetries}`)
    console.log(`PASS: raw artifact=${WEEKLY_PIPELINE_FILES.raw}`)
    console.log(`PASS: normalized preview=${WEEKLY_PIPELINE_FILES.normalizedPreview}`)
    console.log(`PASS: valuation preview=${WEEKLY_PIPELINE_FILES.valuationPreview}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown weekly import error'
    if (message.startsWith('BLOCKED:')) {
      console.log(message)
    } else {
      console.log(`ERROR: ${message}`)
    }
    process.exitCode = 1
  }
}

void main()
