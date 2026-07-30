import type {
  AvailabilityFilter,
  MarketPlayerView,
  MarketSort,
  OwnershipFilter,
  PositionGroup,
} from './types'

export type MarketFilters = {
  search: string
  club: string
  position: PositionGroup | 'ALL'
  sort: MarketSort
  availability: AvailabilityFilter
  ownership: OwnershipFilter
  ownedPlayerIds?: Set<string>
}

export function filterAndSortPlayers(
  rows: MarketPlayerView[],
  filters: MarketFilters,
): MarketPlayerView[] {
  const normalizedSearch = filters.search.trim().toLowerCase()

  const filtered = rows.filter((row) => {
    const bySearch =
      !normalizedSearch ||
      row.player.displayName.toLowerCase().includes(normalizedSearch) ||
      row.player.fullName.toLowerCase().includes(normalizedSearch)
    const byClub = filters.club === 'ALL' || row.club.slug === filters.club
    const byPosition = filters.position === 'ALL' || row.player.positionGroup === filters.position
    const byAvailability = filters.availability === 'ALL' || row.player.isAvailable
    const byOwnership =
      filters.ownership === 'ALL' ||
      (filters.ownedPlayerIds ? filters.ownedPlayerIds.has(row.player.id) : false)
    return bySearch && byClub && byPosition && byAvailability && byOwnership
  })

  return filtered.sort((left, right) => {
    switch (filters.sort) {
      case 'price-asc':
        return left.player.currentPriceMinor - right.player.currentPriceMinor
      case 'price-desc':
        return right.player.currentPriceMinor - left.player.currentPriceMinor
      case 'movement-desc':
        return right.latestMovementMinor - left.latestMovementMinor
      case 'movement-asc':
        return left.latestMovementMinor - right.latestMovementMinor
      case 'club-asc': {
        const clubSort = left.club.name.localeCompare(right.club.name)
        if (clubSort !== 0) return clubSort
        return left.player.displayName.localeCompare(right.player.displayName)
      }
      case 'alphabetical':
      default:
        return left.player.displayName.localeCompare(right.player.displayName)
    }
  })
}
