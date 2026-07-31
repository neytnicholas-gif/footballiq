import type { PositionGroup } from '@/lib/market/types'

export const PUBLIC_MARKET_SEASON_KEY = '2026/27' as const

export const PREMIER_LEAGUE_2026_27_CLUBS = [
  'Arsenal',
  'Aston Villa',
  'Bournemouth',
  'Brentford',
  'Brighton & Hove Albion',
  'Chelsea',
  'Coventry City',
  'Crystal Palace',
  'Everton',
  'Fulham',
  'Hull City',
  'Ipswich Town',
  'Leeds United',
  'Liverpool',
  'Manchester City',
  'Manchester United',
  'Newcastle United',
  'Nottingham Forest',
  'Sunderland',
  'Tottenham Hotspur',
] as const

const eligibleClubs = new Set<string>(PREMIER_LEAGUE_2026_27_CLUBS)

export type MarketCatalogueSourceType = 'approved-provider' | 'licensed-local'

export type MarketCatalogueRecord = {
  seasonKey: string
  providerPlayerId: string
  fullName: string
  clubName: string
  position: PositionGroup
  sourceType: MarketCatalogueSourceType
  sourceReference: string
  verifiedAt: string
  isActive: boolean
}

export type CatalogueRejectionCode =
  | 'STALE_SEASON'
  | 'MISSING_STABLE_ID'
  | 'MISSING_NAME'
  | 'INELIGIBLE_CLUB'
  | 'UNSUPPORTED_SOURCE'
  | 'UNVERIFIED_SOURCE'
  | 'INVALID_VERIFIED_AT'
  | 'INACTIVE'
  | 'DUPLICATE_IDENTITY'

export type CatalogueValidationResult = {
  accepted: MarketCatalogueRecord[]
  rejected: Array<{ record: MarketCatalogueRecord; code: CatalogueRejectionCode }>
}

function isVerifiedTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value))
}

export function validatePublicMarketCatalogue(records: MarketCatalogueRecord[]): CatalogueValidationResult {
  const accepted: MarketCatalogueRecord[] = []
  const rejected: CatalogueValidationResult['rejected'] = []
  const providerIdCounts = new Map<string, number>()

  for (const record of records) {
    const providerId = record.providerPlayerId.trim()
    if (providerId) providerIdCounts.set(providerId, (providerIdCounts.get(providerId) ?? 0) + 1)
  }

  for (const record of records) {
    let code: CatalogueRejectionCode | null = null

    if (record.seasonKey !== PUBLIC_MARKET_SEASON_KEY) code = 'STALE_SEASON'
    else if (!record.providerPlayerId.trim()) code = 'MISSING_STABLE_ID'
    else if (!record.fullName.trim()) code = 'MISSING_NAME'
    else if (!eligibleClubs.has(record.clubName)) code = 'INELIGIBLE_CLUB'
    else if (record.sourceType !== 'approved-provider' && record.sourceType !== 'licensed-local') code = 'UNSUPPORTED_SOURCE'
    else if (!record.sourceReference.trim()) code = 'UNVERIFIED_SOURCE'
    else if (!isVerifiedTimestamp(record.verifiedAt)) code = 'INVALID_VERIFIED_AT'
    else if (!record.isActive) code = 'INACTIVE'
    else if ((providerIdCounts.get(record.providerPlayerId.trim()) ?? 0) > 1) code = 'DUPLICATE_IDENTITY'

    if (code) {
      rejected.push({ record, code })
      continue
    }

    accepted.push(record)
  }

  return { accepted, rejected }
}

export const PUBLIC_MARKET_CATALOGUE_STATUS = {
  available: false,
  seasonKey: PUBLIC_MARKET_SEASON_KEY,
  message: '2026/27 player catalogue being verified',
  reason: 'No licensed, current and fully provenance-backed player catalogue is stored locally.',
} as const
