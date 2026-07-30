import { loadEnvConfig } from '@next/env'
import { runMarketSeasonImport, summarizeImportReport } from '../lib/market/import-workflow'

loadEnvConfig(process.cwd())

async function main() {
  try {
    const report = await runMarketSeasonImport({ dryRun: true, writeEnabled: false })

    for (const line of summarizeImportReport(report)) {
      console.log(line)
    }

    if (
      report.issues.some((entry) =>
        ['DISCOVERY_ERROR', 'INVALID_CLUB_COUNT', 'IMPORT_ABORTED'].includes(entry.code)
      )
    ) {
      process.exitCode = 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error'
    if (message.startsWith('BLOCKED:')) {
      console.log(message)
    } else {
      console.log(`ERROR: ${message}`)
    }
    process.exitCode = 1
  }
}

void main()
