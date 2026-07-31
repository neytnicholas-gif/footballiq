import { createHash } from 'crypto'
import {
  PUBLIC_MARKET_SEASON_KEY,
  type CatalogueRejectionCode,
  type MarketCatalogueRecord,
  validatePublicMarketCatalogue,
} from '@/lib/market/catalogue'
import type { PositionGroup } from '@/lib/market/types'

export const CATALOGUE_ARTIFACT_VERSION = 1 as const

export type CatalogueInput = {
  records: unknown[]
}

export type CatalogueRejectedRecord = {
  index: number
  providerPlayerId: string | null
  fullName: string | null
  code: CatalogueRejectionCode | 'MALFORMED_INPUT' | 'MALFORMED_RECORD' | 'INVALID_POSITION'
  reason: string
}

export type ValidatedCatalogueArtifact = {
  version: typeof CATALOGUE_ARTIFACT_VERSION
  seasonKey: typeof PUBLIC_MARKET_SEASON_KEY
  sourceFingerprint: string
  blockingErrorCount: number
  records: MarketCatalogueRecord[]
}

export type CatalogueReviewReport = {
  version: typeof CATALOGUE_ARTIFACT_VERSION
  seasonKey: typeof PUBLIC_MARKET_SEASON_KEY
  sourceFingerprint: string
  summary: {
    received: number
    accepted: number
    rejected: number
    blockingErrors: number
  }
  accepted: Array<{
    providerPlayerId: string
    fullName: string
    clubName: string
    position: PositionGroup
    verifiedAt: string
    sourceType: MarketCatalogueRecord['sourceType']
    sourceReference: string
  }>
  rejected: CatalogueRejectedRecord[]
}

export type CataloguePipelineResult = {
  validated: ValidatedCatalogueArtifact
  report: CatalogueReviewReport
}

const positionGroups = new Set<PositionGroup>(['GK', 'DEF', 'MID', 'FWD'])

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function catalogueFingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex')
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

function rejectionReason(code: CatalogueRejectedRecord['code']): string {
  const reasons: Record<CatalogueRejectedRecord['code'], string> = {
    MALFORMED_INPUT: 'Input must be a JSON object containing a records array.',
    MALFORMED_RECORD: 'Record must be an object with all required catalogue fields.',
    INVALID_POSITION: 'Position must be one of GK, DEF, MID or FWD.',
    STALE_SEASON: 'Record does not target the 2026/27 season.',
    MISSING_STABLE_ID: 'Stable provider player ID is required.',
    MISSING_NAME: 'Real player name is required.',
    INELIGIBLE_CLUB: 'Club is outside the approved 2026/27 Premier League boundary.',
    UNSUPPORTED_SOURCE: 'Generated, fictional or unapproved source types are forbidden.',
    UNVERIFIED_SOURCE: 'A provider/source reference is required.',
    INVALID_VERIFIED_AT: 'Verification timestamp is missing or invalid.',
    INACTIVE: 'Inactive records cannot enter the public catalogue.',
    DUPLICATE_IDENTITY: 'Provider player ID appears more than once.',
    AMBIGUOUS_IDENTITY: 'The same normalized player name maps to multiple provider IDs and requires review.',
  }
  return reasons[code]
}

function parseRecord(value: unknown, index: number): {
  record?: MarketCatalogueRecord
  rejection?: CatalogueRejectedRecord
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      rejection: {
        index,
        providerPlayerId: null,
        fullName: null,
        code: 'MALFORMED_RECORD',
        reason: rejectionReason('MALFORMED_RECORD'),
      },
    }
  }

  const row = value as Record<string, unknown>
  const providerPlayerId = stringField(row.providerPlayerId)
  const fullName = stringField(row.fullName)
  const position = stringField(row.position)

  if (!position || !positionGroups.has(position as PositionGroup)) {
    return {
      rejection: {
        index,
        providerPlayerId,
        fullName,
        code: 'INVALID_POSITION',
        reason: rejectionReason('INVALID_POSITION'),
      },
    }
  }

  return {
    record: {
      seasonKey: stringField(row.seasonKey) ?? '',
      providerPlayerId: providerPlayerId ?? '',
      fullName: fullName ?? '',
      clubName: stringField(row.clubName) ?? '',
      position: position as PositionGroup,
      sourceType: (stringField(row.sourceType) ?? '') as MarketCatalogueRecord['sourceType'],
      sourceReference: stringField(row.sourceReference) ?? '',
      verifiedAt: stringField(row.verifiedAt) ?? '',
      isActive: typeof row.isActive === 'boolean' ? row.isActive : false,
    },
  }
}

