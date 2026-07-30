import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { buildDevelopmentDatasetFromImportArtifacts } from '../lib/market/development-dataset'

const TMP_DIR = path.join(process.cwd(), 'tmp')
const DATASET_PATH = path.join(TMP_DIR, 'market-playable-dataset.json')
const REVIEW_PATH = path.join(TMP_DIR, 'market-excluded-review.json')

async function main() {
  try {
    const { dataset, excluded } = await buildDevelopmentDatasetFromImportArtifacts()

    await mkdir(TMP_DIR, { recursive: true })
    await writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2), 'utf8')
    await writeFile(
      REVIEW_PATH,
      JSON.stringify(
        {
          generatedAt: dataset.generatedAt,
          seasonKey: dataset.sourceSeasonKey,
          excludedCount: excluded.length,
          excluded,
        },
        null,
        2,
      ),
      'utf8',
    )

    console.log(`PASS: development playable dataset written to ${DATASET_PATH}`)
    console.log(`PASS: excluded-review report written to ${REVIEW_PATH}`)
    console.log(`PASS: clubs=${dataset.clubs.length}`)
    console.log(`PASS: playablePlayers=${dataset.players.length}`)
    console.log(`PASS: excludedForReview=${excluded.length}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dataset build error'
    console.log(`ERROR: ${message}`)
    process.exitCode = 1
  }
}

void main()
