import { getFootballIQClubColours } from '@/lib/market/club-colours'
import { computeInitialFootballIQValueMinor } from '@/lib/market/initial-valuation'
import type { MarketCatalogueRecord } from '@/lib/market/catalogue'
import type { MarketClub, MarketPlayerProfileView, MarketPlayerView } from '@/lib/market/types'

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stableId(prefix: string, value: string): string {
  return `${prefix}:${encodeURIComponent(value)}`
}

export function buildApprovedCatalogueViews(records: MarketCatalogueRecord[]): MarketPlayerView[] {
  const clubs = new Map<string, MarketClub>()

  return records.map((record) => {
    let club = clubs.get(record.clubName)
    if (!club) {
      const colours = getFootballIQClubColours(record.clubName)
      const slug = slugify(record.clubName)
      club = {
        id: stableId('club', record.clubName),
        seasonId: record.seasonKey,
        providerClubId: stableId('catalogue-club', record.clubName),
        name: record.clubName,
        shortName: record.clubName,
        slug,
        primaryColour: colours.primary,
        secondaryColour: colours.secondary,
        isActive: true,
        dataUpdatedAt: record.verifiedAt,
      }
      clubs.set(record.clubName, club)
    }

    const initialPriceMinor = computeInitialFootballIQValueMinor({
      providerPlayerId: record.providerPlayerId,
      positionGroup: record.position,
      hasNationality: false,
      hasDetailedPosition: false,
      squadDataConfidence: 'high',
    })
    const playerSlug = `${slugify(record.fullName)}-${slugify(record.providerPlayerId)}`
    return {
      club,
      latestMovementMinor: 0,
      player: {
        id: stableId('player', record.providerPlayerId),
        seasonId: record.seasonKey,
        clubId: club.id,
        providerPlayerId: record.providerPlayerId,
        fullName: record.fullName,
        displayName: record.fullName,
        slug: playerSlug,
        positionGroup: record.position,
        detailedPosition: record.position,
        nationality: null,
        shirtNumber: null,
        currentPriceMinor: initialPriceMinor,
        initialPriceMinor,
        performanceBankMilli: 0,
        latestRatingMilli: null,
        isAvailable: record.isActive,
        availabilityStatus: record.isActive ? 'available' : 'transferred',
        dataUpdatedAt: record.verifiedAt,
        isDemoSeed: false,
      },
    }
  })
}

export function buildApprovedPlayerProfile(
  records: MarketCatalogueRecord[],
  slug: string,
): MarketPlayerProfileView | null {
  const row = buildApprovedCatalogueViews(records).find((candidate) => candidate.player.slug === slug)
  if (!row) return null
  return {
    ...row,
    weeklyChangeMinor: 0,
    ownershipCount: 0,
    ownershipPercentage: 0,
    lastUpdatedAt: row.player.dataUpdatedAt,
    seasonStats: {
      hasCompetitiveStats: false,
      matchesPlayed: 0,
      starts: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      averageRatingMilli: null,
    },
    recentMatches: [],
    valuationHistory: [],
    priceHistory: [{ date: row.player.dataUpdatedAt, valueMinor: row.player.currentPriceMinor, reason: 'Initial FootballIQ value' }],
    transactionHistory: [],
  }
}
