import { createHash } from 'crypto'
import { MANUAL_CATALOGUE_KEY, MANUAL_CATALOGUE_SCHEMA_VERSION, type CatalogueIssue, type ManualCatalogue, type MarketCatalogueRecord, validatePublicMarketCatalogue } from '@/lib/market/catalogue'

export const CATALOGUE_ARTIFACT_VERSION = 1 as const
export type ValidatedCatalogueArtifact = {
  version: 1; catalogueKey: typeof MANUAL_CATALOGUE_KEY; sourceFingerprint: string
  catalogueFingerprint: string; blockingErrorCount: number; unresolvedWarningCount: number
  fixture: false; records: MarketCatalogueRecord[]
}
export type CatalogueReviewReport = {
  version: 1; catalogueKey: typeof MANUAL_CATALOGUE_KEY; sourceFingerprint: string
  catalogueFingerprint: string; approvalAllowed: boolean
  summary: { received: number; accepted: number; rejected: number; blockingErrors: number; unresolvedWarnings: number }
  accepted: MarketCatalogueRecord[]; issues: CatalogueIssue[]
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
export function catalogueFingerprint(value: unknown): string { return createHash('sha256').update(canonicalJson(value)).digest('hex') }

export function buildCatalogueArtifacts(input: unknown): { validated: ValidatedCatalogueArtifact; report: CatalogueReviewReport } {
  const sourceFingerprint = catalogueFingerprint(input)
  const top = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null
  const topFields = top ? Object.keys(top).filter((key) => !['schemaVersion', 'catalogueKey', 'players'].includes(key)) : []
  const baseIssues: CatalogueIssue[] = []
  if (!top || top.schemaVersion !== MANUAL_CATALOGUE_SCHEMA_VERSION || top.catalogueKey !== MANUAL_CATALOGUE_KEY || !Array.isArray(top.players)) baseIssues.push({ index: -1, code: 'MALFORMED_RECORD', message: 'Input must match the manual catalogue V1 envelope.' })
  topFields.forEach((key) => baseIssues.push({ index: -1, code: key === 'fixture' ? 'TEST_FIXTURE_FORBIDDEN' : 'UNKNOWN_FIELD', message: `Unknown or forbidden catalogue field: ${key}` }))
  const candidate: ManualCatalogue = { schemaVersion: 1, catalogueKey: MANUAL_CATALOGUE_KEY, players: top && Array.isArray(top.players) ? top.players as MarketCatalogueRecord[] : [] }
  const result = validatePublicMarketCatalogue(candidate)
  const issues = [...baseIssues, ...result.issues]
  const records = issues.length === 0 ? [...result.accepted].sort((a, b) => a.internalId.localeCompare(b.internalId)) : []
  const fingerprint = catalogueFingerprint(records)
  const validated: ValidatedCatalogueArtifact = { version: 1, catalogueKey: MANUAL_CATALOGUE_KEY, sourceFingerprint, catalogueFingerprint: fingerprint, blockingErrorCount: issues.length, unresolvedWarningCount: 0, fixture: false, records }
  const report: CatalogueReviewReport = { version: 1, catalogueKey: MANUAL_CATALOGUE_KEY, sourceFingerprint, catalogueFingerprint: fingerprint, approvalAllowed: issues.length === 0, summary: { received: candidate.players.length, accepted: records.length, rejected: issues.length ? candidate.players.length : 0, blockingErrors: issues.length, unresolvedWarnings: 0 }, accepted: records, issues }
  return { validated, report }
}
export function serializeCatalogueArtifact(value: ValidatedCatalogueArtifact | CatalogueReviewReport): string { return `${JSON.stringify(value, null, 2)}\n` }
