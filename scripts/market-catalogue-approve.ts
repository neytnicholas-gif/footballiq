import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { catalogueFingerprint, type ValidatedCatalogueArtifact } from '../lib/market/catalogue-pipeline'
import { MANUAL_CATALOGUE_KEY, validatePublicMarketCatalogue } from '../lib/market/catalogue'
import type { CatalogueApprovalManifest } from '../lib/market/public-catalogue-loader'

const ROOT = path.join(process.cwd(), 'tmp', 'market-catalogue')
const VALIDATED_PATH = path.join(ROOT, 'validated', 'catalogue.validated.json')
const APPROVAL_PATH = path.join(ROOT, 'approval', 'catalogue.approval.json')
function value(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null }
function confirmed(name: string): boolean { return value(name) === 'yes' }

async function main() {
  const reviewer = value('--reviewer')?.trim()
  const declarations = ['--independently-selected', '--no-systematic-copy', '--original-values', '--manually-reviewed', '--identities-resolved']
  if (!reviewer || declarations.some((flag) => !confirmed(flag))) throw new Error(`BLOCKED: reviewer and every declaration are required. Use --reviewer <name> and ${declarations.map((flag) => `${flag} yes`).join(' ')}.`)
  const validated = JSON.parse(await readFile(VALIDATED_PATH, 'utf8')) as ValidatedCatalogueArtifact
  if (validated.version !== 1 || validated.catalogueKey !== MANUAL_CATALOGUE_KEY || validated.fixture !== false || validated.blockingErrorCount !== 0 || validated.unresolvedWarningCount !== 0 || validated.records.length < 1 || validated.records.length > 50) throw new Error('BLOCKED: Manual catalogue is invalid or contains review items.')
  const validation = validatePublicMarketCatalogue({ schemaVersion: 1, catalogueKey: MANUAL_CATALOGUE_KEY, players: validated.records })
  if (validation.issues.length) throw new Error('BLOCKED: Catalogue failed final revalidation.')
  const fingerprint = catalogueFingerprint(validated.records)
  if (fingerprint !== validated.catalogueFingerprint) throw new Error('BLOCKED: Fingerprint mismatch.')
  const approval: CatalogueApprovalManifest = { version: 1, approved: true, catalogueFingerprint: fingerprint, reviewer, approvedAt: new Date().toISOString(), declaration: { independentlySelected: true, noSystematicThirdPartyCopy: true, originalFootballIQValues: true, manuallyReviewed: true, confusingIdentitiesResolved: true } }
  await mkdir(path.dirname(APPROVAL_PATH), { recursive: true })
  await writeFile(APPROVAL_PATH, `${JSON.stringify(approval, null, 2)}\n`, 'utf8')
  console.log(`PASS: Exact fingerprint approval written to ${APPROVAL_PATH}. No database activation occurred.`)
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : 'Unknown approval error'); process.exitCode = 1 })
