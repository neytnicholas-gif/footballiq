import type { MarketPlayer, MarketSeasonStats, ProvenanceStatus } from '@/lib/market/types'

export type ProviderAuditMeta = {
  provider: string
  sourceReference: string | null
  retrievedAt: string
  provenanceStatus: ProvenanceStatus
  ownerVerified: boolean
}

export type NormalizedPlayer = {
  slug: string
  displayName: string
  shortName: string | null
  clubName: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  nationality: string | null
  active: boolean
  openingValue: number
  previousValue: number
  currentValue: number
  audit: ProviderAuditMeta
}

export type NormalizedSeasonStats = {
  playerSlug: string
  season: string
  competitionLabel: string
  stats: Partial<Pick<MarketSeasonStats,
    | 'appearances'
    | 'starts'
    | 'minutes'
    | 'goals'
    | 'assists'
    | 'clean_sheets'
    | 'yellow_cards'
    | 'red_cards'
    | 'shots'
    | 'shots_on_target'
    | 'chances_created'
    | 'key_passes'
    | 'passes_completed'
    | 'pass_accuracy'
    | 'tackles'
    | 'interceptions'
    | 'clearances'
    | 'blocks'
    | 'saves'
    | 'goals_conceded'
    | 'expected_goals'
    | 'expected_assists'
    | 'average_rating'
  >>
  audit: ProviderAuditMeta
}

export type PlayerDataProvider = {
  name: string
  fetchPlayers: () => Promise<NormalizedPlayer[]>
  fetchSeasonStats: () => Promise<NormalizedSeasonStats[]>
  fetchFixtures: () => Promise<unknown[]>
  normalisePlayer: (row: unknown) => NormalizedPlayer | null
  normaliseStats: (row: unknown) => NormalizedSeasonStats | null
  validateProvenance: (meta: ProviderAuditMeta) => { ok: boolean; reason?: string }
}

export function assertMarketPriceRange(value: number) {
  return value >= 4_000_000 && value <= 15_000_000 && value % 100_000 === 0
}

export function createProviderAudit(
  provider: string,
  provenanceStatus: ProvenanceStatus,
  ownerVerified: boolean,
  sourceReference: string | null = null,
): ProviderAuditMeta {
  return {
    provider,
    sourceReference,
    retrievedAt: new Date().toISOString(),
    provenanceStatus,
    ownerVerified,
  }
}

export function validateProviderAudit(meta: ProviderAuditMeta) {
  if (!meta.provider.trim()) return { ok: false, reason: 'Missing provider name' }
  if (!meta.retrievedAt) return { ok: false, reason: 'Missing retrieval timestamp' }
  if (!meta.provenanceStatus) return { ok: false, reason: 'Missing provenance status' }
  return { ok: true }
}

export function toMarketSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function mapMarketPlayerRow(player: MarketPlayer): NormalizedPlayer {
  return {
    slug: player.slug,
    displayName: player.display_name,
    shortName: player.short_name,
    clubName: player.club_name,
    position: player.position,
    nationality: player.nationality,
    active: player.active,
    openingValue: player.opening_season_value,
    previousValue: player.previous_value,
    currentValue: player.current_value,
    audit: {
      provider: player.data_source_label,
      sourceReference: player.source_reference,
      retrievedAt: player.data_updated_at,
      provenanceStatus: (player.provenance_status as ProvenanceStatus) ?? 'unverified',
      ownerVerified: player.owner_verified,
    },
  }
}
