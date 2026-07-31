import { MARKET_RULES } from '@/lib/market/settings'

export const MANUAL_CATALOGUE_SCHEMA_VERSION = 1 as const
export const MANUAL_CATALOGUE_MAX_PLAYERS = 50 as const
export const MANUAL_CATALOGUE_KEY = 'footballiq-manual-v1' as const
export const FOOTBALLIQ_INTERNAL_ID_PATTERN = /^fiq_player_[a-z0-9][a-z0-9_-]{2,63}$/

export type ManualAvailabilityStatus = 'available' | 'sell_only' | 'inactive'
export type ManualValueHistoryPoint = { effectiveAt: string; valueMinor: number }
export type MarketCatalogueRecord = {
  internalId: string
  displayName: string
  currentValueMinor: number
  availabilityStatus: ManualAvailabilityStatus
  valueHistory: ManualValueHistoryPoint[]
}
export type ManualCatalogue = {
  schemaVersion: typeof MANUAL_CATALOGUE_SCHEMA_VERSION
  catalogueKey: typeof MANUAL_CATALOGUE_KEY
  fixture?: false
  players: MarketCatalogueRecord[]
}

export type CatalogueIssueCode =
  | 'INVALID_PLAYER_COUNT' | 'MALFORMED_RECORD' | 'UNKNOWN_FIELD' | 'INVALID_INTERNAL_ID'
  | 'DUPLICATE_INTERNAL_ID' | 'MISSING_NAME' | 'DUPLICATE_OR_CONFUSING_NAME'
  | 'INVALID_VALUE' | 'INVALID_AVAILABILITY' | 'INVALID_HISTORY'
  | 'DUPLICATE_HISTORY_TIMESTAMP' | 'UNORDERED_HISTORY' | 'CURRENT_VALUE_MISMATCH'
  | 'TEST_FIXTURE_FORBIDDEN'

export type CatalogueIssue = { index: number; code: CatalogueIssueCode; message: string }
export type CatalogueValidationResult = { accepted: MarketCatalogueRecord[]; issues: CatalogueIssue[] }

const recordFields = new Set(['internalId', 'displayName', 'currentValueMinor', 'availabilityStatus', 'valueHistory'])
const historyFields = new Set(['effectiveAt', 'valueMinor'])
const statuses = new Set<ManualAvailabilityStatus>(['available', 'sell_only', 'inactive'])

function normalizedName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '')
}

export function validatePublicMarketCatalogue(input: ManualCatalogue): CatalogueValidationResult {
  const issues: CatalogueIssue[] = []
  const accepted: MarketCatalogueRecord[] = []
  if (input.fixture !== undefined) issues.push({ index: -1, code: 'TEST_FIXTURE_FORBIDDEN', message: 'Fixture-marked catalogues cannot activate.' })
  if (!Array.isArray(input.players) || input.players.length < 1 || input.players.length > MANUAL_CATALOGUE_MAX_PLAYERS) {
    issues.push({ index: -1, code: 'INVALID_PLAYER_COUNT', message: 'Catalogue must contain between 1 and 50 players.' })
    return { accepted, issues }
  }
  const idCounts = new Map<string, number>()
  const nameCounts = new Map<string, number>()
  for (const raw of input.players) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const row = raw as Partial<MarketCatalogueRecord>
    if (typeof row.internalId === 'string') idCounts.set(row.internalId, (idCounts.get(row.internalId) ?? 0) + 1)
    if (typeof row.displayName === 'string') {
      const name = normalizedName(row.displayName)
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
    }
  }
  input.players.forEach((record, index) => {
    let invalid = false
    const add = (code: CatalogueIssueCode, message: string) => { invalid = true; issues.push({ index, code, message }) }
    if (!record || typeof record !== 'object' || Array.isArray(record)) { add('MALFORMED_RECORD', 'Player must be an object.'); return }
    for (const key of Object.keys(record)) if (!recordFields.has(key)) add('UNKNOWN_FIELD', `Unknown player field: ${key}`)
    if (typeof record.internalId !== 'string' || !FOOTBALLIQ_INTERNAL_ID_PATTERN.test(record.internalId)) add('INVALID_INTERNAL_ID', 'Use an immutable FootballIQ ID beginning fiq_player_.')
    else if ((idCounts.get(record.internalId) ?? 0) > 1) add('DUPLICATE_INTERNAL_ID', 'FootballIQ internal ID must be unique.')
    if (typeof record.displayName !== 'string' || !record.displayName.trim()) add('MISSING_NAME', 'A human-reviewed display name is required.')
    else if ((nameCounts.get(normalizedName(record.displayName)) ?? 0) > 1) add('DUPLICATE_OR_CONFUSING_NAME', 'Duplicate or confusingly similar names require human resolution.')
    if (!Number.isSafeInteger(record.currentValueMinor) || record.currentValueMinor < MARKET_RULES.minimumPriceMinor || record.currentValueMinor > MARKET_RULES.maximumPriceMinor) add('INVALID_VALUE', `Value must be a safe integer from ${MARKET_RULES.minimumPriceMinor} to ${MARKET_RULES.maximumPriceMinor}.`)
    if (!statuses.has(record.availabilityStatus)) add('INVALID_AVAILABILITY', 'Availability must be available, sell_only, or inactive.')
    if (!Array.isArray(record.valueHistory) || record.valueHistory.length === 0) add('INVALID_HISTORY', 'At least one value-history point is required.')
    else {
      const timestamps = new Set<string>(); let previous = -Infinity
      record.valueHistory.forEach((point) => {
        if (!point || typeof point !== 'object' || Array.isArray(point)) { add('INVALID_HISTORY', 'History points must be objects.'); return }
        for (const key of Object.keys(point)) if (!historyFields.has(key)) add('UNKNOWN_FIELD', `Unknown history field: ${key}`)
        const parsed = typeof point.effectiveAt === 'string' ? Date.parse(point.effectiveAt) : NaN
        if (!Number.isFinite(parsed) || !Number.isSafeInteger(point.valueMinor) || point.valueMinor < MARKET_RULES.minimumPriceMinor || point.valueMinor > MARKET_RULES.maximumPriceMinor) add('INVALID_HISTORY', 'History requires valid timestamps and bounded integer values.')
        if (timestamps.has(point.effectiveAt)) add('DUPLICATE_HISTORY_TIMESTAMP', 'History timestamps must be unique.')
        if (parsed <= previous) add('UNORDERED_HISTORY', 'History timestamps must be strictly chronological.')
        timestamps.add(point.effectiveAt); previous = parsed
      })
      if (record.valueHistory.at(-1)?.valueMinor !== record.currentValueMinor) add('CURRENT_VALUE_MISMATCH', 'Latest history value must equal current value.')
    }
    if (!invalid) accepted.push(record)
  })
  return { accepted, issues }
}

export const PUBLIC_MARKET_CATALOGUE_STATUS = {
  available: false,
  seasonKey: MANUAL_CATALOGUE_KEY,
  message: 'FootballIQ player catalogue awaiting manual review',
  reason: 'No approved fingerprint-bound manual catalogue is stored locally.',
} as const