export function buildCatalogueArtifacts(input: unknown): CataloguePipelineResult {
  const sourceFingerprint = catalogueFingerprint(input)
  const malformedInput = !input || typeof input !== 'object' || Array.isArray(input)
  const recordsValue = malformedInput ? null : (input as Record<string, unknown>).records
  const records = Array.isArray(recordsValue) ? recordsValue : null

  if (!records) {
    const rejected: CatalogueRejectedRecord[] = [{
      index: -1,
      providerPlayerId: null,
      fullName: null,
      code: 'MALFORMED_INPUT',
      reason: rejectionReason('MALFORMED_INPUT'),
    }]
    return makeResult(sourceFingerprint, 0, [], rejected)
  }

  const parsed: Array<{ index: number; record: MarketCatalogueRecord }> = []
  const rejected: CatalogueRejectedRecord[] = []

  records.forEach((value, index) => {
    const result = parseRecord(value, index)
    if (result.record) parsed.push({ index, record: result.record })
    if (result.rejection) rejected.push(result.rejection)
  })

  const validation = validatePublicMarketCatalogue(parsed.map((item) => item.record))
  const acceptedSet = new Set(validation.accepted)

  for (const item of parsed) {
    if (acceptedSet.has(item.record)) continue
    const validationRejection = validation.rejected.find((entry) => entry.record === item.record)
    if (!validationRejection) continue
    rejected.push({
      index: item.index,
      providerPlayerId: item.record.providerPlayerId || null,
      fullName: item.record.fullName || null,
      code: validationRejection.code,
      reason: rejectionReason(validationRejection.code),
    })
  }

  const accepted = [...validation.accepted].sort((left, right) =>
    left.providerPlayerId.localeCompare(right.providerPlayerId),
  )
  rejected.sort((left, right) => left.index - right.index || left.code.localeCompare(right.code))

  return makeResult(sourceFingerprint, records.length, accepted, rejected)
}

function makeResult(
  sourceFingerprint: string,
  received: number,
  accepted: MarketCatalogueRecord[],
  rejected: CatalogueRejectedRecord[],
): CataloguePipelineResult {
  const blockingErrorCount = rejected.length
  const validated: ValidatedCatalogueArtifact = {
    version: CATALOGUE_ARTIFACT_VERSION,
    seasonKey: PUBLIC_MARKET_SEASON_KEY,
    sourceFingerprint,
    blockingErrorCount,
    records: accepted,
  }
  const report: CatalogueReviewReport = {
    version: CATALOGUE_ARTIFACT_VERSION,
    seasonKey: PUBLIC_MARKET_SEASON_KEY,
    sourceFingerprint,
    summary: {
      received,
      accepted: accepted.length,
      rejected: rejected.length,
      blockingErrors: blockingErrorCount,
    },
    accepted: accepted.map((record) => ({
      providerPlayerId: record.providerPlayerId,
      fullName: record.fullName,
      clubName: record.clubName,
      position: record.position,
      verifiedAt: record.verifiedAt,
      sourceType: record.sourceType,
      sourceReference: record.sourceReference,
    })),
    rejected,
  }
  return { validated, report }
}

export function serializeCatalogueArtifact(value: ValidatedCatalogueArtifact | CatalogueReviewReport): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
