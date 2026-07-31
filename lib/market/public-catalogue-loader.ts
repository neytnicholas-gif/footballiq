import { readFile } from 'fs/promises'
import path from 'path'
import {
  CATALOGUE_ARTIFACT_VERSION,
  catalogueFingerprint,
  type ValidatedCatalogueArtifact,
} from '@/lib/market/catalogue-pipeline'
import { PUBLIC_MARKET_CATALOGUE_STATUS, validatePublicMarketCatalogue } from '@/lib/market/catalogue'

export type CatalogueApprovalManifest = {
  version: typeof CATALOGUE_ARTIFACT_VERSION
  approved: true
  catalogueFingerprint: string
  reviewer: string
  approvedAt: string
}

export type PublicCatalogueRuntimeState =
  | {
      available: false
      seasonKey: string
      message: string
      reason: string
      records: []
    }
  | {
      available: true
      seasonKey: string
      message: string
      reason: string
      records: ValidatedCatalogueArtifact['records']
    }

export const DEFAULT_VALIDATED_CATALOGUE_PATH = path.join(
  process.cwd(),
  'tmp',
  'market-catalogue',
  'validated',
  'catalogue.validated.json',
)
export const DEFAULT_CATALOGUE_APPROVAL_PATH = path.join(
  process.cwd(),
  'tmp',
  'market-catalogue',
  'approval',
  'catalogue.approval.json',
)

function closed(reason: string): PublicCatalogueRuntimeState {
  return {
    ...PUBLIC_MARKET_CATALOGUE_STATUS,
    reason,
    records: [],
  }
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown
}

export async function loadPublicCatalogueState(options: {
  validatedPath?: string
  approvalPath?: string
} = {}): Promise<PublicCatalogueRuntimeState> {
  try {
    const validatedPath = options.validatedPath ?? DEFAULT_VALIDATED_CATALOGUE_PATH
    const approvalPath = options.approvalPath ?? DEFAULT_CATALOGUE_APPROVAL_PATH
    const validated = (await readJson(validatedPath)) as ValidatedCatalogueArtifact
    const approval = (await readJson(approvalPath)) as CatalogueApprovalManifest

    if (
      validated.version !== CATALOGUE_ARTIFACT_VERSION ||
      validated.seasonKey !== PUBLIC_MARKET_CATALOGUE_STATUS.seasonKey ||
      validated.blockingErrorCount !== 0 ||
      !Array.isArray(validated.records) ||
      validated.records.length === 0
    ) {
      return closed('Validated catalogue is missing, empty or contains blocking errors.')
    }

    const revalidation = validatePublicMarketCatalogue(validated.records)
    if (revalidation.rejected.length > 0 || revalidation.accepted.length !== validated.records.length) {
      return closed('Validated catalogue failed application-boundary revalidation.')
    }

    const fingerprint = catalogueFingerprint(validated.records)
    if (
      approval.version !== CATALOGUE_ARTIFACT_VERSION ||
      approval.approved !== true ||
      !approval.reviewer?.trim() ||
      !Number.isFinite(Date.parse(approval.approvedAt)) ||
      approval.catalogueFingerprint !== fingerprint
    ) {
      return closed('Catalogue has not received explicit matching local approval.')
    }

    return {
      available: true,
      seasonKey: validated.seasonKey,
      message: '2026/27 player catalogue approved locally',
      reason: 'Validated catalogue passed all blocking checks and has an explicit matching approval manifest.',
      records: revalidation.accepted,
    }
  } catch {
    return closed(PUBLIC_MARKET_CATALOGUE_STATUS.reason)
  }
}
