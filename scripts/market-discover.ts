import { loadEnvConfig } from '@next/env'
import { discoverMarketCompetition } from '../lib/market/import-workflow'

loadEnvConfig(process.cwd())

async function main() {
  try {
    const result = await discoverMarketCompetition({ dryRun: true })
    const accessTimestamp = new Date().toISOString()

    console.log('PASS: league discovery completed')
    console.log(`PASS: provider=api-football`) 
    console.log(`PASS: competition=${result.competition.name} (id=${result.competition.providerCompetitionId})`)
    console.log(`PASS: season=${result.season.key}`)
    console.log(`PASS: accessTimestamp=${accessTimestamp}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error'
    if (message.startsWith('BLOCKED:')) {
      console.log(message)
    } else {
      console.log(`ERROR: ${message}`)
    }
    process.exitCode = 1
  }
}

void main()
