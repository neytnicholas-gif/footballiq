import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  CATALOGUE_ARTIFACT_VERSION,
  catalogueFingerprint,
} from '../lib/market/catalogue-pipeline'
import { validatePublicMarketCatalogue } from '../lib/market/catalogue'
import type { CatalogueApprovalManifest } from '../lib/market/public-catalogue-loader'
import {
  CATALOGUE_SELECTION_POLICY_VERSION,
  REQUIRED_SELECTED_PLAYERS,
  type SelectionValidatedArtifact,
} from '../lib/market/catalogue-selection'

const OUTPUT_ROOT = path.join(process.cwd(), 'tmp', 'market-catalogue')
const VALIDATED_PATH = path.join(OUTPUT_ROOT, 'validated', 'catalogue.validated.json')
const APPROVAL_PATH = path.join(OUTPUT_ROOT, 'approval', 'catalogue.approval.json')

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

async function main() {
  const reviewer = argumentValue('--reviewer')?.trim()
  if (!reviewer) {
    throw new Error('Usage: npm run market:catalogue:approve -- --reviewer <reviewer-name>')
  }

  const validated = JSON.parse(await readFile(VALIDATED_PATH, 'utf8')) as SelectionValidatedArtifact
  if (
    validated.version !== CATALOGUE_ARTIFACT_VERSION ||
    validated.blockingErrorCount !== 0 ||
    validated.unresolvedWarningCount !== 0 ||
    validated.selectionPolicyVersion !== CATALOGUE_SELECTION_POLICY_VERSION ||
    !validated.permissionEvidenceFingerprint?.trim() ||
    !Array.isArray(validated.records) ||
    validated.records.length !== REQUIRED_SELECTED_PLAYERS
  ) {
    throw new Error('BLOCKED: Validated catalogue is empty or still contains blocking errors.')
  }

  const revalidation = validatePublicMarketCatalogue(validated.records)
  if (revalidation.rejected.length > 0 || revalidation.accepted.length !== validated.records.length) {
    throw new Error('BLOCKED: Catalogue failed final application-boundary revalidation.')
  }

  const finalFingerprint = catalogueFingerprint(validated.records)
  if (validated.catalogueFingerprint !== finalFingerprint) {
    throw new Error('BLOCKED: Stored catalogue fingerprint does not match the canonical selected records.')
  }

  const approval: CatalogueApprovalManifest = {
    version: CATALOGUE_ARTIFACT_VERSION,
    approved: true,
    catalogueFingerprint: finalFingerprint,
    permissionEvidenceFingerprint: validated.permissionEvidenceFingerprint,
    selectionPolicyVersion: validated.selectionPolicyVersion,
    reviewer,
    approvedAt: new Date().toISOString(),
  }

  await mkdir(path.dirname(APPROVAL_PATH), { recursive: true })
  await writeFile(APPROVAL_PATH, `${JSON.stringify(approval, null, 2)}\n`, 'utf8')
  console.log(`PASS: Explicit local catalogue approval written to ${APPROVAL_PATH}`)
  console.log('The UI must still be reviewed before any deployment or production activation.')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown catalogue approval error')
  process.exitCode = 1
})
