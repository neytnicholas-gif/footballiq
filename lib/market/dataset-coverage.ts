import type { MarketPosition } from '@/lib/market/types'
import type { SquadStatus } from '@/lib/market/performance-ingestion'

export type CoveragePlayer = {
  providerPlayerId: string
  providerClubId: string
  position: MarketPosition
  squadStatus: SquadStatus
}

export function auditMarketCoverage(players: CoveragePlayer[]) {
  const usable = players.filter((player) => player.squadStatus === 'first_team' || player.squadStatus === 'rotation' || player.squadStatus === 'injured')
  const clubs = new Map<string, number>()
  const positions: Record<MarketPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  const providerIds = new Set<string>()
  let duplicateProviderIds = 0
  for (const player of usable) {
    clubs.set(player.providerClubId, (clubs.get(player.providerClubId) ?? 0) + 1)
    positions[player.position] += 1
    if (providerIds.has(player.providerPlayerId)) duplicateProviderIds += 1
    providerIds.add(player.providerPlayerId)
  }
  const underCoveredClubs = [...clubs.entries()].filter(([, count]) => count < 11).map(([clubId, count]) => ({ clubId, count }))
  // Cover every freely selectable shape: 4-3-3 needs three forwards, while
  // 4-4-2 needs four midfielders. A catalogue must comfortably support both.
  const formationReady = positions.GK >= 1 && positions.DEF >= 4 && positions.MID >= 4 && positions.FWD >= 3
  return {
    totalRows: players.length,
    usablePlayers: usable.length,
    clubCount: clubs.size,
    positions,
    duplicateProviderIds,
    underCoveredClubs,
    formationReady,
    launchTargetMet: usable.length >= 280 && usable.length <= 320 && clubs.size === 20 && underCoveredClubs.length === 0 && formationReady && duplicateProviderIds === 0,
  }
}
