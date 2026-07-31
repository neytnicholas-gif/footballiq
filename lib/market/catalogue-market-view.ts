import type { MarketCatalogueRecord } from '@/lib/market/catalogue'
import type { MarketClub, MarketPlayerProfileView, MarketPlayerView } from '@/lib/market/types'

function slugify(value: string): string { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
const internalClub: MarketClub = { id: 'footballiq:manual', seasonId: 'footballiq-manual-v1', providerClubId: '', name: '', shortName: '', slug: 'manual', primaryColour: '#00dc82', secondaryColour: '#0b1714', isActive: true, dataUpdatedAt: new Date(0).toISOString() }

export function buildApprovedCatalogueViews(records: MarketCatalogueRecord[]): MarketPlayerView[] {
  return records.map((record) => {
    const latest = record.valueHistory.at(-1)!
    const previous = record.valueHistory.at(-2)?.valueMinor ?? latest.valueMinor
    return { club: internalClub, latestMovementMinor: latest.valueMinor - previous, player: { id: record.internalId, seasonId: 'footballiq-manual-v1', clubId: '', providerPlayerId: '', fullName: record.displayName, displayName: record.displayName, slug: `${slugify(record.displayName)}-${record.internalId}`, positionGroup: 'MID', detailedPosition: '', nationality: null, shirtNumber: null, currentPriceMinor: record.currentValueMinor, initialPriceMinor: record.valueHistory[0].valueMinor, performanceBankMilli: 0, latestRatingMilli: null, isAvailable: record.availabilityStatus === 'available', availabilityStatus: record.availabilityStatus, dataUpdatedAt: latest.effectiveAt, isDemoSeed: false } }
  })
}

export function buildApprovedPlayerProfile(records: MarketCatalogueRecord[], slug: string): MarketPlayerProfileView | null {
  const view = buildApprovedCatalogueViews(records).find((row) => row.player.slug === slug)
  const record = records.find((row) => row.internalId === view?.player.id)
  if (!view || !record) return null
  return { ...view, weeklyChangeMinor: view.latestMovementMinor, ownershipCount: 0, ownershipPercentage: 0, lastUpdatedAt: view.player.dataUpdatedAt, seasonStats: { hasCompetitiveStats: false, matchesPlayed: 0, starts: 0, minutesPlayed: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRatingMilli: null }, recentMatches: [], valuationHistory: [], priceHistory: record.valueHistory.map((point) => ({ date: point.effectiveAt, valueMinor: point.valueMinor, reason: 'FootballIQ value' })), transactionHistory: [] }
}
