import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { loadEnvConfig } from '@next/env'
import { runMarketSeasonImport, summarizeImportReport } from '../lib/market/import-workflow'

const OUTPUT_DIR = path.join(process.cwd(), 'tmp')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'market-import-preview.json')

loadEnvConfig(process.cwd())

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s'
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

async function main() {
  try {
    const report = await runMarketSeasonImport({
      dryRun: true,
      writeEnabled: false,
      resume: true,
      progressLogger: (line) => console.log(line),
    })

    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf8')

    for (const line of summarizeImportReport(report)) {
      console.log(line)
    }

    if (report.runtime) {
      const remainingBlocker = report.issues.length > 0
        ? report.issues.map((entry) => `${entry.code}: ${entry.message}`).join(' | ')
        : (report.runtime.zeroPlayerClubs.length > 0
          ? `Provider returned zero players for: ${report.runtime.zeroPlayerClubs.join(', ')}`
          : 'none')

      console.log(`RESULT: clubs imported=${report.imported.clubs}`)
      console.log(`RESULT: total players imported=${report.imported.squads}`)
      console.log(`RESULT: total requests used=${report.runtime.requestsUsed}`)
      console.log(`RESULT: elapsed time=${formatDuration(report.runtime.elapsedMs)}`)
      console.log(
        `RESULT: clubs with zero players=${report.runtime.zeroPlayerClubs.length > 0 ? report.runtime.zeroPlayerClubs.join(', ') : 'none'}`
      )
      console.log(`RESULT: remaining blocker=${remainingBlocker}`)
    }

    console.log(`PASS: report written to ${OUTPUT_FILE}`)

    const hasBlockingIssue = report.issues.some((entry) =>
      ['DISCOVERY_ERROR', 'INVALID_CLUB_COUNT', 'IMPORT_ABORTED'].includes(entry.code)
    )
    if (hasBlockingIssue) {
      process.exitCode = 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error'
    if (message.startsWith('BLOCKED:')) {
      console.log(message)
    } else {
      console.log(`ERROR: ${message}`)
    }
    process.exitCode = 1
  }
}

void main()
