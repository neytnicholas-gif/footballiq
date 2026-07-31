import { readFile } from 'fs/promises'
import path from 'path'
import { CATALOGUE_ARTIFACT_VERSION, catalogueFingerprint, type ValidatedCatalogueArtifact } from '@/lib/market/catalogue-pipeline'
import { MANUAL_CATALOGUE_KEY, PUBLIC_MARKET_CATALOGUE_STATUS, validatePublicMarketCatalogue } from '@/lib/market/catalogue'

export type CatalogueApprovalManifest = { version: 1; approved: true; catalogueFingerprint: string; reviewer: string; approvedAt: string; declaration: { independentlySelected: true; noSystematicThirdPartyCopy: true; originalFootballIQValues: true; manuallyReviewed: true; confusingIdentitiesResolved: true } }
export type PublicCatalogueRuntimeState = { available: false; seasonKey: string; message: string; reason: string; records: [] } | { available: true; seasonKey: string; message: string; reason: string; records: ValidatedCatalogueArtifact['records'] }
export const DEFAULT_VALIDATED_CATALOGUE_PATH = path.join(process.cwd(), 'tmp', 'market-catalogue', 'validated', 'catalogue.validated.json')
export const DEFAULT_CATALOGUE_APPROVAL_PATH = path.join(process.cwd(), 'tmp', 'market-catalogue', 'approval', 'catalogue.approval.json')
function closed(reason: string): PublicCatalogueRuntimeState { return { ...PUBLIC_MARKET_CATALOGUE_STATUS, reason, records: [] } }
async function readJson(filePath: string): Promise<unknown> { return JSON.parse(await readFile(filePath, 'utf8')) as unknown }
export async function loadPublicCatalogueState(options: { validatedPath?: string; approvalPath?: string } = {}): Promise<PublicCatalogueRuntimeState> {
  try {
    const validated = await readJson(options.validatedPath ?? DEFAULT_VALIDATED_CATALOGUE_PATH) as ValidatedCatalogueArtifact
    const approval = await readJson(options.approvalPath ?? DEFAULT_CATALOGUE_APPROVAL_PATH) as CatalogueApprovalManifest
    if (validated.version !== CATALOGUE_ARTIFACT_VERSION || validated.catalogueKey !== MANUAL_CATALOGUE_KEY || validated.fixture !== false || validated.blockingErrorCount !== 0 || validated.unresolvedWarningCount !== 0 || !Array.isArray(validated.records) || validated.records.length < 1 || validated.records.length > 50) return closed('Validated manual catalogue is missing or contains blocking review items.')
    const revalidation = validatePublicMarketCatalogue({ schemaVersion: 1, catalogueKey: MANUAL_CATALOGUE_KEY, players: validated.records })
    if (revalidation.issues.length || revalidation.accepted.length !== validated.records.length) return closed('Validated catalogue failed application-boundary revalidation.')
    const fingerprint = catalogueFingerprint(validated.records)
    const declaration = approval.declaration
    if (validated.catalogueFingerprint !== fingerprint || approval.version !== 1 || approval.approved !== true || approval.catalogueFingerprint !== fingerprint || !approval.reviewer?.trim() || !Number.isFinite(Date.parse(approval.approvedAt)) || !declaration || !Object.values(declaration).every((value) => value === true)) return closed('Catalogue has no exact fingerprint-bound human approval and declaration.')
    return { available: true, seasonKey: MANUAL_CATALOGUE_KEY, message: 'Manually reviewed FootballIQ catalogue', reason: 'The local catalogue passed validation and exact fingerprint approval.', records: revalidation.accepted }
  } catch { return closed(PUBLIC_MARKET_CATALOGUE_STATUS.reason) }
}
