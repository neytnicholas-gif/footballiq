import { loadEnvConfig } from '@next/env'
import { WEEKLY_PIPELINE_FILES, loadWeeklyValuationPreviewFromFile } from '../lib/market/weekly-pipeline'

loadEnvConfig(process.cwd())

async function main() {
  try {
    const preview = await loadWeeklyValuationPreviewFromFile()

    if (!preview) {
      console.log('BLOCKED: weekly valuation preview file is missing. Run npm run market:import-weekly:dry first.')
      process.exitCode = 1
      return
    }

    console.log('PASS: weekly valuation preview loaded')
    console.log(`RESULT: fixturesProcessed=${preview.fixturesProcessed}`)
    console.log(`RESULT: playerStatRowsProcessed=${preview.playerStatRowsProcessed}`)
    console.log(`RESULT: valuationPreviewsGenerated=${preview.valuationPreviewsGenerated}`)
    console.log(`RESULT: eligibleUpdates=${preview.eligibleUpdates}`)
    console.log(`RESULT: blockedUpdates=${preview.blockedUpdates}`)
    console.log(`RESULT: lowConfidenceRows=${preview.lowConfidenceData.length}`)
    console.log(`RESULT: unresolvedExcludedCount=${preview.unresolvedMemberships.excludedReviewCount}`)
    console.log(`PASS: valuation preview file=${WEEKLY_PIPELINE_FILES.valuationPreview}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown weekly validation error'
    console.log(`ERROR: ${message}`)
    process.exitCode = 1
  }
}

void main()
