import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  buildCatalogueArtifacts,
  serializeCatalogueArtifact,
} from '../lib/market/catalogue-pipeline'

const OUTPUT_ROOT = path.join(process.cwd(), 'tmp', 'market-catalogue')
const VALIDATED_PATH = path.join(OUTPUT_ROOT, 'validated', 'catalogue.validated.json')
const REPORT_PATH = path.join(OUTPUT_ROOT, 'reports', 'catalogue.manual.review.json')

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

async function main() {
  const inputPath = argumentValue('--input')
  if (!inputPath) {
    throw new Error('Usage: npm run market:catalogue:validate -- --input <manual-json-path>')
  }

  let input: unknown
  try {
    input = JSON.parse(await readFile(path.resolve(inputPath), 'utf8')) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON read error'
    throw new Error(`Catalogue input could not be read as JSON: ${message}`)
  }

  const result = buildCatalogueArtifacts(input)
  await mkdir(path.dirname(VALIDATED_PATH), { recursive: true })
  await mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await writeFile(VALIDATED_PATH, serializeCatalogueArtifact(result.validated), 'utf8')
  await writeFile(REPORT_PATH, serializeCatalogueArtifact(result.report), 'utf8')

  console.log(`Catalogue input fingerprint: ${result.report.sourceFingerprint}`)
  console.log(`Accepted: ${result.report.summary.accepted}`)
  console.log(`Rejected or blocked: ${result.report.summary.rejected}`)
  console.log(`Blocking errors: ${result.report.summary.blockingErrors}`)
  console.log(`Validated output: ${VALIDATED_PATH}`)
  console.log(`Review report: ${REPORT_PATH}`)

  if (result.report.summary.blockingErrors > 0 || result.report.summary.accepted === 0) {
    console.error('BLOCKED: Catalogue remains closed. Resolve every rejection and rerun the import.')
    process.exitCode = 1
    return
  }

  console.log('PASS: Manual records are valid but cannot activate without a separate declaration and exact fingerprint approval.')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown catalogue import error')
  process.exitCode = 1
})
